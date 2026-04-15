const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { auth, adminAuth } = require('../middleware/auth');
const ChittyGroup = require('../models/ChittyGroup');
const UserChitty = require('../models/UserChitty');
const { pool } = require('../config/database');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads/screenshots'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `payment_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/chitty/group
router.get('/group', auth, async (req, res) => {
  try {
    const group = await ChittyGroup.get();
    res.json({ group });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chitty group' });
  }
});

// PATCH /api/chitty/group
router.patch('/group', adminAuth, async (req, res) => {
  try {
    await ChittyGroup.update(req.body);
    const group = await ChittyGroup.get();
    res.json({ group });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update chitty group' });
  }
});

// GET /api/chitty/all-members — MUST be before /:id
router.get('/all-members', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT uc.*,
              u.id   AS linked_user_id,
              u.name AS linked_user_name,
              u.email AS linked_user_email
       FROM user_chitty uc
       LEFT JOIN users u ON u.id = uc.user_id
       ORDER BY uc.member_index`
    );
    const members = rows.map(r => {
      const { linked_user_id, linked_user_name, linked_user_email, ...rest } = r;
      return {
        ...rest,
        linked_user: linked_user_id
          ? { id: linked_user_id, name: linked_user_name, email: linked_user_email }
          : null,
      };
    });
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// GET /api/chitty/linkable-users — MUST be before /:id
router.get('/linkable-users', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone
       FROM users u
       WHERE u.role = 'user'
         AND u.status = 'active'
         AND u.id NOT IN (
           SELECT user_id FROM user_chitty WHERE user_id IS NOT NULL
         )
       ORDER BY u.name`
    );
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch linkable users' });
  }
});

// POST /api/chitty/swap-months — MUST be before /:id
router.post('/swap-months', adminAuth, async (req, res) => {
  const id1 = parseInt(req.body.id1, 10);
  const id2 = parseInt(req.body.id2, 10);
  if (!Number.isFinite(id1) || id1 <= 0 || !Number.isFinite(id2) || id2 <= 0) {
    return res.status(400).json({ error: 'id1 and id2 must be positive integers' });
  }
  if (id1 === id2) {
    return res.status(400).json({ error: 'id1 and id2 must be different members' });
  }
  try {
    await UserChitty.swapMonths(id1, id2);
    const members = await UserChitty.getAll();
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to swap months' });
  }
});

