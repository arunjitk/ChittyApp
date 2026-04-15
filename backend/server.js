const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
require('dotenv').config();
const { initializeDatabase, pool } = require('./config/database');

// ── Crash guards ────────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', new Date().toISOString(), err);
  // Keep running — log but don't exit
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', new Date().toISOString(), reason);
  // Keep running — log but don't exit
});

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ─────────────────────────────────────────────────────
app.use(helmet());

// ── Rate limiting ───────────────────────────────────────────────────────────
// Tight limit on auth only (brute-force protection),
// generous limit on general API so normal usage never trips it.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow both the desktop localhost origin and the LAN IP origin (for mobile
// testing). Add more origins to the array as needed.
const allowedOrigins = [
  process.env.FRONTEND_URL        || 'http://localhost:3001',
  process.env.FRONTEND_URL_MOBILE,   // e.g. http://192.168.x.x:3001
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static uploads ──────────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/loans',    apiLimiter,  require('./routes/loans'));
app.use('/api/users',    apiLimiter,  require('./routes/users'));
app.use('/api/pool',     apiLimiter,  require('./routes/pool'));
app.use('/api/chitty',   apiLimiter,  require('./routes/chitty'));
app.use('/api/admin/db', apiLimiter,  require('./routes/admin-db'));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'ERROR', db: 'disconnected', error: err.message });
  }
});

// ── Error handling ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[express-error]', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Server startup ──────────────────────────────────────────────────────────
async function startServer() {
  await initializeDatabase();

  const server = http.createServer(app);

  // ── HTTP timeout tuning ─────────────────────────────────────────────────
  //
  // Problem: Node.js default keepAliveTimeout is 5 s.  Any HTTP keep-alive
  // connection that is idle for 5 s gets silently dropped by the server.
  // The frontend (or a proxy) may try to reuse that connection a moment later
  // and gets a connection-reset error — looks like a random "server disconnect".
  //
  // Fix: keep connections alive for 65 s.  headersTimeout must exceed
  // keepAliveTimeout so Node doesn't race with itself.
  //
  server.keepAliveTimeout = 65_000;   // 65 s  (was 5 s default)
  server.headersTimeout   = 70_000;   // must be > keepAliveTimeout
  server.requestTimeout   = 120_000;  // 2 min max per request; prevents hung connections
  server.timeout          = 120_000;  // socket inactivity timeout (same ceiling)

  server.listen(PORT, () => {
    console.log(`[server] running on port ${PORT}`);
    console.log(`[server] keepAliveTimeout=${server.keepAliveTimeout}ms  headersTimeout=${server.headersTimeout}ms`);
  });

  server.on('error', (err) => {
    console.error('[server] error:', err.message);
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────
  //
  // On SIGTERM / SIGINT: stop accepting new connections, let in-flight
  // requests finish (up to 10 s), then exit cleanly.  Without this, a
  // nodemon restart or Ctrl-C kills the process mid-request, which drops
  // whatever the frontend was waiting for and can corrupt multi-step DB
  // transactions.
  //
  let shuttingDown = false;

  async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] ${signal} received — shutting down gracefully…`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('[server] HTTP server closed');
      try {
        await pool.end();
        console.log('[pool] all connections released');
      } catch (err) {
        console.error('[pool] error during shutdown:', err.message);
      }
      process.exit(0);
    });

    // Force-exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('[server] graceful shutdown timed out — forcing exit');
      process.exit(1);
    }, 10_000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
