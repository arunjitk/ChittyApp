# ChittyLoanApp - System Design Document

**Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Production Ready

---

## 1. Overview

### 1.1 Purpose

ChittyLoanApp is a loan management system designed for chitty fund-style lending operations. It enables a shared loan pool where multiple borrowers can apply for loans, with interest calculated based on loan duration.

### 1.2 Scope

- User registration and authentication
- Shared loan pool management
- Loan application workflow (apply → approve → repay)
- Interest calculation based on loan duration
- Admin dashboard for pool and loan management

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js 5 |
| Database | SQLite3 |
| Authentication | JWT, bcryptjs |
| Frontend | React 19, TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router 7 |
| HTTP Client | Axios |

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌─────────────────────┐        ┌─────────────────────────────┐ │
│  │   Web Browser       │        │      React SPA              │ │
│  │   (Port 3001)       │        │   Single Page Application   │ │
│  └─────────────────────┘        └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (Port 3000)                    
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Express.js Server                         ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        ││
│  │  │   Auth   │ │  Loans   │ │  Users   │ │   Pool   │        ││
│  │  │  Routes  │ │  Routes  │ │  Routes  │ │  Routes  │        ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘        ││
│  │  ┌──────────────────────────────────────────────────────────││
│  │  │              Authentication Middleware                   │││
│  │  │   - JWT Verification    - Role-Based Access (Admin/User) │││
│  │  └──────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SQLite Database                           ││
│  │   ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ ││
│  │   │  Users   │  │LoanApplications│ │     LoanPool         │ ││
│  │   └──────────┘  └──────────────┘  └───────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
ChittyLoanApp/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── config/
│   │   └── database.js        # Database configuration & schema
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── loans.js           # Loan management endpoints
│   │   ├── users.js           # User management endpoints
│   │   └── pool.js            # Pool management endpoints
│   ├── models/
│   │   ├── User.js            # User model
│   │   ├── LoanApplication.js # Loan model + interest calculation
│   │   └── LoanPool.js        # Pool model
│   ├── .env                   # Environment variables
│   └── database/
│       └── loan_tracker.db    # SQLite database file
│
└── frontend/
    ├── src/
    │   ├── App.tsx            # Main app with routing
    │   ├── index.tsx          # Entry point
    │   ├── contexts/
    │   │   └── AuthContext.tsx # Auth state management
    │   ├── services/
    │   │   ├── authService.ts  # Auth API client
    │   │   └── loanService.ts  # Loan/pool API client
    │   ├── pages/             # Page components
    │   ├── components/        # Shared components
    │   └── utils/             # Utility functions
    └── package.json
```

---

## 3. Database Design

### 3.1 Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────────────┐       ┌─────────────┐
│   Users     │       │  Loan_Applications      │       │ Loan_Pool   │
│─────────────│       │─────────────────────────│       │─────────────│
│ id (PK)     │──┐    │ id (PK)                │       │ id (PK)     │
│ name        │  │    │ user_id (FK)           │◄──────│ total_pool  │
│ email       │  └───►│ amount                 │       │ available_  │
│ password_   │       │ purpose                │       │   balance   │
│   hash      │       │ applied_on             │       │ total_      │
│ role        │       │ repayment_date         │       │ interest_   │
│ created_at  │       │ interest_amount         │       │ collected   │
└─────────────┘       │ total_due              │       │ created_at  │
                      │ status                 │       │ updated_at  │
                      │ admin_notes            │       └─────────────┘
                      │ approved_on            │
                      │ closed_on              │
                      │ foreclosed_on          │
                      │ created_at             │
                      │ updated_at             │
                      └─────────────────────────┘
```

### 3.2 Table Definitions

#### Users Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier |
| name | TEXT | NOT NULL | User's full name |
| email | TEXT | UNIQUE, NOT NULL | User's email address |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| role | TEXT | NOT NULL, DEFAULT 'user' | 'user' or 'admin' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Account creation time |

#### Loan Pool Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| total_pool | REAL | Total funds ever in pool |
| available_balance | REAL | Currently available for loans |
| total_interest_collected | REAL | All interest earned |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### Loan Applications Table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | FK to users.id |
| amount | REAL | Loan principal amount |
| purpose | TEXT | Loan purpose description |
| applied_on | DATETIME | Application submission time |
| repayment_date | DATE | Expected repayment date |
| interest_amount | REAL | Calculated interest |
| total_due | REAL | Principal + Interest |
| status | TEXT | pending/approved/rejected/closed/foreclosed |
| admin_notes | TEXT | Admin comments |
| approved_on | DATETIME | Approval timestamp |
| closed_on | DATETIME | Closure timestamp |
| foreclosed_on | DATETIME | Foreclosure timestamp |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

