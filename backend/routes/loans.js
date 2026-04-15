const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const LoanApplication = require('../models/LoanApplication');
const LoanPool = require('../models/LoanPool');
const { pool } = require('../config/database');
const { auth, adminAuth, userAuth } = require('../middleware/auth');

const router = express.Router();

const loanScreenshotsDir = path.join(__dirname, '../uploads/loan-screenshots');
fs.mkdirSync(loanScreenshotsDir, { recursive: true });

const loanScreenshotStorage = multer.diskStorage({
  destination: loanScreenshotsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `loan_${Date.now()}${ext}`);
  },
});
const uploadLoanScreenshot = multer({
  storage: loanScreenshotStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const MAX_LOAN_AMOUNT = 500000; // ₹5,00,000 max per loan

function parseId(val) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Apply for a loan (user only)
router.post('/apply', userAuth, async (req, res) => {
  try {
    const { amount, purpose, repayment_date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid loan amount' });
    }
    if (amount > MAX_LOAN_AMOUNT) {
      return res.status(400).json({ error: `Loan amount cannot exceed ₹${MAX_LOAN_AMOUNT.toLocaleString('en-IN')}` });
    }

    // Compare dates in UTC to avoid timezone off-by-one errors
    if (!repayment_date) {
      return res.status(400).json({ error: 'Repayment date is required' });
    }
    const repaymentDate = new Date(repayment_date + 'T00:00:00.000Z');
    if (isNaN(repaymentDate.getTime())) {
      return res.status(400).json({ error: 'Invalid repayment date' });
    }
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (repaymentDate <= todayUTC) {
      return res.status(400).json({ error: 'Repayment date must be in the future' });
    }

    const loanPool = await LoanPool.getPoolData();
    if (amount > loanPool.available_balance) {
      return res.status(400).json({
        error: 'Loan amount exceeds available pool balance',
        available_balance: loanPool.available_balance
      });
    }

    const loan = await LoanApplication.create({
      user_id: req.user.id,
      amount,
      purpose,
      repayment_date
    });

    res.status(201).json({
      message: 'Loan application submitted successfully',
      loan
    });
  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({ error: 'Failed to submit loan application' });
  }
});

// Get user's loans
router.get('/my-loans', userAuth, async (req, res) => {
  try {
    const loans = await LoanApplication.findByUserId(req.user.id);
    res.json({ loans });
  } catch (error) {
    console.error('Get user loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Calculate interest preview
router.post('/calculate-interest', userAuth, async (req, res) => {
  try {
    const { amount, repayment_date } = req.body;

    if (!amount || !repayment_date) {
      return res.status(400).json({ error: 'Amount and repayment date are required' });
    }

    const interest = await LoanApplication.calculateInterest(
      new Date(),
      repayment_date,
      amount
    );

    const total_due = amount + interest;

    res.json({
      interest_amount: interest,
      total_due,
      days: Math.ceil((new Date(repayment_date) - new Date()) / (1000 * 60 * 60 * 24))
    });
  } catch (error) {
    console.error('Interest calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate interest' });
  }
});

// Get all loans (admin only)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const loans = await LoanApplication.getAll();
    res.json({ loans });
  } catch (error) {
    console.error('Get all loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Get pending loans (admin only)
router.get('/pending', adminAuth, async (req, res) => {
  try {
    const loans = await LoanApplication.getByStatus('pending');
    res.json({ loans });
  } catch (error) {
    console.error('Get pending loans error:', error);
    res.status(500).json({ error: 'Failed to fetch pending loans' });
  }
});

// GET /loans/pending-public — pending loans visible to all authenticated users (limited info)
router.get('/pending-public', auth, async (req, res) => {
  try {
    const loans = await LoanApplication.getByStatus('pending');
    const safeLoans = await Promise.all(loans.map(async loan => {
      const { rows } = await pool.query(
        `SELECT id, status FROM loan_swap_requests WHERE loan_id = $1 AND requester_id = $2`,
        [loan.id, req.user.id]
      );
      const swapReq = rows[0] || null;
      return {
        id: loan.id,
        user_id: loan.user_id,
        user_name: loan.user_name,
        user_email: loan.user_email,
        user_phone: loan.user_phone,
        amount: loan.amount,
        purpose: loan.purpose,
        applied_on: loan.applied_on,
        repayment_date: loan.repayment_date,
        interest_amount: loan.interest_amount,
        total_due: loan.total_due,
        status: loan.status,
        is_mine: loan.user_id === req.user.id,
        my_swap_request: swapReq,
      };
    }));
    res.json({ loans: safeLoans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending loans' });
  }
});

// POST /loans/:id/request-swap — user requests to take over a pending loan slot
router.post('/:id/request-swap', auth, async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  try {
    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'pending') return res.status(400).json({ error: 'Only pending loans can be swapped' });
    if (loan.user_id === req.user.id) return res.status(400).json({ error: 'Cannot request a swap on your own loan' });

    // Block only active (non-terminal) swap requests
    const { rows: existingRows } = await pool.query(
      `SELECT id FROM loan_swap_requests WHERE loan_id = $1 AND requester_id = $2 AND status IN ('pending_owner', 'pending_admin')`,
      [loanId, req.user.id]
    );
    if (existingRows[0]) return res.status(400).json({ error: 'You already have a pending swap request for this loan' });

    try {
      await pool.query(
        `INSERT INTO loan_swap_requests (loan_id, requester_id, original_owner_id, status) VALUES ($1, $2, $3, 'pending_owner')`,
        [loanId, req.user.id, loan.user_id]
      );
    } catch (err) {
      // Unique constraint violation — concurrent duplicate request
      if (err.code === '23505') {
        return res.status(400).json({ error: 'You already have a pending swap request for this loan' });
      }
      throw err;
    }

    res.json({ message: 'Swap request sent to loan owner for approval' });
  } catch (error) {
    console.error('request-swap error:', error);
    res.status(500).json({ error: 'Failed to submit swap request' });
  }
});

// GET /loans/my-swap-requests — swap requests received by the current user (as loan owner)
router.get('/my-swap-requests', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sr.*, la.amount, la.purpose, la.repayment_date, la.interest_amount, la.total_due,
              u.name as requester_name, u.email as requester_email
       FROM loan_swap_requests sr
       JOIN loan_applications la ON la.id = sr.loan_id
       JOIN users u ON u.id = sr.requester_id
       WHERE la.user_id = $1 AND sr.status = 'pending_owner'
       ORDER BY sr.created_at DESC`,
      [req.user.id]
    );
    res.json({ requests: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch swap requests' });
  }
});

// POST /loans/swap-requests/:id/approve-owner — loan owner approves the swap (sends to admin)
router.post('/swap-requests/:id/approve-owner', auth, async (req, res) => {
  const reqId = parseId(req.params.id);
  if (!reqId) return res.status(400).json({ error: 'Invalid swap request id' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT sr.*, la.user_id AS loan_owner_id, la.status AS loan_status
       FROM loan_swap_requests sr
       JOIN loan_applications la ON la.id = sr.loan_id
       WHERE sr.id = $1 FOR UPDATE`,
      [reqId]
    );
    const swapReq = rows[0];
    if (!swapReq) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Swap request not found' });
    }
    if (swapReq.loan_owner_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not your loan' });
    }
    if (swapReq.status !== 'pending_owner') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request already processed' });
    }

    await client.query(
      `UPDATE loan_swap_requests
       SET status = 'pending_admin', owner_approved_at = CURRENT_TIMESTAMP,
           original_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [swapReq.loan_status, reqId]
    );
    await client.query(
      `UPDATE loan_applications SET status = 'swap_pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [swapReq.loan_id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Swap approved — sent to admin for final approval' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('approve-owner error:', error);
    res.status(500).json({ error: 'Failed to approve swap request' });
  } finally {
    client.release();
  }
});

// POST /loans/swap-requests/:id/reject-owner — loan owner rejects the swap
router.post('/swap-requests/:id/reject-owner', auth, async (req, res) => {
  const reqId = parseId(req.params.id);
  if (!reqId) return res.status(400).json({ error: 'Invalid swap request id' });

  try {
    const { rows } = await pool.query(
      `SELECT sr.*, la.user_id AS loan_owner_id FROM loan_swap_requests sr
       JOIN loan_applications la ON la.id = sr.loan_id WHERE sr.id = $1`,
      [reqId]
    );
    const swapReq = rows[0];
    if (!swapReq) return res.status(404).json({ error: 'Swap request not found' });
    if (swapReq.loan_owner_id !== req.user.id) return res.status(403).json({ error: 'Not your loan' });
    if (swapReq.status !== 'pending_owner') return res.status(400).json({ error: 'Request already processed' });

    await pool.query(
      `UPDATE loan_swap_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [reqId]
    );
    res.json({ message: 'Swap request rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject swap request' });
  }
});

// GET /loans/admin-swap-requests — all pending_admin swap requests (admin)
router.get('/admin-swap-requests', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sr.*, la.amount, la.purpose, la.repayment_date, la.interest_amount, la.total_due,
              la.user_id as owner_id, owner.name as owner_name,
              req.name as requester_name, req.email as requester_email
       FROM loan_swap_requests sr
       JOIN loan_applications la ON la.id = sr.loan_id
       JOIN users owner ON owner.id = la.user_id
       JOIN users req ON req.id = sr.requester_id
       WHERE sr.status = 'pending_admin'
       ORDER BY sr.created_at DESC`
    );
    res.json({ requests: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch swap requests' });
  }
});

// POST /loans/swap-requests/:id/approve-admin — admin finalises the swap (reassign loan to requester)
router.post('/swap-requests/:id/approve-admin', adminAuth, async (req, res) => {
  const reqId = parseId(req.params.id);
  if (!reqId) return res.status(400).json({ error: 'Invalid swap request id' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM loan_swap_requests WHERE id = $1 FOR UPDATE`,
      [reqId]
    );
    const swapReq = rows[0];
    if (!swapReq) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Swap request not found' });
    }
    if (swapReq.status !== 'pending_admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request not pending admin approval' });
    }

    await client.query(
      `UPDATE loan_applications SET user_id = $1, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [swapReq.requester_id, swapReq.loan_id]
    );
    await client.query(
      `UPDATE loan_swap_requests SET status = 'approved', admin_approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [reqId]
    );
    await client.query('COMMIT');
    res.json({ message: 'Loan reassigned to requester' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('approve-admin error:', error);
    res.status(500).json({ error: 'Failed to approve swap' });
  } finally {
    client.release();
  }
});

// POST /loans/swap-requests/:id/reject-admin — admin rejects the swap
router.post('/swap-requests/:id/reject-admin', adminAuth, async (req, res) => {
  const reqId = parseId(req.params.id);
  if (!reqId) return res.status(400).json({ error: 'Invalid swap request id' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT * FROM loan_swap_requests WHERE id = $1 FOR UPDATE`,
      [reqId]
    );
    const swapReq = rows[0];
    if (!swapReq) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Swap request not found' });
    }
    if (swapReq.status !== 'pending_admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Request not pending admin approval' });
    }

    await client.query(
      `UPDATE loan_swap_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [reqId]
    );
    // Restore the loan's original status (saved when owner approved the swap)
    const restoreStatus = swapReq.original_status || 'pending';
    await client.query(
      `UPDATE loan_applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [restoreStatus, swapReq.loan_id]
    );
    await client.query('COMMIT');
    res.json({ message: 'Swap request rejected' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('reject-admin error:', error);
    res.status(500).json({ error: 'Failed to reject swap' });
  } finally {
    client.release();
  }
});

// Get active loans — admin_notes excluded from public response
router.get('/active', auth, async (req, res) => {
  try {
    const loans = await LoanApplication.getByStatus('approved');
    // eslint-disable-next-line no-unused-vars
    const sanitized = loans.map(({ admin_notes, ...rest }) => rest);
    res.json({ loans: sanitized });
  } catch (error) {
    console.error('Get active loans error:', error);
    res.status(500).json({ error: 'Failed to fetch active loans' });
  }
});

// Approve loan (admin only) — accepts multipart/form-data with optional screenshot
router.post('/:id/approve', adminAuth, uploadLoanScreenshot.single('screenshot'), async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  try {
    const admin_notes = req.body?.admin_notes || '';
    const approved_date = req.body?.approved_date || null;
    const screenshotPath = req.file ? `/uploads/loan-screenshots/${req.file.filename}` : null;

    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'pending') return res.status(400).json({ error: 'Only pending loans can be approved' });

    const loanPool = await LoanPool.getPoolData();
    if (loan.amount > loanPool.available_balance) {
      return res.status(400).json({ error: 'Insufficient funds in loan pool' });
    }

    await LoanApplication.approve(loanId, admin_notes, approved_date, screenshotPath);
    await LoanPool.recalculateAvailableBalance();
    res.json({ message: 'Loan approved successfully' });
  } catch (error) {
    console.error('Approve loan error:', error);
    res.status(500).json({ error: 'Failed to approve loan' });
  }
});

// Reject loan (admin only)
router.post('/:id/reject', adminAuth, async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  try {
    const { admin_notes, rejected_on } = req.body;
    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'pending') return res.status(400).json({ error: 'Only pending loans can be rejected' });

    await LoanApplication.reject(loanId, admin_notes, rejected_on);
    res.json({ message: 'Loan rejected successfully' });
  } catch (error) {
    console.error('Reject loan error:', error);
    res.status(500).json({ error: 'Failed to reject loan' });
  }
});

