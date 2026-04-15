import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/authService';
import {
  UserIcon, PlusIcon, PencilSquareIcon, TrashIcon,
  LockClosedIcon, LockOpenIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/format';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  is_locked: number;
  status: 'active' | 'pending' | 'rejected';
  created_at: string;
}

type ActiveTab = 'all' | 'pending';

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [showForm, setShowForm] = useState(false);

  // Create form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Action loading states
  const [actioning, setActioning] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/all');
      setUsers(res.data.users);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      toast.error('Name, email and password are required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    try {
      await api.post('/users/create', {
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        password: newPassword,
        role: newRole,
      });
      toast.success(`User "${newName.trim()}" created successfully`);
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewPassword(''); setNewRole('user');
      setShowForm(false);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditRole(u.role);
    setEditPassword('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (editPassword && editPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/users/${editUser.id}`, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
        password: editPassword || undefined,
      });
      toast.success('User updated successfully');
      setEditUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    setActioning(u.id);
    try {
      await api.delete(`/users/${u.id}`);
      toast.success(`User "${u.name}" deleted`);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setActioning(null);
    }
  };

  const handleLockToggle = async (u: User) => {
    const willLock = !u.is_locked;
    if (willLock && !window.confirm(`Lock "${u.name}"? They will not be able to log in.`)) return;
    setActioning(u.id);
    try {
      await api[willLock ? 'put' : 'put'](`/users/${u.id}/${willLock ? 'lock' : 'unlock'}`);
      toast.success(willLock ? `${u.name} locked` : `${u.name} unlocked`);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update lock status');
    } finally {
      setActioning(null);
    }
  };

  const handleApprove = async (u: User) => {
    setActioning(u.id);
    try {
      await api.put(`/users/${u.id}/approve`);
      toast.success(`${u.name}'s account approved`);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve user');
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async (u: User) => {
    if (!window.confirm(`Reject registration for "${u.name}"?`)) return;
    setActioning(u.id);
    try {
      await api.put(`/users/${u.id}/reject`);
      toast.success(`${u.name}'s registration rejected`);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject user');
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="spinner-page">
        <div className="spinner"></div>
      </div>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status !== 'pending');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Users</h1>
          <p className="page-subtitle">View, add and edit user accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <PlusIcon style={{ width: 16, height: 16 }} />
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Create New User</h3>
              <p>Add a new member or admin account</p>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-name">Full Name</label>
                  <input id="new-name" type="text" className="form-control" value={newName}
                    onChange={e => setNewName(e.target.value)} required placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-email">Email Address</label>
                  <input id="new-email" type="email" className="form-control" value={newEmail}
                    onChange={e => setNewEmail(e.target.value)} required placeholder="john@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-phone">Phone Number</label>
                  <input id="new-phone" type="tel" className="form-control" value={newPhone}
                    onChange={e => setNewPhone(e.target.value)} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">Password</label>
                  <input id="new-password" type="password" className="form-control" value={newPassword}
                    onChange={e => setNewPassword(e.target.value)} required placeholder="Minimum 6 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-role">Role</label>
                  <select id="new-role" className="form-control" value={newRole}
                    onChange={e => setNewRole(e.target.value as 'user' | 'admin')}>
                    <option value="user">Member (User)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--gray-200)' }}>
        <button
          className={`tab-btn${activeTab === 'all' ? ' active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Users
          <span style={{ marginLeft: 6, background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 10, padding: '0 7px', fontSize: 11, fontWeight: 700 }}>
            {activeUsers.length}
          </span>
        </button>
        <button
          className={`tab-btn${activeTab === 'pending' ? ' active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: '0 7px', fontSize: 11, fontWeight: 700 }}>
              {pendingUsers.length}
            </span>
          )}
        </button>
      </div>

      {/* Pending Approvals Tab */}
      {activeTab === 'pending' && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Pending Registrations</h3>
              <p>These users have registered and are awaiting your approval</p>
            </div>
          </div>
          {pendingUsers.length === 0 ? (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
              No pending registration requests
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            <UserIcon style={{ width: 14, height: 14 }} />
                          </div>
                          <div>
                            <div className="user-cell-name">{u.name}</div>
                            <div className="user-cell-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: u.phone ? 'inherit' : 'var(--gray-400)', fontSize: 13 }}>
                        {u.phone || '—'}
                      </td>
                      <td className="nowrap">{formatDate(u.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-success btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleApprove(u)}
                            disabled={actioning === u.id}
                          >
                            <CheckCircleIcon style={{ width: 14, height: 14 }} />
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => handleReject(u)}
                            disabled={actioning === u.id}
                          >
                            <XCircleIcon style={{ width: 14, height: 14 }} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* All Users Tab */}
      {activeTab === 'all' && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>All Users</h3>
              <p>{activeUsers.length} account{activeUsers.length !== 1 ? 's' : ''} registered</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-cell-avatar">
                          <UserIcon style={{ width: 14, height: 14 }} />
                        </div>
                        <div>
                          <div className="user-cell-name">{u.name}</div>
                          <div className="user-cell-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: u.phone ? 'inherit' : 'var(--gray-400)', fontSize: 13 }}>
                      {u.phone || '—'}
                    </td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role === 'admin' ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td>
                      {u.is_locked ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 10 }}>
                          <LockClosedIcon style={{ width: 12, height: 12 }} /> Locked
                        </span>
                      ) : u.status === 'rejected' ? (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 10 }}>
                          Rejected
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: 10 }}>
                          Active
                        </span>
                      )}
                    </td>
                    <td className="nowrap">{formatDate(u.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => openEdit(u)}
                          disabled={actioning === u.id}
                        >
                          <PencilSquareIcon style={{ width: 13, height: 13 }} />
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm ${u.is_locked ? 'btn-success' : 'btn-warning'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleLockToggle(u)}
                          disabled={actioning === u.id}
                          title={u.is_locked ? 'Unlock account' : 'Lock account'}
                        >
                          {u.is_locked
                            ? <><LockOpenIcon style={{ width: 13, height: 13 }} /> Unlock</>
                            : <><LockClosedIcon style={{ width: 13, height: 13 }} /> Lock</>
                          }
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => handleDelete(u)}
                          disabled={actioning === u.id}
                        >
                          <TrashIcon style={{ width: 13, height: 13 }} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={e => { if (e.target === e.currentTarget) setEditUser(null); }}
        >
          <div style={{
            background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480,
            boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 700 }}>Edit User</h3>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--gray-500)' }}>
              Update details for <strong>{editUser.name}</strong>
            </p>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">Full Name</label>
                <input id="edit-name" type="text" className="form-control" value={editName}
                  onChange={e => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-email">Email Address</label>
                <input id="edit-email" type="email" className="form-control" value={editEmail}
                  onChange={e => setEditEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-phone">Phone Number</label>
                <input id="edit-phone" type="tel" className="form-control" value={editPhone}
                  onChange={e => setEditPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-role">Role</label>
                <select id="edit-role" className="form-control" value={editRole}
                  onChange={e => setEditRole(e.target.value as 'user' | 'admin')}>
                  <option value="user">Member (User)</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-password">
                  New Password <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(leave blank to keep current)</span>
                </label>
                <input id="edit-password" type="password" className="form-control" value={editPassword}
                  onChange={e => setEditPassword(e.target.value)} placeholder="Minimum 6 characters" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
