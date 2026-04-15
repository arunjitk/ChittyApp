# Security Testing Report: ChittyLoanApp

**Date:** April 15, 2026  
**Application:** ChittyLoanApp - Chitty Fund & Loan Management System  
**Scope:** Backend (Express.js/PostgreSQL) + Frontend (React)

---

## Executive Summary

This report documents security vulnerabilities identified in the ChittyLoanApp. The application has several good security practices (parameterized SQL queries, bcrypt hashing, JWT authentication, helmet, rate limiting). However, **14 security issues** were identified requiring attention.

| Risk Level | Count |
|------------|-------|
| Critical   | 2     |
| High       | 5     |
| Medium     | 5     |
| Low        | 2     |

---

## Findings

---

### 1. CRITICAL: Hardcoded Default Admin Credentials

| Attribute | Details |
|-----------|---------|
| **File** | `backend/config/database.js:183-189` |
| **Description** | Default admin account seeded with hardcoded password "admin123" |
| **Risk** | Attackers with database access can retrieve password hash |
| **Evidence** | ```javascript
const passwordHash = await bcrypt.hash('admin123', 10);
await client.query(`INSERT INTO users...`, [passwordHash]);
``` |

**Fix:**
```javascript
// Use environment variable for admin password
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.warn('WARNING: No ADMIN_PASSWORD set - admin account not created');
} else {
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  // ... insert admin
}
```

---

### 2. CRITICAL: Missing Input Sanitization on Loan Update

| Attribute | Details |
|-----------|---------|
| **File** | `backend/routes/loans.js:579-595` |
| **Description** | Admin can update any loan field directly without validation |
| **Risk** | Admin could set invalid amounts, manipulate dates, inject data |
| **Evidence** | ```javascript
const updateData = req.body;
await LoanApplication.update(loanId, updateData);
``` |

