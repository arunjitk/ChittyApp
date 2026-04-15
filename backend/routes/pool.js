const express = require('express');
const LoanPool = require('../models/LoanPool');
const LoanApplication = require('../models/LoanApplication');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get pool summary (authenticated users)
router.get('/summary', auth, async (req, res) => {
  try {
    // Always recalculate so available_balance reflects current approved loans (auto-resets when none)
    await LoanPool.recalculateAvailableBalance();
    const [pool, disbursed, activeLoans, expectedInterest] = await Promise.all([
      LoanPool.getPoolData(),
      LoanPool.getDisbursedAmount(),
      LoanPool.getActiveLoansTotal(),
      LoanPool.getExpectedInterest(),
    ]);

    const summary = {
      total_pool: pool.total_pool,
      amount_disbursed: disbursed,
      available_balance: pool.available_balance,
      total_interest_collected: pool.total_interest_collected,
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
router.get('/dashboard', auth, async (req, res) => {
  try {
    // Always recalculate so available_balance reflects current approved loans (auto-resets when none)
    await LoanPool.recalculateAvailableBalance();
    const [pool, pendingLoans, expectedInterest] = await Promise.all([
      LoanPool.getPoolData(),
      LoanApplication.getByStatus('pending'),
      LoanPool.getExpectedInterest(),
    ]);

    const dashboard = {
      available_balance: pool.available_balance,
      total_pool: pool.total_pool,
      total_interest_collected: pool.total_interest_collected,
      pending_count: pendingLoans.length,
      expected_interest: expectedInterest,
    };

    res.json({ dashboard });
  } catch (error) {
    console.error('Get pool dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
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

// PUT /api/pool/interest — set interest collected directly (admin only)
router.put('/interest', adminAuth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount === undefined || isNaN(parseFloat(amount)) || parseFloat(amount) < 0) {
      return res.status(400).json({ error: 'A valid non-negative amount is required' });
    }
    await LoanPool.setInterestCollected(parseFloat(amount));
    const pool = await LoanPool.getPoolData();
    res.json({ message: 'Interest collected updated', pool });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update interest collected' });
  }
});

// DELETE /api/pool/interest — reset interest collected to zero (admin only)
router.delete('/interest', adminAuth, async (req, res) => {
  try {
    await LoanPool.setInterestCollected(0);
    const pool = await LoanPool.getPoolData();
    res.json({ message: 'Interest collected reset to zero', pool });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset interest' });
  }
});

// POST /api/pool/transfer-interest — move interest into available balance and reset (admin only)
router.post('/transfer-interest', adminAuth, async (req, res) => {
  try {
    const pool = await LoanPool.getPoolData();
    if (pool.total_interest_collected <= 0) {
      return res.status(400).json({ error: 'No interest collected to transfer' });
    }
    const transferred = pool.total_interest_collected;
    await LoanPool.transferInterestToBalance();
    await LoanPool.recalculateAvailableBalance();
    const updatedPool = await LoanPool.getPoolData();
    res.json({ message: `Transferred ${transferred} to available balance`, pool: updatedPool });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transfer interest' });
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