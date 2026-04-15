import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRightOnRectangleIcon, CircleStackIcon, CodeBracketIcon, CalculatorIcon } from '@heroicons/react/24/outline';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'admin';
  const initials = user.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="brand-logo">ACF</div>
            <span className="brand-name">Amrita Chit Fund</span>
            <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
              {isAdmin ? 'Admin' : 'Member'}
            </span>
          </div>

          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">{initials}</div>
              <div>
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
            <button onClick={logout} className="btn btn-ghost btn-sm sign-out-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRightOnRectangleIcon style={{ width: 16, height: 16 }} />
              <span className="sign-out-label">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <div className="nav-inner">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Dashboard
          </NavLink>

          {!isAdmin && (
            <>
              <NavLink
                to="/apply-loan"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Apply for Loan
              </NavLink>
              <NavLink
                to="/my-loans"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                My Loans
              </NavLink>
              <NavLink
                to="/approved-loans"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Approved Loans
              </NavLink>
              <NavLink
                to="/interest-calculator"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CalculatorIcon style={{ width: 16, height: 16 }} />
                Interest Calculator
              </NavLink>
              <NavLink
                to="/profile"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                My Profile
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <NavLink
                to="/admin-loans"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Loan Management
              </NavLink>
              <NavLink
                to="/manage-users"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Manage Users
              </NavLink>
              <NavLink
                to="/admin-chitty"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                Chitty
              </NavLink>
              <NavLink
                to="/admin-profile"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                My Profile
              </NavLink>
              <NavLink
                to="/admin-database"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CircleStackIcon style={{ width: 16, height: 16 }} />
                Database
              </NavLink>
              <NavLink
                to="/admin-system"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <CodeBracketIcon style={{ width: 16, height: 16 }} />
                System Docs
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