**Fix:**
```javascript
const allowedFields = ['amount', 'purpose', 'repayment_date', 'admin_notes'];
const updateData = {};
for (const key of allowedFields) {
  if (req.body[key] !== undefined) updateData[key] = req.body[key];
}
// Validate each field
if (updateData.amount && (updateData.amount <= 0 || updateData.amount > MAX_LOAN_AMOUNT)) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

---

### 3. HIGH: Weak Password Policy (6 chars)

| Attribute | Details |
|-----------|---------|
| **Files** | `backend/routes/users.js:76-77, 97-98, 124-125` |
| **Description** | Passwords require minimum 6 characters only |
| **Risk** | Easily bruteforced passwords |
| **Evidence** | `if (!new_password || new_password.length < 6)` |

**Fix:**
```javascript
// Require minimum 8 characters with complexity
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
if (!passwordRegex.test(new_password)) {
  return res.status(400).json({ 
    error: 'Password must be 8+ chars with uppercase, lowercase, number, and special char'
  });
}
```

---

### 4. HIGH: Registration Not Rate Limited

| Attribute | Details |
|-----------|---------|
| **File** | `backend/server.js:26-30` |
| **Description** | Registration endpoint uses generic rate limiter (100 req/15min) |
| **Risk** | Mass account creation attacks |
| **Evidence** | Global limiter applies to all /api/auth routes |

**Fix:**
```javascript
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per IP per hour
  message: { error: 'Too many accounts created. Try again later.' }
});
app.use('/api/auth/register', registerLimiter);
```

---

### 5. HIGH: IDOR in User Deletion

| Attribute | Details |
|-----------|---------|
| **File** | `backend/routes/users.js:146-177` |
| **Description** | Any admin can delete any other admin account |
| **Risk** | Malicious admin can remove other admins |
| **Evidence** | Only checks `if (userId === req.user.id)` |

**Fix:**
```javascript
// Prevent deletion of other admins
const targetUser = await User.findById(userId);
if (targetUser.role === 'admin' && targetUser.id !== req.user.id) {
  return res.status(403).json({ error: 'Cannot delete other admin accounts' });
}
```

---

### 6. HIGH: No Email Verification

| Attribute | Details |
|-----------|---------|
| **File** | `backend/routes/auth.js:8-32` |
| **Description** | Users register and wait for admin approval, but no email verification |
| **Risk** | Fake emails, spam accounts |
| **Evidence** | Registration creates `status: 'pending'` user |

**Fix:** Implement email verification token system before admin approval workflow.

---

### 7. HIGH: JWT Secret in Code

| Attribute | Details |
|-----------|---------|
| **File** | `backend/.env:2` |
| **Description** | JWT secret is a predictable default string |
| **Risk** | If .env exposed, attackers can forge tokens |
| **Evidence** | `JWT_SECRET=your-super-secret-jwt-key-change-in-production` |

**Fix:**
```bash
# Generate strong random secret
openssl rand -base64 32
```

```javascript
// Validate at startup
if (process.env.JWT_SECRET.includes('change-in-production')) {
  throw new Error('JWT_SECRET must be changed in production');
}
```

---

### 8. MEDIUM: Information Leakage in Loan Swap

| Attribute | Details |
|-----------|---------|
| **File** | `backend/routes/loans.js:150-181` |
| **Description** | Pending loans expose user email and phone to all authenticated users |
| **Risk** | Privacy violation, user data exposed |
| **Evidence** | ```javascript
user_email: loan.user_email,
user_phone: loan.user_phone,
``` |

**Fix:** Remove sensitive fields from public pending loans endpoint.

---

### 9. MEDIUM: Missing CSRF Protection

| Attribute | Details |
|-----------|---------|
| **Files** | All API endpoints |
| **Description** | No CSRF tokens implemented |
| **Risk** | Cross-site request forgery attacks |

**Fix:** Implement CSRF tokens with `csurf` or same-site cookie flag on JWT.

---

### 10. MEDIUM: No Audit Logging

| Attribute | Details |
|-----------|---------|
| **Files** | All admin endpoints |
| **Description** | No logging of admin actions |
| **Risk** | No accountability for admin actions |

**Fix:** Create audit log table and log all sensitive operations.

---

### 11. MEDIUM: File Upload Path Traversal Risk

| Attribute | Details |
|-----------|---------|
| **File** | `backend/routes/users.js:9-24` |
| **Description** | Avatar upload uses random filename but path not validated |
| **Risk** | Potential path traversal if filename manipulated |

**Fix:** Already using random filename - this is mitigated. Add Content-Disposition header check.

---

### 12. MEDIUM: Missing Request Body Size Limit

| Attribute | Details |
|-----------|---------|
| **File** | `backend/server.js:39-40` |
| **Description** | No explicit body size limit |
| **Risk** | DoS via large payload |

**Fix:**
```javascript
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
```

---

### 13. LOW: No Account Recovery Mechanism

| Attribute | Details |
|-----------|---------|
| **Files** | All auth routes |
| **Description** | No password reset functionality |
| **Risk** | Users locked out if they forget password |

**Fix:** Implement email-based password reset.

---

### 14. LOW: Missing Security Headers

| Attribute | Details |
|-----------|---------|
| **File** | `backend/server.js:22-23` |
| **Description** | Helmet used but missing some headers |
| **Risk** | XSS, clickjacking vulnerabilities |

**Fix:**
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

---

## Recommended Priority

| Priority | Issues |
|----------|--------|
| **Immediate** | #1 Hardcoded credentials, #2 Missing input validation |
| **High** | #3 Password policy, #4 Rate limiting, #5 IDOR, #7 JWT secret |
| **Medium** | #8-12 |
| **Low** | #13-14 |

---

## Good Security Practices Already Present

- Parameterized SQL queries (no SQL injection)
- bcrypt password hashing
- JWT authentication with expiration
- Role-based middleware (auth, adminAuth)
- Rate limiting on global endpoints
- Helmet security headers
- CORS configuration
- File type validation on uploads