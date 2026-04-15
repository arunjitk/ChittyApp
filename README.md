# ChittyLoanApp - Chitty Fund & Loan Management System

A full-stack web application for managing a rotating chitty fund (chit) combined with a micro-loan system. Features separate User and Admin portals with comprehensive fund tracking, payment management, and loan lifecycle control.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Frontend Pages](#frontend-pages)
- [User Roles & Permissions](#user-roles--permissions)
- [Business Logic](#business-logic)
- [Default Credentials](#default-credentials)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## Overview

ChittyLoanApp combines two financial products:

1. **Chitty Fund (Chit)**: A 12-member rotating savings scheme where each member contributes ₹6,000 monthly, and one member receives the total pool (₹72,000) each month in a rotating schedule.

2. **Loan Pool**: A shared lending pool from which members can borrow money with interest calculated based on loan duration.

---

## Features

### Authentication & Authorization
- JWT-based authentication (24-hour token expiry)
- Role-based access control (User/Admin)
- Secure password hashing with bcryptjs
- Account lockout after 3 failed login attempts
- User registration with admin approval workflow

### Chitty Fund Management
- 12-member rotating chitty group with monthly payouts
- Total pool: ₹72,000 (₹6,000 × 12 members)
- Payout schedule: Each member receives pool in their designated month
- Payment tracking: Track member payments with phone, UPI, screenshots, notes
- Month advancement: Admin advances month after marking recipient as paid
- Month swapping: Swap payout months between members
- Transfer requests: Users can request to transfer their chitty slot

### Loan System
- Shared loan pool with real-time balance tracking
- Interest-free grace period: 15 days
- Interest after grace: ₹50 per 7-day block
- Loan lifecycle: Apply → Pending → Approved → Closed/Foreclosed
- Loan swapping: Users can request to take over other users' pending loans
- First-come-first-served pending loan processing

### User Management (Admin)
- User registration approval workflow
- Lock/unlock user accounts
- Create, update, delete users
- View all users and their activities

### Pool Management (Admin)
- View pool summary and dashboard
- Add funds to pool
- Transfer collected interest back to available balance
- Direct balance adjustments

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Auth | JWT, bcryptjs |
| Security | Helmet, Rate Limiting, CORS |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router 7 |
| HTTP Client | Axios |
| Notifications | React Hot Toast |
| Icons | Heroicons |

---

## Quick Start

### Prerequisites
- Node.js v14 or higher
- npm or yarn
- PostgreSQL (running on localhost:5432)
- Create a database named `chitty_loan_app`

### 1. Start Backend
```bash
cd backend
npm install
npm start
```
Backend runs on: http://localhost:3000

### 2. Start Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```
Frontend runs on: http://localhost:3001

### 3. Access Application
Open http://localhost:3001 in your browser

### Default Login
- **Email**: admin@loantracker.com
- **Password**: admin123

---

## Project Structure

```
ChittyLoanApp/
├── backend/
│   ├── server.js                 # Express server entry point
│   ├── config/
│   │   └── database.js           # SQLite configuration & schema
│   ├── middleware/
│   │   └── auth.js               # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js               # Authentication endpoints
│   │   ├── loans.js              # Loan management endpoints
│   │   ├── users.js              # User management endpoints
│   │   ├── pool.js               # Pool management endpoints
│   │   └── chitty.js             # Chitty fund management endpoints
│   ├── models/
│   │   ├── User.js               # User model
│   │   ├── LoanApplication.js    # Loan model + interest calculation
│   │   ├── LoanPool.js          # Pool model
│   │   ├── ChittyGroup.js       # Chitty group model
│   │   └── UserChitty.js        # Chitty member model
│   ├── uploads/
│   │   └── screenshots/          # Payment screenshot uploads
│   └── database/
│       └── loan_tracker.db       # SQLite database file
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app with routing
│   │   ├── index.tsx            # Entry point
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Auth state management
│   │   ├── services/
│   │   │   ├── authService.ts   # Auth API client
│   │   │   ├── loanService.ts   # Loan/pool API client
│   │   │   └── chittyService.ts # Chitty API client
│   │   ├── pages/               # Page components
│   │   ├── components/          # Shared components
│   │   └── utils/               # Utility functions
│   └── package.json
│
├── database/                     # Database directory
├── SYSTEM_DESIGN.md              # System design document
├── RUNNING_GUIDE.md              # Running instructions
└── README.md                     # This file
```

---

## Database Schema

### Database
PostgreSQL database: `chitty_loan_app`

### Tables

#### users
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY | Unique identifier |
| name | TEXT | NOT NULL | User's full name |
| email | TEXT | UNIQUE, NOT NULL | User's email |
| password_hash | TEXT | NOT NULL | Bcrypt hashed password |
| role | TEXT | DEFAULT 'user' | 'user' or 'admin' |
| phone | TEXT | | Phone number |
| is_locked | INTEGER | DEFAULT 0 | Account lock status |
| failed_attempts | INTEGER | DEFAULT 0 | Failed login count |
| locked_at | DATETIME | | Lock timestamp |
| status | TEXT | DEFAULT 'active' | Account status |
| avatar_path | TEXT | | Profile image path |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation time |

#### loan_pool
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| total_pool | REAL | Total funds ever in pool |
| available_balance | REAL | Currently available for loans |
| total_interest_collected | REAL | All interest earned |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### loan_applications
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | FK to users.id |
| amount | REAL | Loan principal amount |
| purpose | TEXT | Loan purpose |
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

#### chitty_group
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Group name |
| total_members | INTEGER | Number of members (12) |
| chitty_amount | REAL | Monthly contribution per member |
| monthly_chitty_amount | REAL | Monthly amount (6000) |
| payout_day | INTEGER | Day of month for payout |
| subscription_deadline_day | INTEGER | Payment deadline day |
| current_month | INTEGER | Current chitty month (1-12) |
| start_year | INTEGER | Group start year |
| start_month | INTEGER | Group start month |
| upi_id | TEXT | UPI for payments |
| account_number | TEXT | Bank account number |
| ifsc_code | TEXT | Bank IFSC code |
| penalty_amount | REAL | Late payment penalty |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### user_chitty
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | FK to users.id (nullable) |
| member_name | TEXT | Member display name |
| member_index | INTEGER | Member position (1-12) |
| payout_month | INTEGER | Month they receive payout |
| monthly_chitty_amount | REAL | Monthly contribution |
| penalties_due | REAL | Pending penalties |
| status | TEXT | active/paid/transferred |
| transfer_requested | INTEGER | Transfer request flag |
| transfer_approved | INTEGER | Transfer approval flag |
| paid_month | INTEGER | Month marked as paid |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### chitty_payments
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| member_id | INTEGER | FK to user_chitty.id |
| month | INTEGER | Month of payment (1-12) |
| phone | TEXT | Payer's phone |
| upi_id | TEXT | Payer's UPI |
| screenshot_path | TEXT | Payment screenshot |
| notes | TEXT | Additional notes |
| paid_at | DATETIME | Payment timestamp |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### loan_swap_requests
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| loan_id | INTEGER | FK to loan_applications.id |
| requester_id | INTEGER | FK to users.id |
| original_owner_id | INTEGER | FK to users.id (original owner) |
| status | TEXT | pending_owner/approved/rejected |
| owner_approved_at | DATETIME | Owner approval timestamp |
| admin_approved_at | DATETIME | Admin approval timestamp |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

---

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new user (status: pending) |
| POST | `/auth/login` | Public | Login and get JWT token |
| GET | `/auth/profile` | JWT | Get current user profile |
| POST | `/auth/logout` | JWT | Logout (client-side) |

### Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/all` | Admin | Get all users |
| PUT | `/users/profile` | JWT | Update own profile |
| PUT | `/users/profile/avatar` | JWT | Upload avatar |
| PUT | `/users/password` | JWT | Change password |
| POST | `/users/create` | Admin | Create user (active) |
| PUT | `/users/:id` | Admin | Update any user |
| DELETE | `/users/:id` | Admin | Delete user |
| PUT | `/users/:id/lock` | Admin | Lock user account |
| PUT | `/users/:id/unlock` | Admin | Unlock user account |
| PUT | `/users/:id/approve` | Admin | Approve pending user |
| PUT | `/users/:id/reject` | Admin | Reject pending user |

### Pool (`/api/pool`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pool/summary` | JWT | Get pool summary |
| GET | `/pool/dashboard` | JWT | Get dashboard data |
| PUT | `/pool/available` | Admin | Set available balance |
| PUT | `/pool/interest` | Admin | Set interest collected |
| DELETE | `/pool/interest` | Admin | Reset interest to 0 |
| POST | `/pool/transfer-interest` | Admin | Transfer interest to available |
| POST | `/pool/add` | Admin | Add funds to pool |

### Loans (`/api/loans`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/loans/apply` | User | Apply for a loan |
| GET | `/loans/my-loans` | User | Get user's loans |
| POST | `/loans/calculate-interest` | User | Preview interest |
| GET | `/loans/all` | Admin | Get all loans |
| GET | `/loans/pending` | Admin | Get pending loans |
| GET | `/loans/active` | JWT | Get active loans |
| POST | `/loans/:id/approve` | Admin | Approve loan |
| POST | `/loans/:id/reject` | Admin | Reject loan |
| POST | `/loans/:id/close` | Admin | Close loan (repayment) |
| POST | `/loans/:id/foreclose` | Admin | Foreclose loan |
| PUT | `/loans/:id` | Admin | Update loan |
| DELETE | `/loans/:id` | Admin | Delete loan |
| POST | `/loans/:id/request-swap` | JWT | Request loan swap |
| GET | `/loans/my-swap-requests` | JWT | Get swap requests on my loans |
| POST | `/loans/swap-requests/:id/approve-owner` | JWT | Approve as owner |
| POST | `/loans/swap-requests/:id/reject-owner` | JWT | Reject as owner |
| GET | `/loans/admin-swap-requests` | Admin | Get pending admin swaps |
| POST | `/loans/swap-requests/:id/approve-admin` | Admin | Finalize swap |
| POST | `/loans/swap-requests/:id/reject-admin` | Admin | Reject swap |
| GET | `/loans/swapped-loans` | Admin | Get swap history |

### Chitty (`/api/chitty`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chitty/group` | JWT | Get chitty group details |
| PATCH | `/chitty/group` | Admin | Update group settings |
| GET | `/chitty/all-members` | Admin | Get all members |
| POST | `/chitty/swap-months` | Admin | Swap payout months |
| POST | `/chitty/advance-month` | Admin | Advance to next month |
| GET | `/chitty/my-chitty` | JWT | Get user's chitty info |
| PATCH | `/chitty/:id` | Admin | Update member |
| POST | `/chitty/:id/request-transfer` | JWT | Request slot transfer |
| GET | `/chitty/payments` | Admin | Get all payments |
| GET | `/chitty/my-payments` | JWT | Get user's payments |
| POST | `/chitty/payments` | Admin | Create/update payment |
| POST | `/chitty/payments/:member_id/:month/screenshot` | Admin | Upload screenshot |
| DELETE | `/chitty/payments/:member_id/:month` | Admin | Delete payment |
| DELETE | `/chitty/payments/:member_id/:month/screenshot` | Admin | Remove screenshot |

---

## Frontend Pages

### User Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | User authentication |
| Register | `/register` | New user registration |
| User Dashboard | `/dashboard` | Main dashboard with loans, pool, chitty |
| Loan Application | `/apply-loan` | Apply for a loan |
| My Loans | `/my-loans` | User's loan history |
| Approved Loans | `/approved-loans` | All approved loans (read-only) |
| User Profile | `/profile` | Profile and settings |

### Admin Pages

| Page | Route | Description |
|------|-------|-------------|
| Admin Dashboard | `/admin` | Overview stats and actions |
| Admin Loans | `/admin-loans` | Manage loans and swaps |
| Admin Chitty | `/admin-chitty` | Manage chitty members & payments |
| Manage Users | `/admin-users` | User management |
| Admin Profile | `/admin-profile` | Profile and settings |

---

## User Roles & Permissions

### User
- Register (account pending approval)
- Login/logout
- View dashboard (pool, loans, chitty)
- Apply for loans
- View own loan history
- Request loan swaps on pending loans
- Approve/reject swap requests on own pending loans
- View chitty schedule and own slot
- View own payment history
- Request chitty slot transfer
- Update own profile and password

### Admin
- All user capabilities
- Approve/reject new user registrations
- Create, update, delete users
- Lock/unlock user accounts
- View all loans
- Approve/reject loans
- Close/foreclose loans
- Manage loan pool
- View/manage swap requests
- Manage chitty (members, payments, settings)
- Advance chitty months
- Swap payout months

---

## Business Logic

### Interest Calculation

```
Days ≤ 15    →  0% Interest (Grace Period)
Days > 15    →  ₹50 per 7-day block
```

Formula: `interest = ceil((days - 15) / 7) × 50`

| Days | Interest |
|------|----------|
| 10 | ₹0 |
| 15 | ₹0 |
| 22 | ₹50 |
| 29 | ₹100 |
| 60 | ₹300 |

### Loan Lifecycle

```
PENDING → APPROVED → CLOSED
    ↓         ↓
REJECTED  FORECLOSED
```

- **Pending**: Loan applied, awaiting admin review
- **Approved**: Admin approved; amount deducted from pool
- **Closed**: Fully repaid; principal + interest returned to pool
- **Foreclosed**: Admin-initiated early settlement
- **Rejected**: Admin rejected the application

### Loan Swap Flow

1. User A has pending loan
2. User B sees pending loans and requests swap
3. User A (owner) approves/rejects
4. Admin gives final approval
5. Loan ownership transfers to User B

### Chitty Payout Flow

1. Each month, one member receives total pool (₹72,000)
2. Admin marks current month's recipient as "paid"
3. All other members pay ₹6,000 contribution
4. Admin tracks payments (phone, UPI, screenshots)
5. Once recipient marked paid, admin advances month
6. Process repeats until all 12 months complete

### Pool Balance Flow

- **On Loan Approval**: `available_balance -= loan.amount`
- **On Loan Close/Foreclose**: `available_balance += loan.total_due`

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@loantracker.com | admin123 |

---

## Security

| Feature | Implementation |
|---------|----------------|
| Authentication | JWT tokens (24h expiry) |
| Password Storage | bcryptjs |
| Authorization | Role-based middleware |
| Account Security | Lockout after 3 failed attempts |
| CORS | Restricted to frontend origin |
| Rate Limiting | 100 requests per 15 minutes |
| Security Headers | Helmet middleware |

---

## Troubleshooting

### Backend not starting?
```bash
cd backend
npm install
npm start
```

### Frontend not starting?
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

### Port already in use?
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Database issues?
Delete `backend/database/loan_tracker.db` to reset. Admin account will be recreated on server start.

### API returns 401?
- Token may have expired (24h)
- Token not attached to request
- Invalid token

---

## License

This project is for educational and demonstration purposes.