// POST /api/chitty/advance-month — MUST be before /:id
router.post('/advance-month', adminAuth, async (req, res) => {
  try {
    const group = await ChittyGroup.get();
    if (group.current_month >= group.total_members) {
      return res.status(400).json({ error: 'Chitty has already completed all months' });
    }
    const members = await UserChitty.getAll();
    const currentMember = members.find(m => m.payout_month === group.current_month);
    if (currentMember) {
      const { rows } = await pool.query(
        `SELECT id, paid_at FROM chitty_payments WHERE member_id = $1 AND month = $2 AND paid_at IS NOT NULL`,
        [currentMember.id, group.current_month]
      );
      if (!rows[0]) {
        return res.status(400).json({
          error: `Cannot advance: ${currentMember.member_name} (month ${group.current_month} payout recipient) has not been marked as paid yet`,
        });
      }
      await UserChitty.update(currentMember.id, { status: 'paid', paid_month: group.current_month });
    }
    await ChittyGroup.update({ current_month: group.current_month + 1 });
    const updatedGroup = await ChittyGroup.get();
    const updatedMembers = await UserChitty.getAll();
    res.json({ group: updatedGroup, members: updatedMembers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to advance month' });
  }
});

// GET /api/chitty/my-chitty
router.get('/my-chitty', auth, async (req, res) => {
  try {
    const group = await ChittyGroup.get();
    const member = await UserChitty.findByUserId(req.user.id);
    const allMembers = await UserChitty.getAll();

    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const ordinal = (n) => {
      const s = ['th','st','nd','rd']; const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const calendarInfo = (payoutMonth) => {
      const offset = (group.start_month - 1) + (payoutMonth - 1);
      return { month_name: monthNames[offset % 12], year: group.start_year + Math.floor(offset / 12) };
    };

    let payoutInfo = null;
    if (member) {
      const { month_name, year } = calendarInfo(member.payout_month);
      payoutInfo = {
        payout_month: member.payout_month,
        formatted: `Month ${member.payout_month} - ${month_name} ${year} (Payout: ${ordinal(group.payout_day)})`,
      };
    }

    const currentMember = allMembers.find(m => m.payout_month === group.current_month);
    let currentPayout = null;
    if (currentMember) {
      const { month_name, year } = calendarInfo(group.current_month);
      currentPayout = {
        member_name: currentMember.member_name,
        month: group.current_month,
        month_name, year,
        payout_day: group.payout_day,
        amount: group.chitty_amount * group.total_members,
        status: currentMember.status,
        is_me: currentMember.user_id === req.user.id,
      };
    }

    const nextMonth = group.current_month + 1;
    const nextMember = allMembers.find(m => m.payout_month === nextMonth);
    let nextPayout = null;
    if (nextMember && nextMonth <= group.total_members) {
      const { month_name, year } = calendarInfo(nextMonth);
      nextPayout = {
        member_name: nextMember.member_name,
        month: nextMonth,
        month_name, year,
        payout_day: group.payout_day,
        amount: group.chitty_amount * group.total_members,
        is_me: nextMember.user_id === req.user.id,
      };
    }

    const schedule = allMembers
      .sort((a, b) => a.payout_month - b.payout_month)
      .map(m => {
        const { month_name, year } = calendarInfo(m.payout_month);
        return { member_name: m.member_name, payout_month: m.payout_month, month_name, year, status: m.status, is_me: m.user_id === req.user.id };
      });

    let payout_schedule = [];
    if (member) {
      const { rows: payments } = await pool.query(
        `SELECT * FROM chitty_payments WHERE member_id = $1 ORDER BY month`,
        [member.id]
      );
      for (let m = 1; m <= group.total_members; m++) {
        const payment = payments.find(p => p.month === m);
        const is_recipient = m === member.payout_month;
        const is_past = m < group.current_month;
        const is_current = m === group.current_month;
        const { month_name, year } = calendarInfo(m);
        const calendar_label = `${month_name} ${year}`;

        if (is_recipient) {
          let payout_status;
          if (is_past) payout_status = payment?.paid_at ? 'received' : 'missed';
          else if (is_current) payout_status = payment?.paid_at ? 'received' : 'pending';
          else payout_status = 'upcoming';
          payout_schedule.push({
            month: m, calendar_label, month_name, year,
            is_recipient: true, is_past, is_current,
            payout_amount: group.chitty_amount * group.total_members,
            payout_status, paid_at: payment?.paid_at || null, notes: payment?.notes || null,
          });
        } else {
          let contribution_status;
          if (is_past) contribution_status = payment?.paid_at ? 'paid' : 'unpaid';
          else if (is_current) contribution_status = payment?.paid_at ? 'paid' : 'due';
          else contribution_status = 'upcoming';
          payout_schedule.push({
            month: m, calendar_label, month_name, year,
            is_recipient: false, is_past, is_current,
            contribution_amount: group.chitty_amount,
            contribution_status, paid_at: payment?.paid_at || null,
            upi_id: payment?.upi_id || null, phone: payment?.phone || null, notes: payment?.notes || null,
          });
        }
      }
    }

    res.json({ group, member, payoutInfo, currentPayout, nextPayout, schedule, linked: !!member, payout_schedule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chitty data' });
  }
});

// PUT /api/chitty/:id/link-user
router.put('/:id/link-user', adminAuth, async (req, res) => {
  const memberId = parseInt(req.params.id, 10);
  const { user_id } = req.body;

  try {
    const member = await UserChitty.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    if (user_id !== null && user_id !== undefined) {
      const { rows: userRows } = await pool.query(
        `SELECT id, name, email, status, role FROM users WHERE id = $1`,
        [user_id]
      );
      const targetUser = userRows[0];
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.status !== 'active') return res.status(400).json({ error: 'User account is not active' });

      const { rows: existingRows } = await pool.query(
        `SELECT id, member_name FROM user_chitty WHERE user_id = $1 AND id != $2`,
        [user_id, memberId]
      );
      if (existingRows[0]) {
        return res.status(400).json({ error: `This user is already linked to member "${existingRows[0].member_name}"` });
      }

      await UserChitty.update(memberId, { user_id });
    } else {
      await UserChitty.update(memberId, { user_id: null });
    }

    const { rows } = await pool.query(
      `SELECT uc.*, u.id AS linked_user_id, u.name AS linked_user_name, u.email AS linked_user_email
       FROM user_chitty uc LEFT JOIN users u ON u.id = uc.user_id WHERE uc.id = $1`,
      [memberId]
    );
    const { linked_user_id, linked_user_name, linked_user_email, ...rest } = rows[0];
    const updatedMember = {
      ...rest,
      linked_user: linked_user_id
        ? { id: linked_user_id, name: linked_user_name, email: linked_user_email }
        : null,
    };
    res.json({ member: updatedMember });
  } catch (err) {
    console.error('link-user error:', err);
    res.status(500).json({ error: 'Failed to update user link' });
  }
});

// PATCH /api/chitty/:id
router.patch('/:id', adminAuth, async (req, res) => {
  try {
    await UserChitty.update(req.params.id, req.body);
    const member = await UserChitty.findById(req.params.id);
    res.json({ member });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// POST /api/chitty/:id/request-transfer
router.post('/:id/request-transfer', auth, async (req, res) => {
  try {
    const member = await UserChitty.findById(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.user_id !== req.user.id) return res.status(403).json({ error: 'Not your chitty slot' });
    await UserChitty.update(req.params.id, { transfer_requested: 1 });
    res.json({ message: 'Transfer request submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request transfer' });
  }
});

// ── Payment tracking ──────────────────────────────────────────────────────────

// GET /api/chitty/payments
router.get('/payments', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, uc.member_name, uc.member_index, uc.payout_month
       FROM chitty_payments p
       JOIN user_chitty uc ON uc.id = p.member_id
       ORDER BY p.member_id, p.month`
    );
    res.json({ payments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// GET /api/chitty/my-payments
router.get('/my-payments', auth, async (req, res) => {
  try {
    const { rows: memberRows } = await pool.query(
      'SELECT id FROM user_chitty WHERE user_id = $1',
      [req.user.id]
    );
    if (!memberRows[0]) return res.json({ payments: [] });
    const { rows } = await pool.query(
      `SELECT * FROM chitty_payments WHERE member_id = $1 ORDER BY month`,
      [memberRows[0].id]
    );
    res.json({ payments: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/chitty/payments — upsert payment record
router.post('/payments', adminAuth, async (req, res) => {
  const { member_id, month, phone, upi_id, notes, paid_at } = req.body;
  if (!member_id || !month) return res.status(400).json({ error: 'member_id and month required' });
  try {
    await pool.query(
      `INSERT INTO chitty_payments (member_id, month, phone, upi_id, notes, paid_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT(member_id, month) DO UPDATE SET
         phone = EXCLUDED.phone,
         upi_id = EXCLUDED.upi_id,
         notes = EXCLUDED.notes,
         paid_at = EXCLUDED.paid_at,
         updated_at = CURRENT_TIMESTAMP`,
      [member_id, month, phone || null, upi_id || null, notes || null, paid_at || null]
    );
    const { rows } = await pool.query(
      `SELECT p.*, uc.member_name FROM chitty_payments p
       JOIN user_chitty uc ON uc.id = p.member_id
       WHERE p.member_id = $1 AND p.month = $2`,
      [member_id, month]
    );
    res.json({ payment: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save payment' });
  }
});

// POST /api/chitty/payments/:member_id/:month/screenshot
router.post('/payments/:member_id/:month/screenshot', adminAuth, upload.single('screenshot'), async (req, res) => {
  const memberId = parseInt(req.params.member_id, 10);
  const month = parseInt(req.params.month, 10);
  if (!Number.isFinite(memberId) || memberId <= 0) {
    return res.status(400).json({ error: 'Invalid member_id' });
  }
  if (!Number.isFinite(month) || month <= 0) {
    return res.status(400).json({ error: 'Invalid month' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const member = await UserChitty.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const group = await ChittyGroup.get();
    if (month < 1 || month > group.total_members) {
      return res.status(400).json({ error: `Month must be between 1 and ${group.total_members}` });
    }

    const screenshotPath = `/uploads/screenshots/${req.file.filename}`;
    await pool.query(
      `INSERT INTO chitty_payments (member_id, month, screenshot_path, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT(member_id, month) DO UPDATE SET
         screenshot_path = EXCLUDED.screenshot_path,
         updated_at = CURRENT_TIMESTAMP`,
      [memberId, month, screenshotPath]
    );
    res.json({ screenshot_path: screenshotPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save screenshot path' });
  }
});

// DELETE /api/chitty/payments/:member_id/:month
router.delete('/payments/:member_id/:month', adminAuth, async (req, res) => {
  const { member_id, month } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM chitty_payments WHERE member_id = $1 AND month = $2`,
      [member_id, month]
    );
    res.json({ message: 'Payment record deleted', changes: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment record' });
  }
});

// DELETE /api/chitty/payments/:member_id/:month/screenshot
router.delete('/payments/:member_id/:month/screenshot', adminAuth, async (req, res) => {
  const { member_id, month } = req.params;
  try {
    await pool.query(
      `UPDATE chitty_payments SET screenshot_path = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE member_id = $1 AND month = $2`,
      [member_id, month]
    );
    res.json({ message: 'Screenshot removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove screenshot' });
  }
});

module.exports = router;
