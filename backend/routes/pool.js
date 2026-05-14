const express = require('express');
const { pool } = require('../config/database');
const LoanPool = require('../models/LoanPool');
const LoanApplication = require('../models/LoanApplication');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get pool summary (authenticated users)
// NOTE: Do NOT recalculate available_balance on read — it would clobber any
// admin-supplied value from PUT /pool/available. The pool is kept consistent
// by the write paths (loan approve/close/foreclose, top-up, manual set).
// `total_interest_collected` is derived from the interest_collections tracker
// (source of truth), not from the legacy loan_pool column.
router.get('/summary', auth, async (req, res) => {
  try {
    const [poolData, disbursed, activeLoans, expectedInterest, interestCollected] = await Promise.all([
      LoanPool.getPoolData(),
      LoanPool.getDisbursedAmount(),
      LoanPool.getActiveLoansTotal(),
      LoanPool.getExpectedInterest(),
      LoanPool.getInterestCollectedTotal(),
    ]);

    const summary = {
      total_pool: poolData.total_pool,
      amount_disbursed: disbursed,
      available_balance: poolData.available_balance,
      total_interest_collected: interestCollected,
      active_loans_total: activeLoans,
      expected_interest: expectedInterest,
    };

    res.json({ summary });
  } catch (error) {
    console.error('Get pool summary error:', error);
    res.status(500).json({ error: 'Failed to fetch pool summary' });
  }
});

// Get pool data for dashboard (authenticated users)
// NOTE: Do NOT recalculate available_balance on read — see /summary above.
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [poolData, pendingLoans, expectedInterest, interestCollected] = await Promise.all([
      LoanPool.getPoolData(),
      LoanApplication.getByStatus('pending'),
      LoanPool.getExpectedInterest(),
      LoanPool.getInterestCollectedTotal(),
    ]);

    const dashboard = {
      available_balance: poolData.available_balance,
      total_pool: poolData.total_pool,
      total_interest_collected: interestCollected,
      pending_count: pendingLoans.length,
      expected_interest: expectedInterest,
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Get pool dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/pool/interest-collections — list interest collection history (admin only)
// Returns newest first with joined user + loan info for the admin history viewer.
router.get('/interest-collections', adminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const offset = parseInt(req.query.offset) || 0;
    const [collections, total] = await Promise.all([
      LoanPool.listInterestCollections({ limit, offset }),
      LoanPool.getInterestCollectedTotal(),
    ]);
    res.json({ collections, total });
  } catch (error) {
    console.error('Get interest collections error:', error);
    res.status(500).json({ error: 'Failed to fetch interest collections' });
  }
});

// PUT /api/pool/available — set available balance directly (admin only)
router.put('/available', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const parsed = parseFloat(amount);
    if (amount === undefined || isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'A valid non-negative amount is required' });
    }
    const poolData = await LoanPool.getPoolData();
    if (parsed > poolData.total_pool) {
      return res.status(400).json({ error: `Available balance cannot exceed total pool (${poolData.total_pool})` });
    }
    await LoanPool.setAvailableBalance(parsed);
    const updatedPool = await LoanPool.getPoolData();
    res.json({ message: 'Available balance updated', pool: updatedPool });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update available balance' });
  }
});

// PUT /api/pool/interest — set interest collected total directly (admin only)
// Implemented as a signed adjustment row in the tracker so the dashboard SUM matches.
router.put('/interest', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    const parsed = parseFloat(amount);
    if (amount === undefined || isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ error: 'A valid non-negative amount is required' });
    }
    await LoanPool.adjustInterestCollectedTo(parsed, { source: 'adjustment' });
    const total = await LoanPool.getInterestCollectedTotal();
    res.json({ message: 'Interest collected updated', total_interest_collected: total });
  } catch (error) {
    console.error('Set interest collected error:', error);
    res.status(500).json({ error: 'Failed to update interest collected' });
  }
});

// DELETE /api/pool/interest — reset interest collected to zero (admin only)
router.delete('/interest', adminAuth, async (req, res) => {
  try {
    await LoanPool.adjustInterestCollectedTo(0, { source: 'reset', notes: 'Admin reset interest collected to ₹0' });
    const total = await LoanPool.getInterestCollectedTotal();
    res.json({ message: 'Interest collected reset to zero', total_interest_collected: total });
  } catch (error) {
    console.error('Reset interest error:', error);
    res.status(500).json({ error: 'Failed to reset interest' });
  }
});

// POST /api/pool/transfer-interest — move collected interest into total pool (admin only)
// Atomic: compute current SUM, add it to total_pool, insert a negative adjustment to
// bring the tracker SUM back to zero. Wrapped in a transaction so partial failures
// don't leave the books inconsistent.
router.post('/transfer-interest', adminAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: sumRows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM interest_collections`
    );
    const transferred = parseFloat(sumRows[0].total);
    if (transferred <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No interest collected to transfer' });
    }
    await client.query(
      `UPDATE loan_pool
       SET total_pool = total_pool + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [transferred]
    );
    await client.query(
      `INSERT INTO interest_collections (loan_id, user_id, amount, source, notes)
       VALUES (NULL, NULL, $1, 'transfer', $2)`,
      [-transferred, `Transferred ₹${transferred} into total pool`]
    );
    await client.query(
      `UPDATE loan_pool
       SET available_balance = total_pool - (
         SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'approved'
       ), updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    );
    await client.query('COMMIT');
    const updatedPool = await LoanPool.getPoolData();
    res.json({ message: `Transferred ${transferred} to available balance`, pool: updatedPool });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer interest error:', error);
    res.status(500).json({ error: 'Failed to transfer interest' });
  } finally {
    client.release();
  }
});

// Add amount to pool (admin only)
router.post('/add', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'A valid positive amount is required' });
    }
    await LoanPool.addToPool(parseFloat(amount));
    await LoanPool.recalculateAvailableBalance();
    const pool = await LoanPool.getPoolData();
    res.json({ message: 'Pool amount updated successfully', pool });
  } catch (error) {
    console.error('Add to pool error:', error);
    res.status(500).json({ error: 'Failed to update pool amount' });
  }
});

module.exports = router;