---

## 4. API Design

### 4.1 Authentication API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | User login |
| GET | `/api/auth/profile` | JWT | Get current user profile |
| POST | `/api/auth/logout` | JWT | Logout user |

**Register Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### 4.2 Loan API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/loans/apply` | User | Apply for a loan |
| GET | `/api/loans/my-loans` | User | Get user's loans |
| POST | `/api/loans/calculate-interest` | User | Preview interest calculation |
| GET | `/api/loans/all` | Admin | Get all loans |
| GET | `/api/loans/pending` | Admin | Get pending loans |
| GET | `/api/loans/active` | Auth | Get active loans |
| POST | `/api/loans/:id/approve` | Admin | Approve loan |
| POST | `/api/loans/:id/reject` | Admin | Reject loan |
| POST | `/api/loans/:id/close` | Admin | Close loan (repayment complete) |
| POST | `/api/loans/:id/foreclose` | Admin | Foreclose loan (early settlement) |
| PUT | `/api/loans/:id` | Admin | Update loan details |

**Loan Application Request:**
```json
{
  "amount": 10000,
  "repaymentDate": "2026-04-28",
  "purpose": "Home renovation"
}
```

### 4.3 Pool API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/pool/summary` | Auth | Get pool summary |
| GET | `/api/pool/dashboard` | Auth | Get dashboard data |
| POST | `/api/pool/add` | Admin | Add funds to pool |

### 4.4 User API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users/all` | Admin | Get all users |
| PUT | `/api/users/profile` | Auth | Update own profile |
| PUT | `/api/users/password` | Auth | Change own password |
| POST | `/api/users/create` | Admin | Create new user |

---

## 5. Business Logic

### 5.1 Interest Calculation

The interest is calculated based on the loan duration using a tiered approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Interest Calculation Rule                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Days ≤ 15    ──────►    0% Interest (Grace Period)            │
│                                                                  │
│   Days > 15    ──────►    ₹50 per 7-day block                   │
│                                                                  │
│   Formula:                                                         │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  interest = floor((repayment_days - 15) / 7) × ₹50     │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Calculation Examples:**

| Repayment Days | Days Beyond 15 | 7-Day Blocks | Interest |
|----------------|---------------|--------------|----------|
| 10 days | 0 | 0 | ₹0 |
| 15 days | 0 | 0 | ₹0 |
| 16 days | 1 | 0 | ₹0 |
| 22 days | 7 | 1 | ₹50 |
| 29 days | 14 | 2 | ₹100 |
| 30 days | 15 | 2 | ₹100 |
| 60 days | 45 | 6 | ₹300 |

### 5.2 Loan Lifecycle

```
                                    ┌─────────────────┐
                                    │     PENDING     │
                                    │   (Applied)     │
                                    └────────┬────────┘
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     │                       │                       │
                     ▼                       ▼                       │
              ┌──────────┐            ┌──────────┐                    │
              │ APPROVED │◄───Admin───┤ REJECTED │                    │
              │ (Active) │            └──────────┘                    │
              └────┬─────┘                                             │
                   │                                                   │
       ┌───────────┴───────────┐                                       │
       │                       │                                       │
       ▼                       ▼                                       │
┌─────────────┐          ┌─────────────┐                                │
│   CLOSED    │◄──Admin──│ FORECLOSED  │                                │
│(Repayment   │          │ (Early      │                                │
│ Complete)   │          │ Settlement) │                                │
└─────────────┘          └─────────────┘                                │
       │                       │                                       │
       └───────────────────────┴───────────────────────────────────────┘
                                  │
                                  ▼
                         Pool Replenishment
                    (Principal + Interest Added)
```

### 5.3 Pool Balance Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pool Balance Operations                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ON LOAN APPROVAL:                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  available_balance -= loan.amount                          │ │
│  │  amount_disbursed += loan.amount                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ON LOAN CLOSE/FORECLOSE:                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  available_balance += loan.total_due                        │ │
│  │  total_interest_collected += loan.interest_amount           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ON POOL TOP-UP (Admin):                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  available_balance += topup_amount                          │ │
│  │  total_pool += topup_amount                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. User Roles & Permissions

