const { pool } = require('../config/database');

class ChittyGroup {
  static async get() {
    const { rows } = await pool.query('SELECT * FROM chitty_group WHERE id = 1');
    return rows[0];
  }

  static async update(fields) {
    const allowed = [
      'name', 'chitty_amount', 'payout_day', 'subscription_deadline_day',
      'current_month', 'start_year', 'start_month', 'upi_id',
      'account_number', 'ifsc_code', 'penalty_amount',
    ];
    const updates = [];
    const values = [];
    let p = 1;
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${p++}`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1);
    const result = await pool.query(
      `UPDATE chitty_group SET ${updates.join(', ')} WHERE id = $${p}`,
      values
    );
    return result.rowCount;
  }
}

module.exports = ChittyGroup;
