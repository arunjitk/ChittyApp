const express = require('express');
const User = require('../models/User');
const { generateToken, auth } = require('../middleware/auth');

const router = express.Router();

// Register new user — creates account in pending state; no token issued
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create with status='pending' — admin must approve before the account is usable
    await User.create({ name, email, password, phone: phone || null, status: 'pending' });

    res.status(202).json({
      pending: true,
      message: 'Registration submitted. Your account is pending admin approval.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check account status
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your account registration was not approved.' });
    }

    // Check lockout
    if (user.is_locked) {
      return res.status(403).json({ error: 'Your account is locked. Please contact an administrator.' });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password_hash);
    if (!isValidPassword) {
      // Increment failed attempts then check if threshold reached
      await User.incrementFailedAttempts(user.id);
      await User.lockIfExceeded(user.id);
      // Fetch updated record to give accurate error
      const updated = await User.findById(user.id);
      if (updated.is_locked) {
        return res.status(403).json({ error: 'Too many failed attempts. Your account has been locked. Contact an administrator.' });
      }
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Successful login — reset failed attempts
    await User.resetFailedAttempts(user.id);

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_path: user.avatar_path,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Logout user (client-side token removal)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
