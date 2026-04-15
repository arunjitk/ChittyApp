import React, { useState, useEffect, useRef } from 'react';
import { loanService, LoanApplication, poolService, PoolSummary } from '../services/loanService';
import { formatCurrency, formatDate, getStatusText } from '../utils/format';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  CalendarIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  PlusCircleIcon,
  PencilSquareIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 'badge badge-pending';
    case 'swap_pending': return 'badge badge-pending';
    case 'approved': return 'badge badge-approved';
    case 'closed': return 'badge badge-closed';
    case 'foreclosed': return 'badge badge-foreclosed';
    case 'rejected': return 'badge badge-rejected';
    default: return 'badge badge-foreclosed';
  }
};

const getStatusLabel = (status: string): string => {
  if (status === 'swap_pending') return 'Swap Pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const AdminLoans: React.FC = () => {
  const [allLoans, setAllLoans] = useState<LoanApplication[]>([]);
  const [pendingLoans, setPendingLoans] = useState<LoanApplication[]>([]);
  const [activeLoans, setActiveLoans] = useState<LoanApplication[]>([]);
  const [adminSwapRequests, setAdminSwapRequests] = useState<any[]>([]);
  const [swappedLoans, setSwappedLoans] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'all' | 'pending' | 'active' | 'swap-queue' | 'swap-history' | 'pool'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pool management state
  const [poolSummary, setPoolSummary] = useState<PoolSummary | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [setBalanceAmount, setSetBalanceAmount] = useState('');
  const [setBalanceLoading, setSetBalanceLoading] = useState(false);
  const [setInterestAmount, setSetInterestAmount] = useState('');
  const [setInterestLoading, setSetInterestLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [resetInterestLoading, setResetInterestLoading] = useState(false);

  // Payment receipt modal state (close / foreclose)
  const [receiptModal, setReceiptModal] = useState<{ type: 'close' | 'foreclose'; loan: LoanApplication } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptDate, setReceiptDate] = useState('');
  const [foreclosureNotes, setForeclosureNotes] = useState('');
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  // Approve modal state
  const [approveModal, setApproveModal] = useState<LoanApplication | null>(null);
  const [approveDate, setApproveDate] = useState('');
  const [approveFile, setApproveFile] = useState<File | null>(null);
  const [approvePreview, setApprovePreview] = useState<string | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const approveFileRef = useRef<HTMLInputElement>(null);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<LoanApplication | null>(null);
  const [rejectDate, setRejectDate] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const refreshData = async () => {
    const [allData, pendingData, activeData, swapQueueData, swapHistoryData, poolData] = await Promise.all([
      loanService.getAllLoans(),
      loanService.getPendingLoans(),
      loanService.getActiveLoans(),
      loanService.getAdminSwapRequests().catch(() => []),
      loanService.getSwappedLoans().catch(() => []),
      poolService.getSummary().catch(() => null),
    ]);
    setAllLoans(allData);
    setPendingLoans(pendingData);
    setActiveLoans(activeData);
    setAdminSwapRequests(swapQueueData);
    setSwappedLoans(swapHistoryData);
    setPoolSummary(poolData);
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topUpAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setTopUpLoading(true);
    try {
      await poolService.addToPool(amt);
      toast.success(`Pool topped up by ${formatCurrency(amt)}`);
      setTopUpAmount('');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to top up pool');
    } finally { setTopUpLoading(false); }
  };

  const handleSetBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(setBalanceAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid non-negative amount'); return; }
    setSetBalanceLoading(true);
    try {
      await poolService.setAvailableBalance(amt);
      toast.success(`Available balance set to ${formatCurrency(amt)}`);
      setSetBalanceAmount('');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update balance');
    } finally { setSetBalanceLoading(false); }
  };

  const handleSetInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(setInterestAmount);
    if (isNaN(amt) || amt < 0) { toast.error('Enter a valid non-negative amount'); return; }
    setSetInterestLoading(true);
    try {
      await poolService.setInterestCollected(amt);
      toast.success(`Interest collected set to ${formatCurrency(amt)}`);
      setSetInterestAmount('');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update interest');
    } finally { setSetInterestLoading(false); }
  };

  const handleResetInterest = async () => {
    if (!window.confirm('Reset interest collected to ₹0?')) return;
    setResetInterestLoading(true);
    try {
      await poolService.resetInterest();
      toast.success('Interest collected reset to ₹0');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset interest');
    } finally { setResetInterestLoading(false); }
  };

  const handleTransferInterest = async () => {
    if (!poolSummary || poolSummary.total_interest_collected <= 0) {
      toast.error('No interest collected to transfer');
      return;
    }
    if (!window.confirm(`Transfer ${formatCurrency(poolSummary.total_interest_collected)} of interest into available balance?`)) return;
    setTransferLoading(true);
    try {
      await poolService.transferInterest();
      toast.success('Interest transferred to available balance');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to transfer interest');
    } finally { setTransferLoading(false); }
  };

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Failed to fetch loans:', error);
        toast.error('Failed to fetch loan data');
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const handleApprove = (loan: LoanApplication) => {
    setApproveFile(null);
    setApprovePreview(null);
    setApproveDate('');
    setApproveNotes('');
    setApproveModal(loan);
  };

  const handleApproveSubmit = async () => {
    if (!approveModal) return;
    if (!approveDate) { toast.error('Please enter the approved date'); return; }
    setApproveSubmitting(true);
    try {
      await loanService.approveLoan(approveModal.id, {
        adminNotes: approveNotes,
        approvedDate: approveDate,
        screenshot: approveFile || undefined,
      });
      toast.success('Loan approved successfully');
      setApproveModal(null);
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve loan');
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleReject = (loan: LoanApplication) => {
    setRejectDate('');
    setRejectReason('');
    setRejectModal(loan);
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
    if (!rejectDate) { toast.error('Please enter the rejection date'); return; }
    setRejectSubmitting(true);
    try {
      await loanService.rejectLoan(rejectModal.id, rejectReason.trim(), rejectDate);
      toast.success('Loan rejected');
      setRejectModal(null);
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject loan');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleClose = (loan: LoanApplication) => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptDate('');
    setForeclosureNotes('');
    setReceiptModal({ type: 'close', loan });
  };

  const handleDelete = async (loanId: number) => {
    if (!window.confirm('Permanently delete this loan record? This cannot be undone.')) return;
    setActionLoading(`delete-${loanId}`);
    try {
      await loanService.deleteLoan(loanId);
      toast.success('Loan deleted successfully');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete loan');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForeclose = (loan: LoanApplication) => {
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptDate('');
    setForeclosureNotes('');
    setReceiptModal({ type: 'foreclose', loan });
  };

  const handleReceiptSubmit = async () => {
    if (!receiptModal) return;
    if (!receiptDate) { toast.error('Please enter the payment received date'); return; }
    setReceiptSubmitting(true);
    try {
      const opts = { screenshot: receiptFile || undefined, paymentDate: receiptDate, adminNotes: foreclosureNotes };
      if (receiptModal.type === 'close') {
        await loanService.closeLoan(receiptModal.loan.id, opts);
        toast.success('Loan closed successfully');
      } else {
        await loanService.forecloseLoan(receiptModal.loan.id, opts);
        toast.success('Loan foreclosed successfully');
      }
      setReceiptModal(null);
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${receiptModal.type} loan`);
    } finally {
      setReceiptSubmitting(false);
    }
  };

  const handleApproveSwap = async (requestId: number) => {
    if (!window.confirm('Approve this swap? The loan will be reassigned to the requester.')) return;
    setActionLoading(`swap-approve-${requestId}`);
    try {
      await loanService.approveSwapAdmin(requestId);
      toast.success('Swap approved — loan reassigned');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve swap');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSwap = async (requestId: number) => {
    if (!window.confirm('Reject this swap request?')) return;
    setActionLoading(`swap-reject-${requestId}`);
    try {
      await loanService.rejectSwapAdmin(requestId);
      toast.success('Swap request rejected');
      await refreshData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject swap');
    } finally {
      setActionLoading(null);
    }
  };

  const getCurrentLoans = () => {
    switch (selectedTab) {
      case 'pending': return pendingLoans;
      case 'active': return activeLoans;
      default: return allLoans;
    }
  };

  if (loading) {
    return (
      <div className="spinner-page">
        <div className="spinner"></div>
      </div>
    );
  }

  const currentLoans = getCurrentLoans();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Loan Management</h1>
          <p className="page-subtitle">Manage all loan applications and approvals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs section">
        <button
          className={`tab-btn${selectedTab === 'pending' ? ' active' : ''}`}
          onClick={() => setSelectedTab('pending')}
        >
          Pending ({pendingLoans.length})
        </button>
        <button
          className={`tab-btn${selectedTab === 'active' ? ' active' : ''}`}
          onClick={() => setSelectedTab('active')}
        >
          Active ({activeLoans.length})
        </button>
        <button
          className={`tab-btn${selectedTab === 'all' ? ' active' : ''}`}
          onClick={() => setSelectedTab('all')}
        >
          All Loans ({allLoans.length})
        </button>
        <button
          className={`tab-btn${selectedTab === 'swap-queue' ? ' active' : ''}`}
          onClick={() => setSelectedTab('swap-queue')}
        >
          Swap Queue {adminSwapRequests.length > 0 && `(${adminSwapRequests.length})`}
        </button>
        <button
          className={`tab-btn${selectedTab === 'swap-history' ? ' active' : ''}`}
          onClick={() => setSelectedTab('swap-history')}
        >
          Swap History {swappedLoans.length > 0 && `(${swappedLoans.length})`}
        </button>
        <button
          className={`tab-btn${selectedTab === 'pool' ? ' active' : ''}`}
          onClick={() => setSelectedTab('pool')}
        >
          Pool Management
        </button>
      </div>

      {/* Loans Table */}
      {(selectedTab === 'pending' || selectedTab === 'active' || selectedTab === 'all') && (
        <div className="card section">
          {currentLoans.length === 0 ? (
            <div className="empty-state">
              <DocumentTextIcon className="empty-state-icon" style={{ width: 48, height: 48 }} />
              <div className="empty-state-title">No loans found</div>
              <p className="empty-state-text">There are no loans in this category.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Applicant</th>
                    <th>Amount</th>
                    <th>Applied On</th>
                    <th>Repayment Date</th>
                    <th>Interest</th>
                    <th>Total Due</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLoans.map((loan) => (
                    <tr key={loan.id}>
                      <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        #{loan.id.toString().padStart(4, '0')}
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            <UserIcon style={{ width: 14, height: 14 }} />
                          </div>
                          <div>
                            <div className="user-cell-name">{loan.user_name}</div>
                            <div className="user-cell-email">{loan.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{formatCurrency(loan.amount)}</td>
                      <td className="nowrap">{formatDate(loan.applied_on)}</td>
                      <td className="nowrap">{formatDate(loan.repayment_date)}</td>
                      <td>
                        {formatCurrency(loan.interest_amount)}
                        {loan.status === 'foreclosed' && (
                          <span title="Actual interest at foreclosure date" style={{ marginLeft: 4, fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>⚡actual</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(loan.total_due)}</td>
                      <td>
                        <span className={getStatusBadgeClass(loan.status)}>
                          {getStatusLabel(loan.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          {loan.status === 'pending' && (
                            <>
                              <button
                                className="action-btn approve"
                                onClick={() => handleApprove(loan)}
                                disabled={actionLoading === `approve-${loan.id}`}
                                title="Approve"
                              >
                                <CheckCircleIcon style={{ width: 18, height: 18 }} />
                              </button>
                              <button
                                className="action-btn reject"
                                onClick={() => handleReject(loan)}
                                disabled={actionLoading === `reject-${loan.id}`}
                                title="Reject"
                              >
                                <XCircleIcon style={{ width: 18, height: 18 }} />
                              </button>
                            </>
                          )}
                          {loan.status === 'approved' && (
                            <>
                              <button
                                className="action-btn close"
                                onClick={() => handleClose(loan)}
                                disabled={actionLoading === `close-${loan.id}`}
                                title="Close Loan"
                              >
                                <CheckCircleIcon style={{ width: 18, height: 18 }} />
                              </button>
                              <button
                                className="action-btn foreclose"
                                onClick={() => handleForeclose(loan)}
                                disabled={actionLoading === `foreclose-${loan.id}`}
                                title="Foreclose"
                              >
                                <CalendarIcon style={{ width: 18, height: 18 }} />
                              </button>
                            </>
                          )}
                          <button
                            className="action-btn reject"
                            onClick={() => handleDelete(loan.id)}
                            disabled={actionLoading === `delete-${loan.id}`}
                            title="Delete Loan"
                          >
                            <TrashIcon style={{ width: 18, height: 18 }} />
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

      {/* Swap Approval Queue */}
      {selectedTab === 'swap-queue' && (
        <div className="card section">
          {adminSwapRequests.length === 0 ? (
            <div className="empty-state">
              <ArrowsRightLeftIcon className="empty-state-icon" style={{ width: 48, height: 48 }} />
              <div className="empty-state-title">No pending swap requests</div>
              <p className="empty-state-text">No loan swaps are awaiting admin approval.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Loan</th>
                    <th>Original Owner</th>
                    <th>Requesting User</th>
                    <th>Amount</th>
                    <th>Repayment Date</th>
                    <th>Owner Approved</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminSwapRequests.map((req: any) => (
                    <tr key={req.id}>
                      <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>#{req.id.toString().padStart(4, '0')}</td>
                      <td style={{ color: 'var(--gray-600)', fontWeight: 600 }}>Loan #{req.loan_id.toString().padStart(4, '0')}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            <UserIcon style={{ width: 14, height: 14 }} />
                          </div>
                          <div>
                            <div className="user-cell-name">{req.owner_name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar" style={{ background: '#8b5cf620' }}>
                            <ArrowsRightLeftIcon style={{ width: 14, height: 14, color: '#8b5cf6' }} />
                          </div>
                          <div>
                            <div className="user-cell-name">{req.requester_name}</div>
                            <div className="user-cell-email">{req.requester_email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{formatCurrency(req.amount)}</td>
                      <td className="nowrap">{formatDate(req.repayment_date)}</td>
                      <td className="nowrap">{req.owner_approved_at ? formatDate(req.owner_approved_at) : '—'}</td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="action-btn approve"
                            onClick={() => handleApproveSwap(req.id)}
                            disabled={actionLoading === `swap-approve-${req.id}`}
                            title="Approve Swap"
                          >
                            <CheckCircleIcon style={{ width: 18, height: 18 }} />
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={() => handleRejectSwap(req.id)}
                            disabled={actionLoading === `swap-reject-${req.id}`}
                            title="Reject Swap"
                          >
                            <XCircleIcon style={{ width: 18, height: 18 }} />
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

      {/* Swap History */}
      {selectedTab === 'swap-history' && (
        <div className="card section">
          {swappedLoans.length === 0 ? (
            <div className="empty-state">
              <ArrowsRightLeftIcon className="empty-state-icon" style={{ width: 48, height: 48 }} />
              <div className="empty-state-title">No swap history</div>
              <p className="empty-state-text">No loan swaps have been completed yet.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Swap ID</th>
                    <th>Loan</th>
                    <th>Original Owner</th>
                    <th>New Owner</th>
                    <th>Amount</th>
                    <th>Repayment Date</th>
                    <th>Swapped On</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {swappedLoans.map((swap: any) => (
                    <tr key={swap.id}>
                      <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>#{swap.id.toString().padStart(4, '0')}</td>
                      <td style={{ color: 'var(--gray-600)', fontWeight: 600 }}>Loan #{swap.loan_id.toString().padStart(4, '0')}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar">
                            <UserIcon style={{ width: 14, height: 14 }} />
                          </div>
                          <div>
                            <div className="user-cell-name">{swap.original_owner_name || '—'}</div>
                            <div className="user-cell-email">{swap.original_owner_email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="user-cell">
                          <div className="user-cell-avatar" style={{ background: '#22c55e20' }}>
                            <ArrowsRightLeftIcon style={{ width: 14, height: 14, color: '#16a34a' }} />
                          </div>
                          <div>
                            <div className="user-cell-name">{swap.new_owner_name}</div>
                            <div className="user-cell-email">{swap.new_owner_email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{formatCurrency(swap.amount)}</td>
                      <td className="nowrap">{formatDate(swap.repayment_date)}</td>
                      <td className="nowrap">{swap.admin_approved_at ? formatDate(swap.admin_approved_at) : '—'}</td>
                      <td>
                        <button
                          className="action-btn reject"
                          title="Delete"
                          disabled={actionLoading === `swap-delete-${swap.id}`}
                          onClick={async () => {
                            if (!window.confirm('Delete this swap history record?')) return;
                            setActionLoading(`swap-delete-${swap.id}`);
                            try {
                              await loanService.deleteSwapRequest(swap.id);
                              toast.success('Swap record deleted');
                              await refreshData();
                            } catch (error: any) {
                              toast.error(error.response?.data?.error || 'Failed to delete swap record');
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                        >
                          <TrashIcon style={{ width: 16, height: 16 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pool Management */}
      {selectedTab === 'pool' && (
        <>
          {/* Pool Summary */}
          {poolSummary && (
            <div className="card section">
              <div className="card-header">
                <div className="card-header-text">
                  <h3>Pool Summary</h3>
                  <p>Current state of the loan pool</p>
                </div>
              </div>
              <div className="card-body">
                <div className="desc-row">
                  <span className="desc-label">Total Pool Amount</span>
                  <span className="desc-value" style={{ fontWeight: 600 }}>{formatCurrency(poolSummary.total_pool)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Amount Disbursed</span>
                  <span className="desc-value">{formatCurrency(poolSummary.amount_disbursed)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Available Balance</span>
                  <span className="desc-value" style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatCurrency(poolSummary.available_balance)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Total Interest Collected</span>
                  <span className="desc-value">{formatCurrency(poolSummary.total_interest_collected)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Active Loans Total</span>
                  <span className="desc-value">{formatCurrency(poolSummary.active_loans_total)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Expected Interest (active loans)</span>
                  <span className="desc-value" style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{formatCurrency(poolSummary.expected_interest)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Top Up Pool */}
          <div className="card section">
            <div className="card-header">
              <div className="card-header-text">
                <h3>Top Up Pool Amount</h3>
                <p>Add funds to increase the maximum available loan balance</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleTopUp} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" htmlFor="topup-amount">Amount to Add (₹)</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">₹</span>
                    <input
                      id="topup-amount"
                      type="number"
                      className="form-control input-with-prefix"
                      min="1"
                      step="100"
                      value={topUpAmount}
                      onChange={e => setTopUpAmount(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={topUpLoading} style={{ whiteSpace: 'nowrap' }}>
                  <PlusCircleIcon style={{ width: 16, height: 16 }} />
                  {topUpLoading ? 'Adding…' : 'Add to Pool'}
                </button>
              </form>
            </div>
          </div>

          {/* Loan Amount Management */}
          <div className="card section">
            <div className="card-header">
              <div className="card-header-text">
                <h3>Loan Amount Management</h3>
                <p>Directly adjust available balance and interest collected</p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Set Available Balance */}
              <form onSubmit={handleSetBalance}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Set Available Balance</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <div className="input-wrapper">
                      <span className="input-prefix">₹</span>
                      <input
                        type="number"
                        className="form-control input-with-prefix"
                        min="0"
                        step="100"
                        value={setBalanceAmount}
                        onChange={e => setSetBalanceAmount(e.target.value)}
                        placeholder={poolSummary ? String(poolSummary.available_balance) : '0'}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={setBalanceLoading} style={{ whiteSpace: 'nowrap' }}>
                    <PencilSquareIcon style={{ width: 16, height: 16 }} />
                    {setBalanceLoading ? 'Saving…' : 'Set Balance'}
                  </button>
                </div>
              </form>

              <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)' }} />

              {/* Set / Reset Interest */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>
                  Interest Collected&nbsp;
                  <span style={{ fontWeight: 400, color: 'var(--gray-500)' }}>
                    (current: {poolSummary ? formatCurrency(poolSummary.total_interest_collected) : '₹0'})
                  </span>
                </div>
                <form onSubmit={handleSetInterest} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <div className="input-wrapper">
                        <span className="input-prefix">₹</span>
                        <input
                          type="number"
                          className="form-control input-with-prefix"
                          min="0"
                          step="50"
                          value={setInterestAmount}
                          onChange={e => setSetInterestAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-secondary" disabled={setInterestLoading} style={{ whiteSpace: 'nowrap' }}>
                      <PencilSquareIcon style={{ width: 16, height: 16 }} />
                      {setInterestLoading ? 'Saving…' : 'Edit Interest'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={resetInterestLoading}
                      onClick={handleResetInterest}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <TrashIcon style={{ width: 16, height: 16 }} />
                      {resetInterestLoading ? 'Resetting…' : 'Reset to ₹0'}
                    </button>
                  </div>
                </form>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={transferLoading || !poolSummary || poolSummary.total_interest_collected <= 0}
                  onClick={handleTransferInterest}
                  style={{ width: '100%' }}
                >
                  <ArrowsRightLeftIcon style={{ width: 16, height: 16 }} />
                  {transferLoading
                    ? 'Transferring…'
                    : `Transfer ${poolSummary ? formatCurrency(poolSummary.total_interest_collected) : '₹0'} Interest → Available Balance`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>Action Legend</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="legend">
            <div className="legend-item">
              <CheckCircleIcon style={{ width: 18, height: 18, color: 'var(--color-success)' }} />
              <span>Approve / Close — Move loan forward in lifecycle</span>
            </div>
            <div className="legend-item">
              <XCircleIcon style={{ width: 18, height: 18, color: 'var(--color-danger)' }} />
              <span>Reject — Cancel application with reason</span>
            </div>
            <div className="legend-item">
              <CalendarIcon style={{ width: 18, height: 18, color: 'var(--color-warning)' }} />
              <span>Foreclose — Early settlement</span>
            </div>
            <div className="legend-item">
              <PencilIcon style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
              <span>Edit — Modify loan details</span>
            </div>
            <div className="legend-item">
              <TrashIcon style={{ width: 18, height: 18, color: 'var(--color-danger)' }} />
              <span>Delete — Permanently remove loan record</span>
            </div>
            <div className="legend-item">
              <ArrowsRightLeftIcon style={{ width: 18, height: 18, color: '#8b5cf6' }} />
              <span>Swap Queue — Approve or reject pending loan swap requests</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {receiptModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setReceiptModal(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(10,15,30,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 20,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
            animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <style>{`
              @keyframes modalPop {
                from { opacity: 0; transform: scale(0.88) translateY(24px); }
                to   { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>

            {/* Gradient header */}
            <div style={{
              background: receiptModal.type === 'close'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: '24px 28px 20px',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 12, right: 16,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
              }} />
              <div style={{
                position: 'absolute', top: -16, right: 40,
                width: 50, height: 50, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              }} />
              <div style={{ fontSize: 32, marginBottom: 4 }}>
                {receiptModal.type === 'close' ? '✅' : '⚡'}
              </div>
              <h2 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 700 }}>
                {receiptModal.type === 'close' ? 'Close Loan' : 'Foreclose Loan'}
              </h2>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                Loan #{receiptModal.loan.id} — {receiptModal.loan.user_name || 'Member'} — Principal {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(receiptModal.loan.amount)}
                {receiptModal.type === 'foreclose' && (
                  <span style={{ display: 'block', fontSize: 11, marginTop: 2, color: 'rgba(255,255,255,0.7)' }}>
                    Interest recalculated at actual foreclosure date ↓
                  </span>
                )}
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Date picker */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Payment Received Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={e => setReceiptDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = receiptModal.type === 'close' ? '#10b981' : '#f59e0b'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Screenshot upload */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Payment Screenshot <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  ref={receiptFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setReceiptFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setReceiptPreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    } else {
                      setReceiptPreview(null);
                    }
                  }}
                />
                {receiptPreview ? (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                    <img src={receiptPreview} alt="Preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (receiptFileRef.current) receiptFileRef.current.value = ''; }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        border: 'none', borderRadius: '50%', width: 28, height: 28,
                        cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                ) : (
                  <button
                    onClick={() => receiptFileRef.current?.click()}
                    style={{
                      width: '100%', padding: '18px', borderRadius: 12,
                      border: '2px dashed #d1d5db', background: '#f9fafb',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 8, color: '#6b7280',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = receiptModal.type === 'close' ? '#10b981' : '#f59e0b'; (e.currentTarget as HTMLButtonElement).style.background = '#f0fdf4'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'; (e.currentTarget as HTMLButtonElement).style.background = '#f9fafb'; }}
                  >
                    <span style={{ fontSize: 28 }}>📸</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Click to upload payment screenshot</span>
                    <span style={{ fontSize: 11 }}>PNG, JPG, JPEG up to 10MB</span>
                  </button>
                )}
              </div>

              {/* Foreclosure interest breakdown */}
              {receiptModal.type === 'foreclose' && (() => {
                const approvedOn = receiptModal.loan.approved_on;
                const msPerDay = 24 * 60 * 60 * 1000;
                let daysElapsed = 0;
                let weeksCharged = 0;
                let calcInterest = 0;
                let calcTotal = receiptModal.loan.amount;
                if (approvedOn && receiptDate) {
                  const approvedDate = new Date(approvedOn);
                  const foreDate = new Date(receiptDate + 'T23:59:59');
                  daysElapsed = Math.max(0, Math.floor((foreDate.getTime() - approvedDate.getTime()) / msPerDay));
                  weeksCharged = Math.max(0, Math.floor((daysElapsed - 15) / 7));
                  calcInterest = weeksCharged * 50;
                  calcTotal = receiptModal.loan.amount + calcInterest;
                }
                const inGrace = daysElapsed <= 15;
                const daysUntilCharge = inGrace ? (15 - daysElapsed) : (7 - ((daysElapsed - 15) % 7));
                return (
                  <div style={{
                    borderRadius: 12,
                    border: `2px solid ${inGrace ? '#d1fae5' : calcInterest === 0 ? '#d1fae5' : '#fde68a'}`,
                    background: inGrace ? '#f0fdf4' : calcInterest === 0 ? '#f0fdf4' : '#fffbeb',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      background: inGrace ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#f59e0b,#d97706)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: 16 }}>{inGrace ? '🛡️' : calcInterest === 0 ? '✅' : '⚠️'}</span>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>
                        Interest at Foreclosure
                      </span>
                      {!receiptDate && (
                        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginLeft: 'auto' }}>
                          Select payment date above
                        </span>
                      )}
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {!receiptDate ? (
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
                          Interest will be calculated once you select the payment received date.
                        </p>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Days Since Approval</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: '#1f2937' }}>{daysElapsed}</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 8, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Weeks Charged</div>
                              <div style={{ fontSize: 20, fontWeight: 800, color: weeksCharged > 0 ? '#f59e0b' : '#10b981' }}>{weeksCharged}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                              <span>Grace period (15 days)</span>
                              <span style={{ fontWeight: 600, color: inGrace ? '#10b981' : '#6b7280' }}>
                                {inGrace ? `✓ Active (${15 - daysElapsed}d left)` : '✗ Expired'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                              <span>Interest (₹50 × {weeksCharged} weeks)</span>
                              <span style={{ fontWeight: 700, color: calcInterest > 0 ? '#f59e0b' : '#10b981' }}>
                                {calcInterest > 0 ? `₹${calcInterest}` : '₹0'}
                              </span>
                            </div>
                            <div style={{ height: 1, background: '#e5e7eb', margin: '2px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#111827' }}>
                              <span style={{ fontWeight: 600 }}>Total Amount Due</span>
                              <span style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>
                                ₹{calcTotal.toLocaleString('en-IN')}
                              </span>
                            </div>
                            {!inGrace && (
                              <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right' }}>
                                Next ₹50 charge in {daysUntilCharge} day{daysUntilCharge !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Foreclosure notes */}
              {receiptModal.type === 'foreclose' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Foreclosure Notes <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                  </label>
                  <textarea
                    value={foreclosureNotes}
                    onChange={e => setForeclosureNotes(e.target.value)}
                    placeholder="Enter reason or details for foreclosure…"
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                      resize: 'vertical', fontFamily: 'inherit',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#f59e0b'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setReceiptModal(null)}
                  disabled={receiptSubmitting}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: '2px solid #e5e7eb', background: 'white',
                    color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiptSubmit}
                  disabled={receiptSubmitting || !receiptDate}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: receiptModal.type === 'close'
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    boxShadow: receiptModal.type === 'close'
                      ? '0 4px 14px rgba(16,185,129,0.4)'
                      : '0 4px 14px rgba(245,158,11,0.4)',
                    opacity: !receiptDate ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {receiptSubmitting
                    ? (receiptModal.type === 'close' ? 'Closing…' : 'Foreclosing…')
                    : (receiptModal.type === 'close' ? '✓ Confirm Close' : '⚡ Confirm Foreclose')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Loan Modal */}
      {approveModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setApproveModal(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(10,15,30,0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 20,
            width: '100%',
            maxWidth: 500,
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
            animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              padding: '24px 28px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 12, right: 16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', top: -16, right: 40, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ fontSize: 32, marginBottom: 4 }}>✅</div>
              <h2 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 700 }}>Approve Loan</h2>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                Loan #{approveModal.id} — {approveModal.user_name || 'Member'} — {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(approveModal.amount)}
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Approved date */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Approved Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={approveDate}
                  onChange={e => setApproveDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Screenshot upload */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Payment Screenshot <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <input
                  ref={approveFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setApproveFile(file);
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setApprovePreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    } else {
                      setApprovePreview(null);
                    }
                  }}
                />
                {!approvePreview ? (
                  <div
                    onClick={() => approveFileRef.current?.click()}
                    style={{
                      border: '2px dashed #c7d2fe',
                      borderRadius: 12,
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#eef2ff',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e0e7ff')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#eef2ff')}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📤</div>
                    <p style={{ margin: 0, fontSize: 13, color: '#6366f1', fontWeight: 600 }}>Click to upload payment proof</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>PNG, JPG, HEIC up to 10MB</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 12px rgba(99,102,241,0.2)' }}>
                    <img src={approvePreview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={() => { setApproveFile(null); setApprovePreview(null); if (approveFileRef.current) approveFileRef.current.value = ''; }}
                      style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(239,68,68,0.9)', color: 'white',
                        border: 'none', borderRadius: 8, padding: '4px 10px',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}
                    >✕ Remove</button>
                  </div>
                )}
              </div>

              {/* Admin notes (optional) */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Notes <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                </label>
                <textarea
                  value={approveNotes}
                  onChange={e => setApproveNotes(e.target.value)}
                  placeholder="Any notes for the member..."
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setApproveModal(null)}
                  disabled={approveSubmitting}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: '2px solid #e5e7eb', background: 'white',
                    color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveSubmit}
                  disabled={approveSubmitting || !approveDate}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                    opacity: (!approveDate || approveSubmitting) ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {approveSubmitting ? 'Approving…' : '✓ Confirm Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Loan Modal */}
      {rejectModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(10,15,30,0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{
            background: 'white',
            borderRadius: 20,
            width: '100%',
            maxWidth: 480,
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
            animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              padding: '24px 28px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 12, right: 16, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', top: -16, right: 40, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ fontSize: 32, marginBottom: 4 }}>🚫</div>
              <h2 style={{ margin: 0, color: 'white', fontSize: 20, fontWeight: 700 }}>Reject Loan</h2>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                Loan #{rejectModal.id} — {rejectModal.user_name || 'Member'} — {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(rejectModal.amount)}
              </p>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Rejection date */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Rejection Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={rejectDate}
                  onChange={e => setRejectDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#ef4444'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Rejection reason */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why this loan is being rejected..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '2px solid #e5e7eb', fontSize: 14, outline: 'none',
                    resize: 'vertical', boxSizing: 'border-box', transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#ef4444'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setRejectModal(null)}
                  disabled={rejectSubmitting}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 10,
                    border: '2px solid #e5e7eb', background: 'white',
                    color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={rejectSubmitting || !rejectDate || !rejectReason.trim()}
                  style={{
                    flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239,68,68,0.4)',
                    opacity: (!rejectDate || !rejectReason.trim() || rejectSubmitting) ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {rejectSubmitting ? 'Rejecting…' : '🚫 Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoans;
