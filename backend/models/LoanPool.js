const { pool } = require('../config/database');

class LoanPool {
  static async getPoolData() {
    const { rows } = await pool.query('SELECT * FROM loan_pool WHERE id = 1');
    return rows[0];
  }

  static async updateAvailableBalance(newBalance) {
    const result = await pool.query(
      'UPDATE loan_pool SET available_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [newBalance]
    );
    return { changes: result.rowCount };
  }

  static async addInterestCollected(interestAmount) {
    const result = await pool.query(
      'UPDATE loan_pool SET total_interest_collected = total_interest_collected + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [interestAmount]
    );
    return { changes: result.rowCount };
  }

  static async addInterestToPool(interestAmount) {
    const result = await pool.query(
      `UPDATE loan_pool
       SET available_balance = available_balance + $1,
           total_interest_collected = total_interest_collected + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [interestAmount]
    );
    return { changes: result.rowCount };
  }

  static async getDisbursedAmount() {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as disbursed
       FROM loan_applications WHERE status = 'approved'`
    );
    return parseFloat(rows[0].disbursed);
  }

  static async addToPool(amount) {
    const result = await pool.query(
      'UPDATE loan_pool SET total_pool = total_pool + $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [amount]
    );
    return { changes: result.rowCount };
  }

  static async getExpectedInterest() {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(interest_amount), 0) as expected_interest
       FROM loan_applications WHERE status = 'approved'`
    );
    return parseFloat(rows[0].expected_interest);
  }

  static async recalculateAvailableBalance() {
    const result = await pool.query(
      `UPDATE loan_pool
       SET available_balance = total_pool - (
         SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'approved'
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    );
    return { changes: result.rowCount };
  }

  static async setAvailableBalance(amount) {
    const result = await pool.query(
      'UPDATE loan_pool SET available_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [amount]
    );
    return { changes: result.rowCount };
  }

  static async setInterestCollected(amount) {
    const result = await pool.query(
      'UPDATE loan_pool SET total_interest_collected = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [amount]
    );
    return { changes: result.rowCount };
  }

  static async transferInterestToBalance() {
    const result = await pool.query(
      `UPDATE loan_pool
       SET total_pool = total_pool + total_interest_collected,
           total_interest_collected = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`
    );
    return { changes: result.rowCount };
  }

  static async getActiveLoansTotal() {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(total_due), 0) as active_total
       FROM loan_applications WHERE status = 'approved'`
    );
    return parseFloat(rows[0].active_total);
  }
}

module.exports = LoanPool;
