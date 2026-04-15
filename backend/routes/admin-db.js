const express = require('express');
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Whitelist of allowed tables for safety
const ALLOWED_TABLES = [
  'users',
  'loan_pool',
  'loan_applications',
  'chitty_group',
  'user_chitty',
  'chitty_payments',
  'loan_swap_requests'
];

// Sensitive columns that should never be exposed
const SENSITIVE_COLUMNS = {
  users: ['password_hash']
};

/**
 * Validate and sanitize table name
 */
function validateTableName(tableName) {
  if (!ALLOWED_TABLES.includes(tableName)) {
    throw new Error(`Table '${tableName}' is not allowed`);
  }
  return tableName;
}

/**
 * Strip sensitive columns from result rows
 */
function stripSensitiveColumns(tableName, rows) {
  const sensitiveColumns = SENSITIVE_COLUMNS[tableName] || [];
  if (sensitiveColumns.length === 0) return rows;

  return rows.map(row => {
    const cleaned = { ...row };
    sensitiveColumns.forEach(col => delete cleaned[col]);
    return cleaned;
  });
}

/**
 * GET /api/admin/db/tables
 * List all allowed table names
 */
router.get('/tables', adminAuth, async (req, res) => {
  try {
    const tables = await Promise.all(
      ALLOWED_TABLES.map(async (tableName) => {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        return {
          name: tableName,
          rowCount: parseInt(result.rows[0].count, 10)
        };
      })
    );

    res.json({ tables });
  } catch (error) {
    console.error('List tables error:', error);
    res.status(500).json({ error: 'Failed to fetch table list' });
  }
});

/**
 * GET /api/admin/db/tables/:tableName/schema
 * Get column names, types, and constraints for a table
 */
