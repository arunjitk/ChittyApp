const { Pool } = require('pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

// Return NUMERIC columns as JS numbers instead of strings
pg.types.setTypeParser(1700, (val) => parseFloat(val));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'chitty_loan_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  // Keep idle connections open for 10 minutes instead of 60 seconds.
  // The old 60s value caused the pool to churn — all connections were dropped
  // every minute, and the next request had to re-establish from scratch.
  idleTimeoutMillis: 600000,
  // Allow 10 s to acquire a connection before returning an error.
  connectionTimeoutMillis: 10000,
  // TCP keepalive: start probing after 5 s of inactivity so the OS never
  // silently kills a socket before the pool has a chance to notice.
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
});

pool.on('error', (err) => {
  // A client in the pool emitted an error (e.g. PostgreSQL restarted, network
  // blip). Log it — the pool will remove the bad client automatically and
  // create a fresh one on the next request.
  console.error('[pool] idle client error:', err.message, err.code);
});

pool.on('connect', () => {
  console.log('[pool] new client connected');
});

pool.on('remove', () => {
  console.log('[pool] client removed');
});

// Lightweight keepalive ping — runs every 4 minutes so the pool always has at
// least one proven-live connection and the OS never tears down all sockets
// between requests during quiet periods.
setInterval(async () => {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    console.error('[pool] keepalive ping failed:', err.message);
  }
}, 4 * 60 * 1000);

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        phone TEXT,
        is_locked INTEGER NOT NULL DEFAULT 0,
        failed_attempts INTEGER NOT NULL DEFAULT 0,
        locked_at TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'active',
        avatar_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Loan pool
    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_pool (
        id SERIAL PRIMARY KEY,
        total_pool NUMERIC(15,2) NOT NULL DEFAULT 72000,
        available_balance NUMERIC(15,2) NOT NULL DEFAULT 72000,
        total_interest_collected NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Loan applications
    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_applications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(15,2) NOT NULL,
        purpose TEXT,
        applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        repayment_date DATE NOT NULL,
        interest_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_due NUMERIC(15,2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        approved_on TIMESTAMP,
        closed_on TIMESTAMP,
        foreclosed_on TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chitty group
    await client.query(`
      CREATE TABLE IF NOT EXISTS chitty_group (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '2025-2026 Chitty',
        total_members INTEGER NOT NULL DEFAULT 12,
        chitty_amount NUMERIC(15,2) NOT NULL DEFAULT 6000,
        payout_day INTEGER NOT NULL DEFAULT 8,
        subscription_deadline_day INTEGER NOT NULL DEFAULT 6,
        current_month INTEGER NOT NULL DEFAULT 1,
        start_year INTEGER NOT NULL DEFAULT 2025,
        start_month INTEGER NOT NULL DEFAULT 1,
        upi_id TEXT NOT NULL DEFAULT 'arunjitk@fifederal',
        account_number TEXT NOT NULL DEFAULT '55550101552238',
        ifsc_code TEXT NOT NULL DEFAULT 'FDRL0005555',
        penalty_amount NUMERIC(15,2) NOT NULL DEFAULT 50,
        monthly_chitty_amount NUMERIC(15,2) NOT NULL DEFAULT 6000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User chitty members
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_chitty (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        member_name TEXT NOT NULL,
        member_index INTEGER NOT NULL,
        payout_month INTEGER NOT NULL,
        penalties_due NUMERIC(15,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        transfer_requested INTEGER NOT NULL DEFAULT 0,
        transfer_approved INTEGER NOT NULL DEFAULT 0,
        paid_month INTEGER,
        monthly_chitty_amount NUMERIC(15,2) NOT NULL DEFAULT 6000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chitty payments
    await client.query(`
      CREATE TABLE IF NOT EXISTS chitty_payments (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES user_chitty(id),
        month INTEGER NOT NULL,
        phone TEXT,
        upi_id TEXT,
        screenshot_path TEXT,
        notes TEXT,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(member_id, month)
      )
    `);

    // Loan swap requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS loan_swap_requests (
        id SERIAL PRIMARY KEY,
        loan_id INTEGER NOT NULL REFERENCES loan_applications(id),
        requester_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'pending_owner',
        owner_approved_at TIMESTAMP,
        admin_approved_at TIMESTAMP,
        original_owner_id INTEGER REFERENCES users(id),
        original_status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate: add original_status column if this table already exists
    await client.query(`
      ALTER TABLE loan_swap_requests ADD COLUMN IF NOT EXISTS original_status TEXT
    `);

    // Migrate: add payment receipt columns to loan_applications
    await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS screenshot_path TEXT`);
    await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS payment_received_date DATE`);
    // Migrate: add approval screenshot + rejection date columns
    await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS approval_screenshot_path TEXT`);
    await client.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejected_on TIMESTAMP`);

    // Partial unique index: prevent duplicate active swap requests per loan per requester
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_swap_requests_active_unique
      ON loan_swap_requests(loan_id, requester_id)
      WHERE status IN ('pending_owner', 'pending_admin')
    `);

    // Seed loan_pool row
    await client.query(`
      INSERT INTO loan_pool (id, total_pool, available_balance, total_interest_collected)
      VALUES (1, 72000, 72000, 0)
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed chitty_group row
    await client.query(`
      INSERT INTO chitty_group (id, name, total_members, chitty_amount, payout_day,
        subscription_deadline_day, current_month, start_year, start_month, upi_id,
        account_number, ifsc_code, penalty_amount, monthly_chitty_amount)
      VALUES (1, '2025-2026 Chitty', 12, 6000, 8, 6, 1, 2025, 6,
        'arunjitk@fifederal', '55550101552238', 'FDRL0005555', 50, 6000)
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed 12 chitty members
    const members = [
      'Arunjit K', 'Vishnu', 'Anusree', 'Neethu', 'Sidharth B',
      'Sabith', 'Sai', 'Kodu', 'Don', 'Maya', 'Sarath', 'Midhun PV'
    ];
    for (let i = 0; i < members.length; i++) {
      await client.query(
        `INSERT INTO user_chitty (id, member_name, member_index, payout_month, penalties_due, status, monthly_chitty_amount)
         VALUES ($1, $2, $3, $4, 0, 'active', 6000)
         ON CONFLICT (id) DO NOTHING`,
        [i + 1, members[i], i + 1, i + 1]
      );
    }

    // Seed default admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Administrator', 'admin@loantracker.com', $1, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [passwordHash]
    );

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