### 6.1 Role Comparison

| Feature | User | Admin |
|---------|:----:|:-----:|
| Register/Login | ✓ | ✓ |
| View pool summary | ✓ | ✓ |
| Apply for loan | ✓ | ✓ |
| View own loans | ✓ | ✓ |
| View all approved loans | ✓ | ✓ |
| Approve/reject loans | ✗ | ✓ |
| Close/foreclose loans | ✗ | ✓ |
| Top up pool | ✗ | ✓ |
| Manage users | ✗ | ✓ |
| View all loans | ✗ | ✓ |

### 6.2 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@loantracker.com | admin123 |

---

## 7. Security

### 7.1 Authentication

- **Method**: JWT (JSON Web Tokens)
- **Token Expiry**: 24 hours
- **Password Hashing**: bcryptjs with 10 salt rounds

### 7.2 Authorization Middleware

```javascript
// Middleware chain for protected routes
auth      // Verify JWT token exists and valid
adminAuth // Verify user has 'admin' role
userAuth  // Verify user has 'user' role
```

### 7.3 Security Headers

| Feature | Implementation |
|---------|---------------|
| Rate Limiting | 100 requests per 15 minutes per IP |
| CORS | Restricted to frontend origin |
| Helmet | Security headers enabled |
| Password Storage | bcrypt hash (never stored in plain text) |

---

## 8. Frontend Architecture

### 8.1 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                        Public Routes                             │
├─────────────────────────────────────────────────────────────────┤
│  /login      → Login Page                                       │
│  /register   → Registration Page                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      User Routes (Auth)                          │
├─────────────────────────────────────────────────────────────────┤
│  /dashboard      → UserDashboard (pool overview)                │
│  /apply-loan     → LoanApplication (apply for loan)             │
│  /my-loans       → MyLoans (personal loan history)              │
│  /approved-loans → ApprovedLoans (all active loans)             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Admin Routes (Auth)                          │
├─────────────────────────────────────────────────────────────────┤
│  /admin-dashboard → AdminDashboard (pool + metrics)             │
│  /admin-loans     → AdminLoans (manage all loans)                │
│  /manage-users    → ManageUsers (user management)               │
│  /admin-profile   → AdminProfile (settings)                     │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 State Management

**AuthContext** manages:
- Current authenticated user
- JWT token (persisted in localStorage)
- Login/logout functions
- Session restoration on page reload

### 8.3 API Client

Axios interceptors handle:
- Automatic JWT token attachment to requests
- 401 response handling (redirect to login)
- Base URL configuration

---

## 9. Error Handling

### 9.1 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET/PUT |
| 201 | Successful POST (created) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 500 | Internal server error |

### 9.2 Error Response Format

```json
{
  "error": "Error message description"
}
```

---

## 10. Configuration

### 10.1 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Backend server port |
| JWT_SECRET | your-secret-key-change-in-production | JWT signing secret |
| REACT_APP_API_URL | http://localhost:3000/api | Backend API URL |

### 10.2 Initial State

On first run, the system initializes:
- **Default Pool**: ₹72,000 total, ₹72,000 available
- **Default Admin**: admin@loantracker.com / admin123

---

## 11. Future Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Email Notifications | Medium | Notify users on loan status changes |
| Payment Reminders | Medium | Automated reminders before due date |
| Loan Categories | Low | Different loan types with varying rates |
| Reporting | Low | Export loan/pool reports as PDF/Excel |
| Audit Trail | Medium | Log all admin actions |
| Multi-tenancy | Low | Support multiple chitty groups |

---

## 12. Appendix

### A. Database Initialization Script

```javascript
// Default admin creation
const adminUser = await User.create({
  name: 'Admin',
  email: 'admin@loantracker.com',
  password: 'admin123',
  role: 'admin'
});

// Initial pool setup
const pool = await LoanPool.create({
  total_pool: 72000,
  available_balance: 72000,
  total_interest_collected: 0
});
```

### B. Key File Locations

| Component | Path |
|-----------|------|
| Backend Entry | backend/server.js |
| Database Config | backend/config/database.js |
| Auth Middleware | backend/middleware/auth.js |
| Interest Logic | backend/models/LoanApplication.js |
| Frontend App | frontend/src/App.tsx |
| Auth Context | frontend/src/contexts/AuthContext.tsx |
| API Services | frontend/src/services/ |
