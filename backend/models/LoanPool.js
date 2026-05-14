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

  // ──────────────────────────────────────────────────────────────────
  //  Interest collections tracker
  //
  //  The `interest_collections` table is the source of truth for the
  //  "Interest Collected" figure on the admin dashboard. Each loan closure
  //  or foreclosure inserts a row; admin override actions insert signed
  //  adjustment rows so the running SUM always matches what the admin
  //  intends to display.
  // ──────────────────────────────────────────────────────────────────

  // Running total of all collections + adjustments. Drives the dashboard.
  static async getInterestCollectedTotal(client = pool) {
    const { rows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM interest_collections`
    );
    return parseFloat(rows[0].total);
  }

  // Insert one tracker row. `loanId` / `userId` may be null for adjustment-style rows.
  // Accepts an optional pg client so callers can run this inside a transaction.
  static async addInterestCollection({ loanId = null, userId = null, amount, source, notes = null, collectedOn = null }, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO interest_collections (loan_id, user_id, amount, source, notes, collected_on)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
       RETURNING *`,
      [loanId, userId, amount, source, notes, collectedOn]
    );
    return rows[0];
  }

  // List collections with user + loan info for the admin history viewer.
  // Newest first, capped at `limit` rows (default 100).
  static async listInterestCollections({ limit = 100, offset = 0 } = {}) {
    const { rows } = await pool.query(
      `SELECT ic.id, ic.loan_id, ic.user_id, ic.amount, ic.source,
              ic.collected_on, ic.notes, ic.created_at,
              u.name AS user_name, u.email AS user_email,
              la.amount AS loan_amount, la.status AS loan_status
       FROM interest_collections ic
       LEFT JOIN users u ON u.id = ic.user_id
       LEFT JOIN loan_applications la ON la.id = ic.loan_id
       ORDER BY ic.collected_on DESC, ic.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return rows;
  }

  // Admin: force the running total to `targetAmount` by inserting a signed adjustment.
  // No-op if the running total already matches the target.
  // Returns the inserted row, or null if no row was needed.
  static async adjustInterestCollectedTo(targetAmount, { source = 'adjustment', notes = null } = {}) {
    const current = await this.getInterestCollectedTotal();
    const delta = parseFloat(targetAmount) - current;
    if (delta === 0) return null;
    return this.addInterestCollection({
      amount: delta,
      source,
      notes: notes || `Admin override: total set to ${targetAmount} (was ${current})`,
    });
  }
}

module.exports = LoanPool;
