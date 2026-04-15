import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/authService';
import { UserCircleIcon, LockClosedIcon, CircleStackIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const AdminProfile: React.FC = () => {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Database credentials state
  const [credentials, setCredentials] = useState<any>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newDbUsername, setNewDbUsername] = useState('');
  const [newDbPassword, setNewDbPassword] = useState('');
  const [confirmDbPassword, setConfirmDbPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Fetch database credentials on mount
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await api.get('/admin/db/credentials');
        setCredentials(response.data.credentials);
      } catch (error: any) {
        console.error('Failed to fetch credentials:', error);
      }
    };
    fetchCredentials();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setProfileLoading(true);
    try {
      await api.put('/users/profile', { name: name.trim(), email: email.trim() });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Current password is required'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setPasswordLoading(true);
    try {
      await api.put('/users/password', { current_password: currentPassword, new_password: newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbUsername.trim()) { toast.error('Username is required'); return; }
    if (newDbPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newDbPassword !== confirmDbPassword) { toast.error('Passwords do not match'); return; }
    if (!adminPassword) { toast.error('Admin password confirmation required'); return; }

    setUpdateLoading(true);
    try {
      const response = await api.put('/admin/db/credentials', {
        newUsername: newDbUsername,
        newPassword: newDbPassword,
        adminPassword: adminPassword
      });
      toast.success('Database credentials updated successfully');
      setCredentials(response.data.credentials || credentials);
      setShowUpdateModal(false);
      setNewDbUsername('');
      setNewDbPassword('');
      setConfirmDbPassword('');
      setAdminPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update credentials');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) { toast.error('Admin password confirmation required'); return; }

    setUpdateLoading(true);
    try {
      await api.delete('/admin/db/credentials/password', {
        data: { adminPassword }
      });
      toast.success('Database password reset to default');
      setShowResetModal(false);
      setAdminPassword('');
      // Refresh credentials
      const response = await api.get('/admin/db/credentials');
      setCredentials(response.data.credentials);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your account details and password</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start', marginBottom: 24 }}>

        {/* Profile Details */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-text" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserCircleIcon style={{ width: 22, height: 22, color: 'var(--color-primary)' }} />
              <div>
                <h3>Account Details</h3>
                <p>Update your name and email address</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleProfileSave}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Full Name</label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">Email Address</label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  type="text"
                  className="form-control"
                  value={user?.role === 'admin' ? 'Administrator' : 'Member'}
                  disabled
                  style={{ background: 'var(--gray-100)', color: 'var(--gray-500)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                  {profileLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-text" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LockClosedIcon style={{ width: 22, height: 22, color: 'var(--color-primary)' }} />
              <div>
                <h3>Change Password</h3>
                <p>Update your login password</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="form-label" htmlFor="current-pw">Current Password</label>
                <input
                  id="current-pw"
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-pw">New Password</label>
                <input
                  id="new-pw"
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-pw">Confirm New Password</label>
                <input
                  id="confirm-pw"
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Updating…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* Database Credentials Management */}
      {user?.role === 'admin' && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-text" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CircleStackIcon style={{ width: 22, height: 22, color: 'var(--color-primary)' }} />
              <div>
                <h3>Database Credentials</h3>
                <p>View and manage PostgreSQL connection credentials</p>
              </div>
            </div>
          </div>
          <div className="card-body">
            {credentials ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', marginBottom: 6 }}>Host</label>
                    <div style={{ padding: 10, background: 'var(--gray-100)', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>{credentials.host}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', marginBottom: 6 }}>Port</label>
                    <div style={{ padding: 10, background: 'var(--gray-100)', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>{credentials.port}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', marginBottom: 6 }}>Database</label>
                    <div style={{ padding: 10, background: 'var(--gray-100)', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>{credentials.database}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--gray-600)', marginBottom: 6 }}>Username</label>
                    <div style={{ padding: 10, background: 'var(--gray-100)', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>{credentials.username}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setNewDbUsername('');
                      setNewDbPassword('');
                      setConfirmDbPassword('');
                      setAdminPassword('');
                      setShowPassword(false);
                      setShowNewPassword(false);
                      setShowUpdateModal(true);
                    }}
                  >
                    Update Credentials
                  </button>
                  <button
                    className="btn"
                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                    onClick={() => {
                      setAdminPassword('');
                      setShowPassword(false);
                      setShowResetModal(true);
                    }}
                  >
                    Reset Password to Default
                  </button>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--gray-500)' }}>Loading credentials...</p>
            )}
          </div>
        </div>
      )}

      {/* Update Credentials Modal */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 500, boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--gray-200)' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Update Database Credentials</h2>
            </div>
            <form onSubmit={handleUpdateCredentials} style={{ padding: 20 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-db-user">New Username</label>
                <input
                  id="new-db-user"
                  type="text"
                  className="form-control"
                  value={newDbUsername}
                  onChange={e => setNewDbUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="new-db-pw">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-db-pw"
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-control"
                    value={newDbPassword}
                    onChange={e => setNewDbPassword(e.target.value)}
                    required
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                    ) : (
                      <EyeIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-db-pw">Confirm Password</label>
                <input
                  id="confirm-db-pw"
                  type="password"
                  className="form-control"
                  value={confirmDbPassword}
                  onChange={e => setConfirmDbPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-pw-update">Admin Password Confirmation</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-pw-update"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? (
                      <EyeSlashIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                    ) : (
                      <EyeIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                    )}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowUpdateModal(false)}
                  disabled={updateLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateLoading}
                >
                  {updateLoading ? 'Updating…' : 'Update Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: 8, width: '90%', maxWidth: 400, boxShadow: '0 20px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--gray-200)' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Reset Database Password</h2>
            </div>
            <form onSubmit={handleResetPassword} style={{ padding: 20 }}>
              <p style={{ color: 'var(--gray-600)', marginBottom: 20, fontSize: 14 }}>
                This will reset the database password to its default value. Confirm your admin password to proceed.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-pw-reset">Admin Password Confirmation</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-pw-reset"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showPassword ? (
                      <EyeSlashIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                    ) : (
                      <EyeIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                    )}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowResetModal(false)}
                  disabled={updateLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ color: 'white', backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                  disabled={updateLoading}
                >
                  {updateLoading ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfile;
