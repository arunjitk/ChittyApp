const { pool } = require('../config/database');

// Common SELECT projection — joins both member rows and their linked users so
// the frontend gets human-readable names/emails without extra round-trips.
const BASE_SELECT = `
  SELECT
    csr.id,
    csr.requester_member_id,
    csr.target_member_id,
    csr.reason,
    csr.status,
    csr.admin_notes,
    csr.decided_at,
    csr.decided_by,
    csr.created_at,
    csr.updated_at,
    rm.member_name        AS requester_member_name,
    rm.payout_month       AS requester_payout_month,
    rm.user_id            AS requester_user_id,
    ru.name               AS requester_user_name,
    ru.email              AS requester_user_email,
    tm.member_name        AS target_member_name,
    tm.payout_month       AS target_payout_month,
    tm.user_id            AS target_user_id,
    tu.name               AS target_user_name,
    tu.email              AS target_user_email,
    du.name               AS decided_by_name
  FROM chitty_swap_requests csr
  JOIN user_chitty rm ON rm.id = csr.requester_member_id
  JOIN user_chitty tm ON tm.id = csr.target_member_id
  LEFT JOIN users ru   ON ru.id = rm.user_id
  LEFT JOIN users tu   ON tu.id = tm.user_id
  LEFT JOIN users du   ON du.id = csr.decided_by
`;

class ChittySwapRequest {
  static async create({ requesterMemberId, targetMemberId, reason }) {
    const { rows } = await pool.query(
      `INSERT INTO chitty_swap_requests (requester_member_id, target_member_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [requesterMemberId, targetMemberId, reason || null]
    );
    return this.findById(rows[0].id);
  }

  static async findById(id) {
    const { rows } = await pool.query(`${BASE_SELECT} WHERE csr.id = $1`, [id]);
    return rows[0] || null;
  }

  static async listAll({ status } = {}) {
    let query = BASE_SELECT;
    const params = [];
    if (status) {
      query += ` WHERE csr.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY
                 CASE csr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                 csr.created_at DESC`;
    const { rows } = await pool.query(query, params);
    return rows;
  }

  static async listByRequesterUser(userId) {
    const { rows } = await pool.query(
      `${BASE_SELECT}
       WHERE rm.user_id = $1
       ORDER BY csr.created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Update editable fields. Admin can change requester/target/reason/admin_notes
  // while pending; once decided, only admin_notes can be edited.
  static async update(id, fields) {
    const current = await this.findById(id);
    if (!current) return null;

    const editable = current.status === 'pending'
      ? ['requester_member_id', 'target_member_id', 'reason', 'admin_notes']
      : ['admin_notes'];

    const updates = [];
    const values = [];
    let p = 1;
    for (const key of editable) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = $${p++}`);
        values.push(fields[key]);
      }
    }
    if (updates.length === 0) return current;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    await pool.query(
      `UPDATE chitty_swap_requests SET ${updates.join(', ')} WHERE id = $${p}`,
      values
    );
    return this.findById(id);
  }

  // Atomic approve: flip status + swap payout_month on both member rows.
  // Refuses if the request is not pending.
  static async approveAndSwap(id, { adminId, adminNotes }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Lock the request row and verify state.
      const { rows: reqRows } = await client.query(
        `SELECT id, requester_member_id, target_member_id, status
         FROM chitty_swap_requests WHERE id = $1 FOR UPDATE`,
        [id]
      );
      const req = reqRows[0];
      if (!req) throw new Error('Swap request not found');
      if (req.status !== 'pending') throw new Error(`Cannot approve a request that is already ${req.status}`);

      // Lock both member rows and fetch current payout_month values.
      const { rows: r1 } = await client.query(
        'SELECT payout_month FROM user_chitty WHERE id = $1 FOR UPDATE',
        [req.requester_member_id]
      );
      const { rows: r2 } = await client.query(
        'SELECT payout_month FROM user_chitty WHERE id = $1 FOR UPDATE',
        [req.target_member_id]
      );
      if (!r1[0] || !r2[0]) throw new Error('One of the chitty members no longer exists');

      // Swap the payout months.
      await client.query(
        'UPDATE user_chitty SET payout_month = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [r2[0].payout_month, req.requester_member_id]
      );
      await client.query(
        'UPDATE user_chitty SET payout_month = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [r1[0].payout_month, req.target_member_id]
      );

      // Mark the request as approved.
      await client.query(
        `UPDATE chitty_swap_requests
         SET status = 'approved',
             admin_notes = COALESCE($2, admin_notes),
             decided_at = CURRENT_TIMESTAMP,
             decided_by = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id, adminNotes || null, adminId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return this.findById(id);
  }

  static async reject(id, { adminId, adminNotes }) {
    const current = await this.findById(id);
    if (!current) return null;
    if (current.status !== 'pending') {
      throw new Error(`Cannot reject a request that is already ${current.status}`);
    }
    await pool.query(
      `UPDATE chitty_swap_requests
       SET status = 'rejected',
           admin_notes = COALESCE($2, admin_notes),
           decided_at = CURRENT_TIMESTAMP,
           decided_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, adminNotes || null, adminId]
    );
    return this.findById(id);
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM chitty_swap_requests WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = ChittySwapRequest;
