import React, { useState, useEffect } from 'react';
import { chittyService, ChittyGroup, UserChitty, ChittyPayment, LinkableUser } from '../services/chittyService';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  CreditCardIcon,
  PhotoIcon,
  TrashIcon,
  LinkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function getCalendarInfo(group: ChittyGroup, payoutMonth: number) {
  const offset = (group.start_month - 1) + (payoutMonth - 1);
  const calendarMonth = (offset % 12) + 1;
  const year = group.start_year + Math.floor(offset / 12);
  return { month: MONTH_NAMES[calendarMonth - 1], year, calendarMonth };
}

function formatPayoutMonth(group: ChittyGroup, payoutMonth: number) {
  const { month, year } = getCalendarInfo(group, payoutMonth);
  return `${month} ${year}`;
}

const AdminChitty: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'members' | 'payments'>('members');
  const [group, setGroup] = useState<ChittyGroup | null>(null);
  const [members, setMembers] = useState<UserChitty[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const [settingsForm, setSettingsForm] = useState<Partial<ChittyGroup>>({});

  const [swapModal, setSwapModal] = useState(false);
  const [swapId1, setSwapId1] = useState('');
  const [swapId2, setSwapId2] = useState('');
  const [swapping, setSwapping] = useState(false);

  const [editingCurrentMonth, setEditingCurrentMonth] = useState(false);
  const [currentMonthInput, setCurrentMonthInput] = useState('');
  const [savingCurrentMonth, setSavingCurrentMonth] = useState(false);

  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ member_name: string; payout_month: number; penalties_due: number; status: 'active' | 'paid' }>({
    member_name: '', payout_month: 1, penalties_due: 0, status: 'active',
  });
  const [togglingPaid, setTogglingPaid] = useState<number | null>(null);

  // Mark as paid popup state
  const [markPaidMember, setMarkPaidMember] = useState<UserChitty | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState({ paid_at: '', phone: '', upi_id: '', notes: '', screenshot: null as File | null });
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

  // Undo paid confirmation state
  const [unpaidConfirmMember, setUnpaidConfirmMember] = useState<UserChitty | null>(null);
  const [unpaidLoading, setUnpaidLoading] = useState(false);

  // Screenshot viewer overlay
  const [screenshotViewPath, setScreenshotViewPath] = useState<string | null>(null);

  // Mark all paid
  const [markAllPaidLoading, setMarkAllPaidLoading] = useState(false);

  // Payments tab state
  const [payments, setPayments] = useState<ChittyPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [editingPayment, setEditingPayment] = useState<{ member_id: number; month: number } | null>(null);
  const [paymentForm, setPaymentForm] = useState({ phone: '', upi_id: '', notes: '', paid_at: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(1);

  // Link User modal state
  const [linkModal, setLinkModal] = useState<UserChitty | null>(null);
  const [linkableUsers, setLinkableUsers] = useState<LinkableUser[]>([]);
  const [selectedLinkUserId, setSelectedLinkUserId] = useState<string>('');
  const [linkModalLoading, setLinkModalLoading] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [groupData, membersData] = await Promise.all([
        chittyService.getGroup(),
        chittyService.getAllMembers(),
      ]);
      setGroup(groupData);
      setSettingsForm(groupData);
      setMembers(membersData);
    } catch {
      toast.error('Failed to load chitty data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const data = await chittyService.getAllPayments();
      setPayments(data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const openLinkModal = async (member: UserChitty) => {
    setLinkModal(member);
    setSelectedLinkUserId(member.user_id ? String(member.user_id) : '');
    setLinkModalLoading(true);
    try {
      const users = await chittyService.getLinkableUsers();
      // If this member already has a linked user, include them in the list so we can keep or change
      if (member.linked_user) {
        const alreadyIn = users.find(u => u.id === member.linked_user!.id);
        if (!alreadyIn) {
          users.unshift({ id: member.linked_user.id, name: member.linked_user.name, email: member.linked_user.email, phone: null });
        }
      }
      setLinkableUsers(users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLinkModalLoading(false);
    }
  };

  const handleLinkSave = async () => {
    if (!linkModal) return;
    setLinkSaving(true);
    try {
      const userId = selectedLinkUserId ? parseInt(selectedLinkUserId, 10) : null;
      const updated = await chittyService.linkMemberToUser(linkModal.id, userId);
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
      toast.success(userId ? `Linked to ${updated.linked_user?.name}` : 'User unlinked');
      setLinkModal(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update link');
    } finally {
      setLinkSaving(false);
    }
  };

  const openPaymentEdit = (member_id: number, month: number) => {
    const existing = payments.find(p => p.member_id === member_id && p.month === month);
    setPaymentForm({
      phone: existing?.phone || '',
      upi_id: existing?.upi_id || '',
      notes: existing?.notes || '',
      paid_at: existing?.paid_at ? existing.paid_at.split('T')[0] : '',
    });
    setEditingPayment({ member_id, month });
  };

  const savePayment = async () => {
    if (!editingPayment) return;
    setSavingPayment(true);
    try {
      const saved = await chittyService.savePayment({
        member_id: editingPayment.member_id,
        month: editingPayment.month,
        phone: paymentForm.phone || undefined,
        upi_id: paymentForm.upi_id || undefined,
        notes: paymentForm.notes || undefined,
        paid_at: paymentForm.paid_at || undefined,
      });
      setPayments(prev => {
        const idx = prev.findIndex(p => p.member_id === saved.member_id && p.month === saved.month);
        if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
        return [...prev, saved];
      });
      setEditingPayment(null);
      toast.success('Payment saved');
    } catch {
      toast.error('Failed to save payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleScreenshotUpload = async (member_id: number, month: number, file: File) => {
    const key = `${member_id}-${month}`;
    setUploadingScreenshot(key);
    try {
      const path = await chittyService.uploadScreenshot(member_id, month, file);
      setPayments(prev => {
        const idx = prev.findIndex(p => p.member_id === member_id && p.month === month);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], screenshot_path: path };
          return next;
        }
        return prev;
      });
      toast.success('Screenshot uploaded');
    } catch {
      toast.error('Failed to upload screenshot');
    } finally {
      setUploadingScreenshot(null);
    }
  };

  const removeScreenshot = async (member_id: number, month: number) => {
    try {
      await chittyService.removeScreenshot(member_id, month);
      setPayments(prev => prev.map(p =>
        p.member_id === member_id && p.month === month ? { ...p, screenshot_path: null } : p
      ));
      toast.success('Screenshot removed');
    } catch {
      toast.error('Failed to remove screenshot');
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await chittyService.updateGroup(settingsForm);
      setGroup(updated);
      setSettingsForm(updated);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceMonth = async () => {
    if (!group) return;
    if (!window.confirm(`Advance to Month ${group.current_month + 1}? This will mark Month ${group.current_month} as paid.`)) return;
    setAdvancing(true);
    try {
      const result = await chittyService.advanceMonth();
      setGroup(result.group);
      setMembers(result.members);
      toast.success(`Advanced to Month ${result.group.current_month}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to advance month');
    } finally {
      setAdvancing(false);
    }
  };

  const saveCurrentMonth = async () => {
    const val = parseInt(currentMonthInput);
    if (!val || val < 1 || !group || val > group.total_members) {
      toast.error(`Enter a valid month (1–${group?.total_members})`);
      return;
    }
    setSavingCurrentMonth(true);
    try {
      const updated = await chittyService.updateGroup({ current_month: val });
      setGroup(updated);
      setSettingsForm(updated);
      setEditingCurrentMonth(false);
      toast.success(`Current month set to ${val}`);
    } catch {
      toast.error('Failed to update current month');
    } finally {
      setSavingCurrentMonth(false);
    }
  };

  const startEdit = (member: UserChitty) => {
    setEditingMember(member.id);
    setEditForm({
      member_name: member.member_name,
      payout_month: member.payout_month,
      penalties_due: member.penalties_due,
      status: member.status as 'active' | 'paid',
    });
  };

  const cancelEdit = () => { setEditingMember(null); };

  const saveEdit = async (id: number) => {
    try {
      const updated = await chittyService.updateMember(id, editForm);
      setMembers(prev => prev.map(m => m.id === id ? updated : m));
      setEditingMember(null);
      toast.success('Member updated');
    } catch {
      toast.error('Failed to update member');
    }
  };

  const togglePaid = async (member: UserChitty) => {
    setTogglingPaid(member.id);
    const newStatus = member.status === 'paid' ? 'active' : 'paid';
    const newPaidMonth = newStatus === 'paid' ? member.payout_month : null;
    try {
      const updated = await chittyService.updateMember(member.id, {
        status: newStatus,
        paid_month: newPaidMonth ?? undefined,
      });
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      toast.success(newStatus === 'paid' ? 'Marked as paid' : 'Marked as unpaid');
    } catch {
      toast.error('Failed to update payout status');
    } finally {
      setTogglingPaid(null);
    }
  };

  const openMarkPaid = (member: UserChitty) => {
    const today = new Date().toISOString().split('T')[0];
    setMarkPaidForm({ paid_at: today, phone: '', upi_id: '', notes: '', screenshot: null });
    setMarkPaidMember(member);
  };

  const submitMarkPaid = async () => {
    if (!markPaidMember || !group) return;
    setMarkPaidLoading(true);
    try {
      // Save payment record
      await chittyService.savePayment({
        member_id: markPaidMember.id,
        month: markPaidMember.payout_month,
        phone: markPaidForm.phone || undefined,
        upi_id: markPaidForm.upi_id || undefined,
        notes: markPaidForm.notes || undefined,
        paid_at: markPaidForm.paid_at || undefined,
      });
      // Upload screenshot if provided
      if (markPaidForm.screenshot) {
        await chittyService.uploadScreenshot(markPaidMember.id, markPaidMember.payout_month, markPaidForm.screenshot);
      }
      // Mark member as paid
      const updated = await chittyService.updateMember(markPaidMember.id, {
        status: 'paid',
        paid_month: markPaidMember.payout_month,
      });
      setMembers(prev => prev.map(m => m.id === markPaidMember.id ? updated : m));
      // Refresh payments list if loaded
      if (payments.length > 0) {
        const data = await chittyService.getAllPayments();
        setPayments(data);
      }
      setMarkPaidMember(null);
      toast.success(`${markPaidMember.member_name} marked as paid`);
    } catch {
      toast.error('Failed to save payment');
    } finally {
      setMarkPaidLoading(false);
    }
  };

  const confirmUnpaid = (member: UserChitty) => {
    setUnpaidConfirmMember(member);
  };

  const submitMarkUnpaid = async () => {
    if (!unpaidConfirmMember) return;
    setUnpaidLoading(true);
    try {
      // Delete the payment record
      await chittyService.deletePayment(unpaidConfirmMember.id, unpaidConfirmMember.payout_month);
      // Reset member status
      const updated = await chittyService.updateMember(unpaidConfirmMember.id, {
        status: 'active',
        paid_month: undefined,
      });
      setMembers(prev => prev.map(m => m.id === unpaidConfirmMember.id ? updated : m));
      // Remove from payments list if loaded
      setPayments(prev => prev.filter(p => !(p.member_id === unpaidConfirmMember.id && p.month === unpaidConfirmMember.payout_month)));
      setUnpaidConfirmMember(null);
      toast.success(`${unpaidConfirmMember.member_name} marked as unpaid`);
    } catch {
      toast.error('Failed to reset payment status');
    } finally {
      setUnpaidLoading(false);
    }
  };

  const handleMarkAllPaid = async () => {
    const unpaidMembers = members.filter(m => m.status === 'active');
    if (unpaidMembers.length === 0) { toast('All members are already marked as paid'); return; }
    if (!window.confirm(`Mark all ${unpaidMembers.length} unpaid members as paid with today's date?`)) return;
    setMarkAllPaidLoading(true);
    const today = new Date().toISOString().split('T')[0];
    let successCount = 0;
    try {
      for (const member of unpaidMembers) {
        try {
          await chittyService.savePayment({ member_id: member.id, month: member.payout_month, paid_at: today });
          await chittyService.updateMember(member.id, { status: 'paid', paid_month: member.payout_month });
          successCount++;
        } catch {
          // continue with others
        }
      }
      // Refresh members list
      const updatedMembers = await chittyService.getAllMembers();
      setMembers(updatedMembers);
      // Refresh payments if tab is open
      if (payments.length > 0) {
        const data = await chittyService.getAllPayments();
        setPayments(data);
      }
      toast.success(`${successCount} of ${unpaidMembers.length} members marked as paid`);
    } catch {
      toast.error('Failed to mark all as paid');
    } finally {
      setMarkAllPaidLoading(false);
    }
  };

  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    const id1 = parseInt(swapId1), id2 = parseInt(swapId2);
    if (!id1 || !id2 || id1 === id2) { toast.error('Select two different members'); return; }
    setSwapping(true);
    try {
      const updated = await chittyService.swapMonths(id1, id2);
      setMembers(updated);
      setSwapModal(false);
      setSwapId1(''); setSwapId2('');
      toast.success('Months swapped');
    } catch {
      toast.error('Failed to swap months');
    } finally {
      setSwapping(false);
    }
  };

  if (loading) return <div className="spinner-page"><div className="spinner"></div></div>;

  const paidCount = members.filter(m => m.status === 'paid').length;
  const currentMember = members.find(m => group && m.payout_month === group.current_month);
  const nextMember = members.find(m => group && m.payout_month === group.current_month + 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chitty Management</h1>
          <p className="page-subtitle">{group?.name} — {group?.total_members} members</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--gray-200)' }}>
        <button className={`tab-btn${activeTab === 'members' ? ' active' : ''}`} onClick={() => setActiveTab('members')}>
          Members
        </button>
        <button
          className={`tab-btn${activeTab === 'payments' ? ' active' : ''}`}
          onClick={() => { setActiveTab('payments'); if (payments.length === 0) fetchPayments(); }}
        >
          Payments
        </button>
        <button className={`tab-btn${activeTab === 'settings' ? ' active' : ''}`} onClick={() => setActiveTab('settings')}>
          Group Settings
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && group && (
        <div>
          {/* Summary bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div className="chitty-stat-card" style={{ borderLeftColor: 'var(--color-primary)' }}>
              {editingCurrentMonth ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    className="form-control"
                    style={{ width: 64, padding: '4px 8px', height: 'auto', fontSize: '1.25rem', fontWeight: 700 }}
                    min={1}
                    max={group.total_members}
                    value={currentMonthInput}
                    onChange={e => setCurrentMonthInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCurrentMonth(); if (e.key === 'Escape') setEditingCurrentMonth(false); }}
                    autoFocus
                  />
                  <button className="btn btn-primary btn-sm" onClick={saveCurrentMonth} disabled={savingCurrentMonth}>
                    <CheckIcon style={{ width: 13, height: 13 }} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingCurrentMonth(false)}>
                    <XMarkIcon style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="chitty-stat-num">{group.current_month}</div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', marginLeft: 'auto' }}
                    onClick={() => { setCurrentMonthInput(String(group.current_month)); setEditingCurrentMonth(true); }}
                    title="Edit current month"
                  >
                    <PencilSquareIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
              <div className="chitty-stat-label">Current Month</div>
            </div>
            <div className="chitty-stat-card" style={{ borderLeftColor: 'var(--color-success)' }}>
              <div className="chitty-stat-num">{paidCount}</div>
              <div className="chitty-stat-label">Paid Out</div>
            </div>
            <div className="chitty-stat-card" style={{ borderLeftColor: 'var(--color-warning, #f59e0b)' }}>
              <div className="chitty-stat-num">{group.total_members - paidCount}</div>
              <div className="chitty-stat-label">Remaining</div>
            </div>
            <div className="chitty-stat-card" style={{ borderLeftColor: 'var(--color-danger)' }}>
              <div className="chitty-stat-num">{members.filter(m => m.penalties_due > 0).length}</div>
              <div className="chitty-stat-label">With Penalties</div>
            </div>
          </div>

          {/* Current payout highlight */}
          {currentMember && (
            <div className="chitty-current-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CalendarDaysIcon style={{ width: 28, height: 28, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>Month {group.current_month} Payout</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{currentMember.member_name}</div>
                  <div style={{ fontSize: 13, opacity: 0.85 }}>
                    {formatPayoutMonth(group, currentMember.payout_month)} · {ordinal(group.payout_day)} of the month
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{formatCurrency(group.chitty_amount * group.total_members)}</span>
                {currentMember.status !== 'paid' ? (
                  <button
                    className="btn"
                    style={{ background: 'white', color: 'var(--color-primary)', fontWeight: 600, border: '2px solid white' }}
                    onClick={() => openMarkPaid(currentMember)}
                  >
                    <CheckIcon style={{ width: 16, height: 16 }} />
                    Mark Paid
                  </button>
                ) : (
                  <button
                    className="btn"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid white', fontWeight: 600 }}
                    onClick={() => confirmUnpaid(currentMember)}
                  >
                    <XMarkIcon style={{ width: 16, height: 16 }} /> Undo Paid
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Next payout info */}
          {nextMember && group.current_month < group.total_members && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
              gap: 12, padding: '14px 20px', borderRadius: 10, marginBottom: 16,
              background: 'var(--color-bg-secondary, #f1f5f9)',
              border: '1px solid var(--color-border, #e2e8f0)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CalendarDaysIcon style={{ width: 22, height: 22, color: 'var(--color-text-secondary, #64748b)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #64748b)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Next Payout — Month {group.current_month + 1}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{nextMember.member_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary, #64748b)' }}>
                    {formatPayoutMonth(group, nextMember.payout_month)} · {ordinal(group.payout_day)} of the month
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {formatCurrency(group.chitty_amount * group.total_members)}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => setSwapModal(true)}>
              <ArrowsRightLeftIcon style={{ width: 16, height: 16 }} />
              Swap Months
            </button>
            <button
              className="btn btn-success"
              onClick={handleMarkAllPaid}
              disabled={markAllPaidLoading || members.filter(m => m.status === 'active').length === 0}
            >
              <CheckCircleIcon style={{ width: 16, height: 16 }} />
              {markAllPaidLoading ? 'Marking...' : `Mark All Paid (${members.filter(m => m.status === 'active').length} remaining)`}
            </button>
            <button
              className="btn btn-warning"
              onClick={handleAdvanceMonth}
              disabled={advancing || group.current_month >= group.total_members}
            >
              <ArrowPathIcon style={{ width: 16, height: 16 }} />
              {advancing ? 'Advancing...' : `Advance to Month ${group.current_month + 1}`}
            </button>
          </div>

          {/* Member cards grid */}
          <div className="chitty-member-grid">
            {members.map(member => {
              const isCurrent = member.payout_month === group.current_month;
              const isPaid = member.status === 'paid';
              const isEditing = editingMember === member.id;
              const { month, year } = getCalendarInfo(group, isEditing ? editForm.payout_month : member.payout_month);

              return (
                <div
                  key={member.id}
                  className={`chitty-member-card${isCurrent ? ' current' : ''}${isPaid ? ' paid' : ''}`}
                >
                  {/* Card header */}
                  <div className="chitty-member-card-header">
                    <div className="chitty-member-avatar">
                      {isPaid
                        ? <CheckCircleSolid style={{ width: 20, height: 20 }} />
                        : member.member_index}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-control"
                          style={{ fontSize: 14, fontWeight: 600, padding: '4px 8px', height: 'auto' }}
                          value={editForm.member_name}
                          onChange={e => setEditForm(f => ({ ...f, member_name: e.target.value }))}
                        />
                      ) : (
                        <div className="chitty-member-name">{member.member_name}</div>
                      )}
                    </div>
                    {isCurrent && <span className="chitty-current-badge">Current</span>}
                  </div>

                  {/* Payout month */}
                  <div className="chitty-member-month">
                    <CalendarDaysIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    {isEditing ? (
                      <select
                        className="form-control"
                        style={{ fontSize: 13, padding: '3px 8px', height: 'auto', flex: 1 }}
                        value={editForm.payout_month}
                        onChange={e => setEditForm(f => ({ ...f, payout_month: parseInt(e.target.value) }))}
                      >
                        {Array.from({ length: group.total_members }, (_, i) => {
                          const { month: mn, year: yr } = getCalendarInfo(group, i + 1);
                          return <option key={i + 1} value={i + 1}>Month {i + 1} — {mn} {yr}</option>;
                        })}
                      </select>
                    ) : (
                      <span>Month {member.payout_month} — {month} {year}</span>
                    )}
                  </div>

                  {/* Penalties row */}
                  {(isEditing || member.penalties_due > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 10 }}>
                      <ExclamationTriangleIcon style={{ width: 13, height: 13, color: 'var(--color-warning, #f59e0b)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--gray-600)' }}>Penalty:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          className="form-control"
                          style={{ fontSize: 12, padding: '2px 6px', height: 'auto', width: 80 }}
                          min="0"
                          value={editForm.penalties_due}
                          onChange={e => setEditForm(f => ({ ...f, penalties_due: parseFloat(e.target.value) || 0 }))}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{formatCurrency(member.penalties_due)}</span>
                      )}
                    </div>
                  )}

                  {/* Payout status (edit mode) */}
                  {isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 10 }}>
                      <CheckCircleIcon style={{ width: 13, height: 13, color: 'var(--color-success)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--gray-600)' }}>Status:</span>
                      <select
                        className="form-control"
                        style={{ fontSize: 12, padding: '2px 6px', height: 'auto', flex: 1 }}
                        value={editForm.status}
                        onChange={e => setEditForm(f => ({ ...f, status: e.target.value as 'active' | 'paid' }))}
                      >
                        <option value="active">Active (unpaid)</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  )}

                  {/* Linked user badge */}
                  <div style={{ marginBottom: 10 }}>
                    {member.linked_user ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-success)', background: 'var(--color-success-light, #dcfce7)', padding: '3px 8px', borderRadius: 20, width: 'fit-content' }}>
                        <UserCircleIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{member.linked_user.name}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '3px 8px', borderRadius: 20, width: 'fit-content' }}>
                        <UserCircleIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
                        <span>No account linked</span>
                      </div>
                    )}
                  </div>

                  {/* Transfer badge */}
                  {member.transfer_requested === 1 && (
                    <div style={{ marginBottom: 10 }}>
                      <span className={`badge ${member.transfer_approved ? 'badge-approved' : 'badge-pending'}`} style={{ fontSize: 11 }}>
                        Transfer {member.transfer_approved ? 'Approved' : 'Requested'}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {isEditing ? (
                      <div className="chitty-member-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(member.id)}>
                          <CheckIcon style={{ width: 13, height: 13 }} /> Save
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                          <XMarkIcon style={{ width: 13, height: 13 }} /> Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="chitty-member-actions">
                          <button
                            className={`btn btn-sm ${isPaid ? 'btn-ghost' : 'btn-success'}`}
                            onClick={() => isPaid ? confirmUnpaid(member) : openMarkPaid(member)}
                            style={isPaid ? { color: 'var(--gray-500)', border: '1px solid var(--gray-200)' } : {}}
                          >
                            {isPaid
                              ? <><XMarkIcon style={{ width: 13, height: 13 }} /> Undo Paid</>
                              : <><CheckCircleIcon style={{ width: 13, height: 13 }} /> Mark Paid</>
                            }
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => startEdit(member)}>
                            <PencilSquareIcon style={{ width: 13, height: 13 }} /> Edit
                          </button>
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openLinkModal(member)}
                          style={{ width: '100%', justifyContent: 'center', color: 'var(--color-primary)', border: '1px dashed var(--color-primary)', borderRadius: 6, opacity: 0.8 }}
                        >
                          <LinkIcon style={{ width: 13, height: 13 }} />
                          {member.linked_user ? 'Change Linked User' : 'Link User Account'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group Settings Tab */}
      {activeTab === 'settings' && group && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Group Settings</h3>
              <p>Edit chitty group configuration</p>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleSettingsSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input type="text" className="form-control" value={settingsForm.name || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Contribution Per Member (₹)</label>
                  <input type="number" className="form-control" min="1" value={settingsForm.chitty_amount || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, chitty_amount: parseFloat(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payout Day (of month)</label>
                  <input type="number" className="form-control" min="1" max="28" value={settingsForm.payout_day || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, payout_day: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Subscription Deadline Day</label>
                  <input type="number" className="form-control" min="1" max="28" value={settingsForm.subscription_deadline_day || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, subscription_deadline_day: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Year</label>
                  <input type="number" className="form-control" min="2020" value={settingsForm.start_year || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, start_year: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Start Month (1–12)</label>
                  <input type="number" className="form-control" min="1" max="12" value={settingsForm.start_month || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, start_month: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Penalty Amount (₹)</label>
                  <input type="number" className="form-control" min="0" value={settingsForm.penalty_amount || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, penalty_amount: parseFloat(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Month</label>
                  <input type="number" className="form-control" min="1" max={group.total_members} value={settingsForm.current_month || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, current_month: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input type="text" className="form-control" value={settingsForm.upi_id || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, upi_id: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input type="text" className="form-control" value={settingsForm.account_number || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, account_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input type="text" className="form-control" value={settingsForm.ifsc_code || ''}
                    onChange={e => setSettingsForm(f => ({ ...f, ifsc_code: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && group && (
        <div>
          {/* Month filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Month:</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: group.total_members }, (_, i) => i + 1).map(m => (
                <button
                  key={m}
                  className={`btn btn-sm ${selectedMonth === m ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setSelectedMonth(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {paymentsLoading ? (
            <div className="spinner-page"><div className="spinner"></div></div>
          ) : (
            <div className="card">
              <div className="card-header">
                <div className="card-header-text">
                  <h3>Month {selectedMonth} — {formatPayoutMonth(group, selectedMonth)}</h3>
                  <p>Payment records for each member · ₹{group.chitty_amount.toLocaleString()} per member</p>
                </div>
              </div>
              {/* Paid/Unpaid summary */}
              {(() => {
                const paidCount = members.filter(m => {
                  const p = payments.find(px => px.member_id === m.id && px.month === selectedMonth);
                  return p?.paid_at;
                }).length;
                const unpaidCount = members.length - paidCount;
                return (
                  <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                      {paidCount} Paid
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                      {unpaidCount} Unpaid
                    </span>
                  </div>
                );
              })()}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>#</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Member</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Status</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Phone</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>UPI ID</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Paid On</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Screenshot</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Notes</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => {
                      const payment = payments.find(p => p.member_id === member.id && p.month === selectedMonth);
                      const uploadKey = `${member.id}-${selectedMonth}`;
                      const isUploading = uploadingScreenshot === uploadKey;
                      const hasData = payment && (payment.phone || payment.upi_id || payment.paid_at);
                      const isPaid = !!payment?.paid_at;
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid var(--gray-100)', background: isPaid ? 'rgba(34,197,94,0.04)' : undefined }}>
                          <td style={{ padding: '10px 16px', color: 'var(--gray-500)' }}>{member.member_index}</td>
                          <td style={{ padding: '10px 16px', fontWeight: 600 }}>{member.member_name}</td>
                          <td style={{ padding: '10px 16px' }}>
                            {isPaid ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#16a34a', borderRadius: 6, padding: '3px 10px', fontWeight: 600, fontSize: 12 }}>
                                ✓ Paid
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '3px 10px', fontWeight: 600, fontSize: 12 }}>
                                Unpaid
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13 }}>
                            {payment?.phone || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13 }}>
                            {payment?.upi_id || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 13 }}>
                            {payment?.paid_at
                              ? new Date(payment.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            {payment?.screenshot_path ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '2px 8px', color: 'var(--color-primary)', fontSize: 13 }}
                                  onClick={() => setScreenshotViewPath(`http://localhost:3000${payment.screenshot_path}`)}
                                >
                                  <PhotoIcon style={{ width: 16, height: 16 }} /> View
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '2px 6px', color: 'var(--color-danger)' }}
                                  onClick={() => removeScreenshot(member.id, selectedMonth)}
                                  title="Remove screenshot"
                                >
                                  <TrashIcon style={{ width: 13, height: 13 }} />
                                </button>
                              </div>
                            ) : (
                              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--gray-400)', fontSize: 13 }}>
                                <PhotoIcon style={{ width: 16, height: 16 }} />
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  disabled={isUploading}
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) handleScreenshotUpload(member.id, selectedMonth, file);
                                    e.target.value = '';
                                  }}
                                />
                                {isUploading ? 'Uploading...' : 'Upload'}
                              </label>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--gray-500)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {payment?.notes || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <button
                              className={`btn btn-sm ${hasData ? 'btn-ghost' : 'btn-secondary'}`}
                              style={{ fontSize: 12 }}
                              onClick={() => openPaymentEdit(member.id, selectedMonth)}
                            >
                              <CreditCardIcon style={{ width: 13, height: 13 }} />
                              {hasData ? 'Edit' : 'Add'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment Edit Modal */}
      {editingPayment && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setEditingPayment(null); }}
        >
          <div className="card" style={{ width: 400, margin: 0 }}>
            <div className="card-header">
              <div className="card-header-text">
                <h3>
                  Payment — {members.find(m => m.id === editingPayment.member_id)?.member_name || ''} · Month {editingPayment.month}
                </h3>
                <p>Enter payment details for this member</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingPayment(null)}>
                <XMarkIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Phone Number Used</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={paymentForm.phone}
                  onChange={e => setPaymentForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">UPI ID Used</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="name@upi"
                  value={paymentForm.upi_id}
                  onChange={e => setPaymentForm(f => ({ ...f, upi_id: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Paid On</label>
                <input
                  type="date"
                  className="form-control"
                  value={paymentForm.paid_at}
                  onChange={e => setPaymentForm(f => ({ ...f, paid_at: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional note"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setEditingPayment(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={savePayment} disabled={savingPayment}>
                  {savingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {markPaidMember && group && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setMarkPaidMember(null); }}
        >
          <div className="card" style={{ width: 440, margin: 0, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header">
              <div className="card-header-text">
                <h3>Mark as Paid — {markPaidMember.member_name}</h3>
                <p>Month {markPaidMember.payout_month} payout · {formatCurrency(group.chitty_amount * group.total_members)}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setMarkPaidMember(null)}>
                <XMarkIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Payout Amount</label>
                <div className="input-wrapper">
                  <span className="input-prefix">₹</span>
                  <input type="text" className="form-control input-with-prefix" value={(group.chitty_amount * group.total_members).toLocaleString('en-IN')} disabled />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date Paid</label>
                <input
                  type="date"
                  className="form-control"
                  value={markPaidForm.paid_at}
                  onChange={e => setMarkPaidForm(f => ({ ...f, paid_at: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+91 98765 43210"
                  value={markPaidForm.phone}
                  onChange={e => setMarkPaidForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">UPI ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="name@upi"
                  value={markPaidForm.upi_id}
                  onChange={e => setMarkPaidForm(f => ({ ...f, upi_id: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional note"
                  value={markPaidForm.notes}
                  onChange={e => setMarkPaidForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Screenshot</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', border: '1px dashed var(--gray-300)', borderRadius: 8 }}>
                  <PhotoIcon style={{ width: 18, height: 18, color: 'var(--gray-400)' }} />
                  <span style={{ fontSize: 13, color: markPaidForm.screenshot ? 'var(--color-success)' : 'var(--gray-500)' }}>
                    {markPaidForm.screenshot ? markPaidForm.screenshot.name : 'Click to upload screenshot'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setMarkPaidForm(f => ({ ...f, screenshot: file }));
                    }}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setMarkPaidMember(null)}>Cancel</button>
                <button className="btn btn-success" onClick={submitMarkPaid} disabled={markPaidLoading}>
                  <CheckCircleIcon style={{ width: 16, height: 16 }} />
                  {markPaidLoading ? 'Saving...' : 'Confirm Paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Undo Paid Confirmation */}
      {unpaidConfirmMember && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setUnpaidConfirmMember(null); }}
        >
          <div className="card" style={{ width: 400, margin: 0 }}>
            <div className="card-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <div className="card-header-text">
                <h3 style={{ color: '#dc2626' }}>Reset Payment — {unpaidConfirmMember.member_name}</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setUnpaidConfirmMember(null)}>
                <XMarkIcon style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
                <ExclamationTriangleIcon style={{ width: 24, height: 24, color: '#dc2626', flexShrink: 0 }} />
                <div style={{ fontSize: 14, color: 'var(--gray-700)', lineHeight: 1.6 }}>
                  This will <strong>delete all payment data</strong> (phone, UPI ID, screenshot, date) for{' '}
                  <strong>{unpaidConfirmMember.member_name}</strong>'s Month {unpaidConfirmMember.payout_month} payout and reset their status to unpaid.
                  <br /><br />This action cannot be undone.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setUnpaidConfirmMember(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={submitMarkUnpaid} disabled={unpaidLoading}>
                  <TrashIcon style={{ width: 16, height: 16 }} />
                  {unpaidLoading ? 'Resetting...' : 'Yes, Reset Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Viewer Overlay */}
      {screenshotViewPath && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}
          onClick={e => { if (e.target === e.currentTarget) setScreenshotViewPath(null); }}
        >
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10 }}>
            <a
              href={screenshotViewPath}
              download
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', color: '#1e293b', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              ↓ Download
            </a>
            <button
              onClick={() => setScreenshotViewPath(null)}
              style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
            >
              <XMarkIcon style={{ width: 20, height: 20 }} />
            </button>
          </div>
          <img
            src={screenshotViewPath}
            alt="Payment screenshot"
            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Link User Modal */}
      {linkModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setLinkModal(null); }}
        >
          <div className="card" style={{ width: 460, margin: 0 }}>
            <div className="card-header">
              <div className="card-header-text" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LinkIcon style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
                <div>
                  <h3>Link User Account</h3>
                  <p>Connect <strong>{linkModal.member_name}</strong> to an app user account</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              {linkModalLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-500)' }}>Loading users…</div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Select User Account</label>
                    <select
                      className="form-control"
                      value={selectedLinkUserId}
                      onChange={e => setSelectedLinkUserId(e.target.value)}
                    >
                      <option value="">— No link (unlink) —</option>
                      {linkableUsers.map(u => (
                        <option key={u.id} value={String(u.id)}>
                          {u.name} ({u.email}){u.phone ? ` • ${u.phone}` : ''}
                        </option>
                      ))}
                    </select>
                    {linkableUsers.length === 0 && !selectedLinkUserId && (
                      <p style={{ marginTop: 6, fontSize: 12, color: 'var(--gray-500)' }}>
                        No unlinked active user accounts available.
                      </p>
                    )}
                  </div>

                  {selectedLinkUserId && (
                    <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserCircleIcon style={{ width: 16, height: 16, color: 'var(--color-primary)', flexShrink: 0 }} />
                      <span>
                        <strong>{linkableUsers.find(u => u.id === parseInt(selectedLinkUserId))?.name}</strong> will be able to see their chitty details on their dashboard.
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setLinkModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleLinkSave} disabled={linkSaving}>
                      {linkSaving ? 'Saving…' : selectedLinkUserId ? 'Link User' : 'Remove Link'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Swap Modal */}
      {swapModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setSwapModal(false); setSwapId1(''); setSwapId2(''); } }}
        >
          <div className="card" style={{ width: 420, margin: 0 }}>
            <div className="card-header">
              <div className="card-header-text">
                <h3>Swap Payout Months</h3>
                <p>Select two members to exchange their assigned months</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSwap}>
                <div className="form-group">
                  <label className="form-label">Member 1</label>
                  <select className="form-control" value={swapId1} onChange={e => setSwapId1(e.target.value)} required>
                    <option value="">Select member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.member_name} — {group ? formatPayoutMonth(group, m.payout_month) : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Member 2</label>
                  <select className="form-control" value={swapId2} onChange={e => setSwapId2(e.target.value)} required>
                    <option value="">Select member...</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.member_name} — {group ? formatPayoutMonth(group, m.payout_month) : ''}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setSwapModal(false); setSwapId1(''); setSwapId2(''); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={swapping}>{swapping ? 'Swapping...' : 'Swap Months'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ordinal(n: number) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default AdminChitty;
