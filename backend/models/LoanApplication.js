const { pool } = require('../config/database');

class LoanApplication {
  static async calculateInterest(issueDate, repaymentDate, principalAmount) {
    const issue = new Date(issueDate);
    const repayment = new Date(repaymentDate);

    const diffTime = Math.abs(repayment - issue);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // <= 15 days: 0% interest
    if (diffDays <= 15) return 0;

    // ceil((days - 15) / 7) × ₹50
    const daysBeyond15 = diffDays - 15;
    const sevenDayBlocks = Math.ceil(daysBeyond15 / 7);
    return sevenDayBlocks * 50;
  }

  static async create(loanData) {
    const { user_id, amount, purpose, repayment_date } = loanData;

    const interest_amount = await this.calculateInterest(new Date(), repayment_date, amount);
    const total_due = amount + interest_amount;

    const { rows } = await pool.query(
      `INSERT INTO loan_applications (user_id, amount, purpose, repayment_date, interest_amount, total_due, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
      [user_id, amount, purpose, repayment_date, interest_amount, total_due]
    );
    return { id: rows[0].id, user_id, amount, purpose, repayment_date, interest_amount, total_due, status: 'pending' };
  }

  static async findById(id) {
    const { rows } = await pool.query(
      `SELECT la.*, u.name as user_name, u.email as user_email
       FROM loan_applications la
       JOIN users u ON la.user_id = u.id
       WHERE la.id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByUserId(userId) {
    const { rows } = await pool.query(
      `SELECT la.*, u.name as user_name, u.email as user_email
       FROM loan_applications la
       JOIN users u ON la.user_id = u.id
       WHERE la.user_id = $1
       ORDER BY la.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getAll() {
    const { rows } = await pool.query(
      `SELECT la.*, u.name as user_name, u.email as user_email
       FROM loan_applications la
       JOIN users u ON la.user_id = u.id
       ORDER BY la.created_at DESC`
    );
    return rows;
  }

  static async getByStatus(status) {
    const { rows } = await pool.query(
      `SELECT la.*, u.name as user_name, u.email as user_email, u.phone as user_phone
       FROM loan_applications la
       JOIN users u ON la.user_id = u.id
       WHERE la.status = $1
       ORDER BY la.created_at DESC`,
      [status]
    );
    return rows;
  }

  static async approve(id, adminNotes = '', approvedDate = null, screenshotPath = null) {
    const approvedOn = approvedDate ? new Date(approvedDate + 'T00:00:00.000Z') : new Date();
    const result = await pool.query(
      `UPDATE loan_applications
       SET status = 'approved', admin_notes = $1, approved_on = $3,
           approval_screenshot_path = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'`,
      [adminNotes, id, approvedOn, screenshotPath]
    );
    return { changes: result.rowCount };
  }

  static async reject(id, adminNotes, rejectedOn = null) {
    const rejDate = rejectedOn ? new Date(rejectedOn + 'T00:00:00.000Z') : new Date();
    const result = await pool.query(
      `UPDATE loan_applications
       SET status = 'rejected', admin_notes = $1, rejected_on = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'`,
      [adminNotes, id, rejDate]
    );
    return { changes: result.rowCount };
  }

  static async close(id) {
    const result = await pool.query(
      `UPDATE loan_applications
       SET status = 'closed', closed_on = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'approved'`,
      [id]
    );
    return { changes: result.rowCount };
  }

  static async foreclose(id, adminNotes = '') {
    const result = await pool.query(
      `UPDATE loan_applications
       SET status = 'foreclosed', admin_notes = $1, foreclosed_on = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'approved'`,
      [adminNotes, id]
    );
    return { changes: result.rowCount };
  }

  static async update(id, updateData) {
    const { amount, purpose, repayment_date } = updateData;

    let interest_amount, total_due;
    if (amount || repayment_date) {
      const loan = await this.findById(id);
      interest_amount = await this.calculateInterest(
        loan.applied_on,
        repayment_date || loan.repayment_date,
        amount || loan.amount
      );
      total_due = (amount || loan.amount) + interest_amount;
    }

    const fields = [];
    const values = [];
    let p = 1;

    if (amount)          { fields.push(`amount = $${p++}`);          values.push(amount); }
    if (purpose)         { fields.push(`purpose = $${p++}`);         values.push(purpose); }
    if (repayment_date)  { fields.push(`repayment_date = $${p++}`);  values.push(repayment_date); }
    if (interest_amount !== undefined && total_due !== undefined) {
      fields.push(`interest_amount = $${p++}`);
      fields.push(`total_due = $${p++}`);
      values.push(interest_amount, total_due);
    }

    if (fields.length === 0) return { changes: 0 };

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE loan_applications SET ${fields.join(', ')} WHERE id = $${p}`,
      values
    );
    return { changes: result.rowCount };
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM loan_applications WHERE id = $1', [id]);
    return { changes: result.rowCount };
  }
}

module.exports = LoanApplication;
