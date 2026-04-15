const { pool } = require('../config/database');

class UserChitty {
  static async getAll() {
    const { rows } = await pool.query('SELECT * FROM user_chitty ORDER BY member_index');
    return rows;
  }

  static async findById(id) {
    const { rows } = await pool.query('SELECT * FROM user_chitty WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findByUserId(userId) {
    const { rows } = await pool.query('SELECT * FROM user_chitty WHERE user_id = $1', [userId]);
    return rows[0] || null;
  }

  static async update(id, fields) {
    const allowed = [
      'member_name', 'payout_month', 'penalties_due', 'status',
      'transfer_requested', 'transfer_approved', 'paid_month', 'user_id',
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
    values.push(id);
    const result = await pool.query(
      `UPDATE user_chitty SET ${updates.join(', ')} WHERE id = $${p}`,
      values
    );
    return result.rowCount;
  }

  static async swapMonths(id1, id2) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: r1 } = await client.query('SELECT payout_month FROM user_chitty WHERE id = $1', [id1]);
      const { rows: r2 } = await client.query('SELECT payout_month FROM user_chitty WHERE id = $1', [id2]);
      if (!r1[0] || !r2[0]) throw new Error('Member not found');
      await client.query(
        'UPDATE user_chitty SET payout_month = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [r2[0].payout_month, id1]
      );
      await client.query(
        'UPDATE user_chitty SET payout_month = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [r1[0].payout_month, id2]
      );
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = UserChitty;
