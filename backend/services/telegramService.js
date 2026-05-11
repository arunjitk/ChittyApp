'use strict';

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

// Core send function. Never throws — errors are logged and swallowed
// so a Telegram outage never breaks an API response.
function sendMessage(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[TelegramService] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Skipping.');
    return Promise.resolve(null);
  }

  const body = JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: 'HTML',
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.ok) {
              console.error('[TelegramService] API error:', parsed.description);
            }
            resolve(parsed);
          } catch {
            resolve(null);
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('[TelegramService] Request failed:', err.message);
      resolve(null);
    });

    req.write(body);
    req.end();
  });
}

function nowIST() {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────
//  Exported notification functions
// ─────────────────────────────────────────────

function notifyNewUserRegistration(user) {
  const msg =
    `👤 <b>New User Registration</b>\n\n` +
    `<b>Name:</b> ${escapeHtml(user.name)}\n` +
    `<b>Email:</b> <code>${escapeHtml(user.email)}</code>\n` +
    `<b>User ID:</b> #${user.id}\n` +
    `<b>Status:</b> Pending Approval ⏳\n` +
    `<b>Time:</b> ${nowIST()}\n\n` +
    `➡️ <i>Go to Admin → Manage Users to approve or reject.</i>`;
  return sendMessage(msg);
}

function notifyLoanApplication(user, loan) {
  const msg =
    `💰 <b>New Loan Application</b>\n\n` +
    `<b>Applicant:</b> ${escapeHtml(user.name)}\n` +
    `<b>Email:</b> <code>${escapeHtml(user.email)}</code>\n` +
    `<b>Loan ID:</b> #${loan.id}\n` +
    `<b>Amount Requested:</b> ${formatINR(loan.amount)}\n` +
    `<b>Purpose:</b> ${escapeHtml(loan.purpose) || 'Not specified'}\n` +
    `<b>Repayment Date:</b> ${escapeHtml(loan.repayment_date)}\n` +
    `<b>Interest:</b> ${formatINR(loan.interest_amount)}\n` +
    `<b>Total Due:</b> ${formatINR(loan.total_due)}\n` +
    `<b>Time:</b> ${nowIST()}\n\n` +
    `➡️ <i>Go to Admin → Loans to review.</i>`;
  return sendMessage(msg);
}

function notifyLoanSwapRequest(requester, originalOwner, loan) {
  const msg =
    `🔄 <b>Loan Swap Request</b>\n\n` +
    `<b>Requested By:</b> ${escapeHtml(requester.name)} (<code>${escapeHtml(requester.email)}</code>)\n` +
    `<b>Original Owner:</b> ${escapeHtml(originalOwner.name)}\n` +
    `<b>Loan ID:</b> #${loan.id}\n` +
    `<b>Loan Amount:</b> ${formatINR(loan.amount)}\n` +
    `<b>Current Status:</b> ${escapeHtml(loan.status)}\n` +
    `<b>Time:</b> ${nowIST()}\n\n` +
    `➡️ <i>Awaiting original owner approval, then admin review.</i>`;
  return sendMessage(msg);
}

function notifyUserLogin(user) {
  const msg =
    `🔐 <b>User Login</b>\n\n` +
    `<b>Name:</b> ${escapeHtml(user.name)}\n` +
    `<b>Email:</b> <code>${escapeHtml(user.email)}</code>\n` +
    `<b>Role:</b> ${escapeHtml(user.role)}\n` +
    `<b>User ID:</b> #${user.id}\n` +
    `<b>Time:</b> ${nowIST()}`;
  return sendMessage(msg);
}

module.exports = {
  notifyNewUserRegistration,
  notifyLoanApplication,
  notifyLoanSwapRequest,
  notifyUserLogin,
};