// Close loan (admin only) — atomic: status + interest + balance in one transaction
router.post('/:id/close', adminAuth, uploadLoanScreenshot.single('screenshot'), async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  const loan = await LoanApplication.findById(loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  if (loan.status !== 'approved') return res.status(400).json({ error: 'Only approved loans can be closed' });

  const screenshotPath = req.file ? `/uploads/loan-screenshots/${req.file.filename}` : null;
  const paymentReceivedDate = req.body.payment_received_date || null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE loan_applications
       SET status = 'closed', closed_on = CURRENT_TIMESTAMP,
           screenshot_path = $2, payment_received_date = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [loanId, screenshotPath, paymentReceivedDate]
    );
    await client.query(
      `UPDATE loan_pool
       SET total_interest_collected = total_interest_collected + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [loan.interest_amount]
    );
    await client.query(
      `UPDATE loan_pool
       SET available_balance = total_pool - (
         SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'approved'
       ), updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    );
    await client.query('COMMIT');
    res.json({ message: 'Loan closed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Close loan error:', error);
    res.status(500).json({ error: 'Failed to close loan' });
  } finally {
    client.release();
  }
});

// Foreclose loan (admin only) — atomic: status + interest + balance in one transaction
router.post('/:id/foreclose', adminAuth, uploadLoanScreenshot.single('screenshot'), async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  const loan = await LoanApplication.findById(loanId);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  if (loan.status !== 'approved') return res.status(400).json({ error: 'Only approved loans can be foreclosed' });

  const screenshotPath = req.file ? `/uploads/loan-screenshots/${req.file.filename}` : null;
  const paymentReceivedDate = req.body.payment_received_date || null;

  // ── Recalculate interest based on actual foreclosure date ─────────────────
  // Use paymentReceivedDate if provided, otherwise use current timestamp.
  const foreclosureDate = paymentReceivedDate
    ? new Date(paymentReceivedDate + 'T23:59:59')   // end of that day
    : new Date();
  const approvedDate = loan.approved_on ? new Date(loan.approved_on) : new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysElapsed = Math.max(0, Math.floor((foreclosureDate - approvedDate) / msPerDay));
  // Formula: ₹50 per week after a 15-day grace period
  const weeksCharged = Math.max(0, Math.floor((daysElapsed - 15) / 7));
  const actualInterest = weeksCharged * 50;
  const actualTotalDue = parseFloat(loan.amount) + actualInterest;
  // ──────────────────────────────────────────────────────────────────────────

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const admin_notes = req.body.admin_notes || '';
    await client.query(
      `UPDATE loan_applications
       SET status = 'foreclosed', admin_notes = $1, foreclosed_on = CURRENT_TIMESTAMP,
           screenshot_path = $3, payment_received_date = $4,
           interest_amount = $5, total_due = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [admin_notes, loanId, screenshotPath, paymentReceivedDate, actualInterest, actualTotalDue]
    );
    await client.query(
      `UPDATE loan_pool
       SET total_interest_collected = total_interest_collected + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [actualInterest]
    );
    await client.query(
      `UPDATE loan_pool
       SET available_balance = total_pool - (
         SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'approved'
       ), updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    );
    await client.query('COMMIT');
    res.json({
      message: 'Loan foreclosed successfully',
      daysElapsed,
      weeksCharged,
      actualInterest,
      actualTotalDue,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Foreclose loan error:', error);
    res.status(500).json({ error: 'Failed to foreclose loan', detail: error.message });
  } finally {
    client.release();
  }
});

// Update loan (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  try {
    const updateData = req.body;
    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    if (loan.status !== 'pending' && loan.status !== 'approved') {
      return res.status(400).json({ error: 'Only pending or approved loans can be updated' });
    }
    await LoanApplication.update(loanId, updateData);
    res.json({ message: 'Loan updated successfully' });
  } catch (error) {
    console.error('Update loan error:', error);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// GET /loans/swapped-loans — history of approved loan swaps (admin only)
router.get('/swapped-loans', adminAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sr.id, sr.loan_id, sr.requester_id, sr.original_owner_id,
              sr.owner_approved_at, sr.admin_approved_at, sr.created_at,
              la.amount, la.purpose, la.repayment_date, la.interest_amount, la.total_due, la.status as loan_status,
              req.name as new_owner_name, req.email as new_owner_email, req.phone as new_owner_phone,
              orig.name as original_owner_name, orig.email as original_owner_email, orig.phone as original_owner_phone
       FROM loan_swap_requests sr
       JOIN loan_applications la ON la.id = sr.loan_id
       JOIN users req ON req.id = sr.requester_id
       LEFT JOIN users orig ON orig.id = sr.original_owner_id
       WHERE sr.status = 'approved'
       ORDER BY sr.admin_approved_at DESC`
    );
    res.json({ requests: rows });
  } catch (error) {
    console.error('Get swapped loans error:', error);
    res.status(500).json({ error: 'Failed to fetch swapped loans' });
  }
});

// DELETE /loans/swap-requests/:id — delete a swap history record (admin only)
router.delete('/swap-requests/:id', adminAuth, async (req, res) => {
  const reqId = parseId(req.params.id);
  if (!reqId) return res.status(400).json({ error: 'Invalid swap request id' });

  try {
    const { rowCount } = await pool.query(
      `DELETE FROM loan_swap_requests WHERE id = $1 AND status = 'approved'`,
      [reqId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Swap history record not found' });
    res.json({ message: 'Swap history record deleted' });
  } catch (error) {
    console.error('Delete swap request error:', error);
    res.status(500).json({ error: 'Failed to delete swap history record' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  const loanId = parseId(req.params.id);
  if (!loanId) return res.status(400).json({ error: 'Invalid loan id' });

  try {
    const loan = await LoanApplication.findById(loanId);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    // Remove swap requests first to satisfy FK constraint
    await pool.query('DELETE FROM loan_swap_requests WHERE loan_id = $1', [loanId]);
    await LoanApplication.delete(loanId);
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    console.error('Delete loan error:', error);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

module.exports = router;
