const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const { name, email, password, role = 'user', phone = null, status = 'active' } = userData;
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, email, password_hash, role, phone, status]
    );
    return { id: rows[0].id, name, email, role, phone, status };
  }

  static async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, phone, avatar_path, is_locked, failed_attempts, locked_at, status, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async validatePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  static async getAll() {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, phone, is_locked, failed_attempts, locked_at, status, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  static async update(id, { name, email, phone }) {
    await pool.query(
      'UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4',
      [name, email, phone || null, id]
    );
    return { id, name, email, phone };
  }

  static async updateAvatar(id, avatarPath) {
    await pool.query('UPDATE users SET avatar_path = $1 WHERE id = $2', [avatarPath, id]);
    return { success: true };
  }

  static async updatePassword(id, newPassword) {
    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, id]);
    return { success: true };
  }

  static async adminUpdate(id, { name, email, role, phone, password }) {
    const fields = ['name = $1', 'email = $2', 'role = $3', 'phone = $4'];
    const values = [name, email, role, phone || null];
    if (password) {
      fields.push(`password_hash = $${fields.length + 1}`);
      values.push(await bcrypt.hash(password, 10));
    }
    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`,
      values
    );
    return { id, name, email, role, phone };
  }

  static async findByEmailExcluding(email, excludeId) {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, excludeId]
    );
    return rows[0] || null;
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return { deleted: result.rowCount > 0 };
  }

  static async setLocked(id, locked) {
    if (locked) {
      await pool.query(
        'UPDATE users SET is_locked = 1, locked_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } else {
      await pool.query(
        'UPDATE users SET is_locked = 0, locked_at = NULL, failed_attempts = 0 WHERE id = $1',
        [id]
      );
    }
    return { success: true };
  }

  static async incrementFailedAttempts(id) {
    await pool.query(
      'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = $1',
      [id]
    );
    return { success: true };
  }

  static async lockIfExceeded(id) {
    const result = await pool.query(
      'UPDATE users SET is_locked = 1, locked_at = CURRENT_TIMESTAMP WHERE id = $1 AND failed_attempts >= 3',
      [id]
    );
    return { locked: result.rowCount > 0 };
  }

  static async resetFailedAttempts(id) {
    await pool.query('UPDATE users SET failed_attempts = 0 WHERE id = $1', [id]);
    return { success: true };
  }

  static async setStatus(id, status) {
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
    return { success: true };
  }
}

module.exports = User;
