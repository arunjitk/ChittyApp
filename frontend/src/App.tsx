import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoanApplication from './pages/LoanApplication';
import MyLoans from './pages/MyLoans';
import AdminLoans from './pages/AdminLoans';
import ApprovedLoans from './pages/ApprovedLoans';
import AdminProfile from './pages/AdminProfile';
import InterestCalculator from './pages/InterestCalculator';
import AdminDatabase from './pages/AdminDatabase';
import AdminSystem from './pages/AdminSystem';
import UserProfile from './pages/UserProfile';
import ManageUsers from './pages/ManageUsers';
import AdminChitty from './pages/AdminChitty';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <>
          <Toaster position="top-right" />
          <AppRoutes />
        </>
      </Router>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-page">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
      
      {/* Protected Routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={
          user ? (
            user.role === 'admin' ? <AdminDashboard /> : <UserDashboard />
          ) : <Navigate to="/login" />
        } />
        
        <Route path="apply-loan" element={
          user && user.role === 'user' ? <LoanApplication /> : <Navigate to="/login" />
        } />
        
        <Route path="my-loans" element={
          user && user.role === 'user' ? <MyLoans /> : <Navigate to="/login" />
        } />
        
        <Route path="approved-loans" element={
          user && user.role === 'user' ? <ApprovedLoans /> : <Navigate to="/login" />
        } />

        <Route path="profile" element={
          user && user.role === 'user' ? <UserProfile /> : <Navigate to="/login" />
        } />

        <Route path="interest-calculator" element={
          user && user.role === 'user' ? <InterestCalculator /> : <Navigate to="/login" />
        } />
        
        <Route path="admin-loans" element={
          user && user.role === 'admin' ? <AdminLoans /> : <Navigate to="/login" />
        } />

        <Route path="admin-profile" element={
          user && user.role === 'admin' ? <AdminProfile /> : <Navigate to="/login" />
        } />

        <Route path="manage-users" element={
          user && user.role === 'admin' ? <ManageUsers /> : <Navigate to="/login" />
        } />

        <Route path="admin-chitty" element={
          user && user.role === 'admin' ? <AdminChitty /> : <Navigate to="/login" />
        } />

        <Route path="admin-database" element={
          user && user.role === 'admin' ? <AdminDatabase /> : <Navigate to="/login" />
        } />

        <Route path="admin-system" element={
          user && user.role === 'admin' ? <AdminSystem /> : <Navigate to="/login" />
        } />
      </Route>
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;