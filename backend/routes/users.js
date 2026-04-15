const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const User = require('../models/User');
const { pool } = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const rand = crypto.randomBytes(16).toString('hex');
    cb(null, `avatar_${rand}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files allowed'));
    cb(null, true);
  },
});

const router = express.Router();

// Get all users (admin only)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update own profile (name, email, phone)
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });

    const existing = await User.findByEmailExcluding(email.trim(), req.user.id);
    if (existing) return res.status(400).json({ error: 'Email already in use by another account' });

    await User.update(req.user.id, { name: name.trim(), email: email.trim(), phone: phone?.trim() || null });
    const updated = await User.findById(req.user.id);
    res.json({ user: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile avatar
router.post('/profile/avatar', auth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    await User.updateAvatar(req.user.id, avatarPath);
    res.json({ avatar_path: avatarPath });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Change own password
router.put('/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password) return res.status(400).json({ error: 'Current password is required' });
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });

    const userWithHash = await User.findByEmail(req.user.email);
    const valid = await User.validatePassword(current_password, userWithHash.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    await User.updatePassword(req.user.id, new_password);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Admin: create a new user (immediately active, not pending)
router.post('/create', adminAuth, async (req, res) => {
  try {
    const { name, email, password, role = 'user', phone } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!['user', 'admin'].includes(role))
      return res.status(400).json({ error: 'Invalid role' });

    const existing = await User.findByEmail(email.trim());
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    // Admin-created users are immediately active
    const user = await User.create({ name: name.trim(), email: email.trim(), password, role, phone: phone || null, status: 'active' });
    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin: update an existing user (name, email, role, phone, optional password)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });

    const { name, email, role, phone, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (password && password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findByEmailExcluding(email.trim(), userId);
    if (existing) return res.status(400).json({ error: 'Email already in use by another account' });

    await User.adminUpdate(userId, {
      name: name.trim(),
      email: email.trim(),
      role,
      phone: phone || null,
      password: password || null,
    });
    const updated = await User.findById(userId);
    res.json({ user: updated });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Admin: delete a user
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    // Prevent deleting self
    if (userId === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });

    // Block deletion if user has active loans
    const { rows: loanRows } = await pool.query(
      `SELECT id FROM loan_applications WHERE user_id = $1 AND status NOT IN ('closed', 'rejected', 'foreclosed') LIMIT 1`,
      [userId]
    );
    if (loanRows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete user with active loan applications' });
    }

    // Block deletion if user is linked to a chitty slot
    const { rows: chittyRows } = await pool.query(
      `SELECT id FROM user_chitty WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (chittyRows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete user linked to a chitty member slot' });
    }

    await User.delete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Admin: lock a user account
router.put('/:id/lock', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (userId === req.user.id) return res.status(400).json({ error: 'You cannot lock your own account' });
    await User.setLocked(userId, true);
    res.json({ message: 'User account locked' });
  } catch (error) {
    console.error('Lock user error:', error);
    res.status(500).json({ error: 'Failed to lock user' });
  }
});

// Admin: unlock a user account
router.put('/:id/unlock', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    await User.setLocked(userId, false);
    res.json({ message: 'User account unlocked' });
  } catch (error) {
    console.error('Unlock user error:', error);
    res.status(500).json({ error: 'Failed to unlock user' });
  }
});

// Admin: approve a pending user registration
router.put('/:id/approve', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    await User.setStatus(userId, 'active');
    const updated = await User.findById(userId);
    res.json({ user: updated });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Admin: reject a pending user registration
router.put('/:id/reject', adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    await User.setStatus(userId, 'rejected');
    const updated = await User.findById(userId);
    res.json({ user: updated });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

module.exports = router;