router.get('/tables/:tableName/schema', adminAuth, async (req, res) => {
  try {
    const tableName = validateTableName(req.params.tableName);

    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        (
          SELECT COUNT(*) > 0 FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
          USING (table_name, table_schema, constraint_name)
          WHERE tc.table_name = t.table_name AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = t.column_name
        ) as is_primary_key
      FROM information_schema.columns t
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    res.json({ schema: result.rows });
  } catch (error) {
    console.error('Get schema error:', error);
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

/**
 * GET /api/admin/db/tables/:tableName
 * Get paginated rows from a table with optional search
 */
router.get('/tables/:tableName', adminAuth, async (req, res) => {
  try {
    const tableName = validateTableName(req.params.tableName);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const search = req.query.search || '';

    const offset = (page - 1) * limit;

    // Get total count
    let countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
    const countParams = [];

    if (search && tableName === 'users') {
      countQuery += ` WHERE name ILIKE $1 OR email ILIKE $1`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Get rows
    let dataQuery = `SELECT * FROM ${tableName}`;
    const dataParams = [];

    if (search && tableName === 'users') {
      dataQuery += ` WHERE name ILIKE $1 OR email ILIKE $1`;
      dataParams.push(`%${search}%`);
    }

    dataQuery += ` LIMIT $${dataParams.length + 1} OFFSET $${dataParams.length + 2}`;
    dataParams.push(limit, offset);

    const dataResult = await pool.query(dataQuery, dataParams);
    const rows = stripSensitiveColumns(tableName, dataResult.rows);

    res.json({
      table: tableName,
      page,
      limit,
      totalCount,
      rows
    });
  } catch (error) {
    console.error('Get rows error:', error);
    res.status(500).json({ error: 'Failed to fetch rows' });
  }
});

/**
 * POST /api/admin/db/tables/:tableName
 * Insert a new row into the table
 */
router.post('/tables/:tableName', adminAuth, async (req, res) => {
  try {
    const tableName = validateTableName(req.params.tableName);
    const data = req.body;

    // Build insert query
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    const row = stripSensitiveColumns(tableName, result.rows)[0];

    res.status(201).json({ message: 'Row inserted', row });
  } catch (error) {
    console.error('Insert row error:', error);
    res.status(500).json({ error: 'Failed to insert row' });
  }
});

/**
 * PUT /api/admin/db/tables/:tableName/:id
 * Update a row by primary key
 */
router.put('/tables/:tableName/:id', adminAuth, async (req, res) => {
  try {
    const tableName = validateTableName(req.params.tableName);
    const id = req.params.id;
    const data = req.body;

    // Prevent password_hash updates
    if (data.password_hash) {
      return res.status(400).json({ error: 'Cannot directly update password_hash' });
    }

    // Build update query
    const updates = Object.entries(data)
      .map(([key], i) => `${key} = $${i + 1}`)
      .join(', ');

    const values = Object.values(data);
    values.push(id);

    const query = `
      UPDATE ${tableName}
      SET ${updates}
      WHERE id = $${values.length}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Row not found' });
    }

    const row = stripSensitiveColumns(tableName, result.rows)[0];
    res.json({ message: 'Row updated', row });
  } catch (error) {
    console.error('Update row error:', error);
    res.status(500).json({ error: 'Failed to update row' });
  }
});

/**
 * DELETE /api/admin/db/tables/:tableName/:id
 * Delete a row by primary key
 */
router.delete('/tables/:tableName/:id', adminAuth, async (req, res) => {
  try {
    const tableName = validateTableName(req.params.tableName);
    const id = req.params.id;

    const query = `DELETE FROM ${tableName} WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Row not found' });
    }

    res.json({ message: 'Row deleted' });
  } catch (error) {
    console.error('Delete row error:', error);
    res.status(500).json({ error: 'Failed to delete row' });
  }
});

/**
 * GET /api/admin/db/credentials
 * Return masked database credentials
 */
router.get('/credentials', adminAuth, async (req, res) => {
  try {
    const credentials = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'chitty_loan_app',
      username: process.env.DB_USER || 'postgres',
      password: '••••••••' // Always masked
    };

    res.json({ credentials });
  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({ error: 'Failed to fetch credentials' });
  }
});

/**
 * PUT /api/admin/db/credentials
 * Update database credentials (requires admin password confirmation)
 */
router.put('/credentials', adminAuth, async (req, res) => {
  try {
    const { adminPassword, newUsername, newPassword } = req.body;

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password confirmation required' });
    }

    const user = req.user;
    const passwordValid = await bcrypt.compare(adminPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Validate input
    if (!newUsername || typeof newUsername !== 'string' || newUsername.trim() === '') {
      return res.status(400).json({ error: 'Valid username required' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Test connection with new credentials before updating
    const { Pool } = require('pg');
    const testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chitty_loan_app',
      user: newUsername,
      password: newPassword,
      connectionTimeoutMillis: 5000
    });

    try {
      await testPool.query('SELECT 1');
      await testPool.end();
    } catch (testError) {
      return res.status(400).json({ error: 'Failed to connect with new credentials' });
    }

    // Update .env file
    const fs = require('fs');
    let envContent = fs.readFileSync('/Users/n50/Documents/Code-Project/ChittyLoanApp/backend/.env', 'utf8');

    envContent = envContent.replace(
      /DB_USER=.*/,
      `DB_USER=${newUsername}`
    );
    envContent = envContent.replace(
      /DB_PASSWORD=.*/,
      `DB_PASSWORD=${newPassword}`
    );

    fs.writeFileSync('/Users/n50/Documents/Code-Project/ChittyLoanApp/backend/.env', envContent);

    // Update environment variables
    process.env.DB_USER = newUsername;
    process.env.DB_PASSWORD = newPassword;

    // Reconnect pool with new credentials
    const newPoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'chitty_loan_app',
      user: newUsername,
      password: newPassword,
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };

    // Note: In production, you'd need to drain the old pool and recreate it
    // For now, just update the credentials in the env

    res.json({ message: 'Database credentials updated successfully' });
  } catch (error) {
    console.error('Update credentials error:', error);
    res.status(500).json({ error: 'Failed to update credentials' });
  }
});

/**
 * DELETE /api/admin/db/credentials/password
 * Reset password to default (requires admin password confirmation)
 */
router.delete('/credentials/password', adminAuth, async (req, res) => {
  try {
    const { adminPassword } = req.body;

    // Verify admin password
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password confirmation required' });
    }

    const user = req.user;
    const passwordValid = await bcrypt.compare(adminPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    const defaultPassword = process.env.DB_DEFAULT_PASSWORD || '';

    // Update .env file
    const fs = require('fs');
    let envContent = fs.readFileSync('/Users/n50/Documents/Code-Project/ChittyLoanApp/backend/.env', 'utf8');

    envContent = envContent.replace(
      /DB_PASSWORD=.*/,
      `DB_PASSWORD=${defaultPassword}`
    );

    fs.writeFileSync('/Users/n50/Documents/Code-Project/ChittyLoanApp/backend/.env', envContent);

    // Update environment variable
    process.env.DB_PASSWORD = defaultPassword;

    res.json({ message: 'Database password reset to default' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
