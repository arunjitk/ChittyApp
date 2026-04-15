import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { poolService, loanService } from '../services/loanService';
import { chittyService, ChittyGroup, UserChitty, ChittyPayment, PayoutInfo, ScheduleEntry, MyChittyData, ChittyScheduleMonth } from '../services/chittyService';
import { formatCurrency, formatDate, getStatusColor, getStatusText } from '../utils/format';
import toast from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  PhotoIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface DashboardData {
  available_balance: number;
  total_pool: number;
  total_interest_collected: number;
  pending_count: number;
  expected_interest: number;
}

function ordinalSuffix(n: number): string {
  const s = ['th','st','nd','rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function getPayoutMonthLabel(group: ChittyGroup, payoutMonth: number): string {
  const offset = (group.start_month - 1) + (payoutMonth - 1);
  const calendarMonth = (offset % 12) + 1;
  const year = group.start_year + Math.floor(offset / 12);
  return `${MONTH_NAMES[calendarMonth - 1]} ${year}`;
}

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending': return 'badge badge-pending';
    case 'approved': return 'badge badge-approved';
    case 'closed': return 'badge badge-closed';
    case 'foreclosed': return 'badge badge-foreclosed';
    case 'rejected': return 'badge badge-rejected';
    default: return 'badge badge-foreclosed';
  }
};

const UserDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chittyData, setChittyData] = useState<MyChittyData | null>(null);
  const [myPayments, setMyPayments] = useState<ChittyPayment[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [screenshotViewPath, setScreenshotViewPath] = useState<string | null>(null);
  const [pendingLoans, setPendingLoans] = useState<any[]>([]);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [swapActionLoading, setSwapActionLoading] = useState<Record<number, boolean>>({});
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [loanDetailModal, setLoanDetailModal] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, loansData, chitty, payments, pending, swaps] = await Promise.all([
          poolService.getDashboard(),
          loanService.getMyLoans(),
          chittyService.getMyChitty().catch(() => null),
          chittyService.getMyPayments().catch(() => []),
          loanService.getPendingPublic().catch(() => []),
          loanService.getMySwapRequests().catch(() => []),
        ]);
        setDashboard(dashboardData);
        setLoans(loansData);
        setChittyData(chitty);
        setMyPayments(payments);
        setPendingLoans(pending);
        setSwapRequests(swaps);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="spinner-page">
        <div className="spinner"></div>
      </div>
    );
  }

  const activeLoans = loans.filter((loan) => loan.status === 'approved');
  const closedLoans = loans.filter((loan) => loan.status === 'closed' || loan.status === 'foreclosed');
  const rejectedLoans = loans.filter((loan) => loan.status === 'rejected');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your loans and pool status</p>
        </div>
        <Link to="/apply-loan" className="btn btn-primary">
          + Apply for Loan
        </Link>
      </div>

      {/* Stats */}
      <div className="stat-grid section">
        <div className="stat-card">
          <div className="stat-icon green">
            <CurrencyDollarIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Available Pool</div>
            <div className="stat-value">
              {dashboard ? formatCurrency(dashboard.available_balance) : '₹0'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <BanknotesIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pool</div>
            <div className="stat-value">
              {dashboard ? formatCurrency(dashboard.total_pool) : '₹0'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon yellow">
            <ClockIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">My Active Loans</div>
            <div className="stat-value">{activeLoans.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <DocumentTextIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Interest Collected</div>
            <div className="stat-value">
              {dashboard ? formatCurrency(dashboard.total_interest_collected) : '₹0'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <ArrowTrendingUpIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Expected Interest</div>
            <div className="stat-value">
              {dashboard ? formatCurrency(dashboard.expected_interest) : '₹0'}
            </div>
          </div>
        </div>
      </div>

      {/* Payout Schedule */}
      {chittyData && (chittyData.currentPayout || chittyData.nextPayout) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Payout Schedule
            </div>
            {chittyData.schedule?.length > 0 && (
              <button
                onClick={() => setShowTimeline(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 20,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                  transition: 'opacity 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
              >
                <CalendarDaysIcon style={{ width: 15, height: 15 }} />
                View Full Timeline
              </button>
            )}
          </div>
        <div style={{ display: 'grid', gridTemplateColumns: chittyData.nextPayout ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Current payout */}
          {chittyData.currentPayout && (
            <div style={{
              background: 'linear-gradient(135deg, #1664c0, #2563eb)',
              borderRadius: 12,
              padding: '20px 24px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.8, marginBottom: 4, textTransform: 'uppercase' }}>
                Current Payout · Month {chittyData.currentPayout.month}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
                {chittyData.currentPayout.member_name}
                {chittyData.currentPayout.is_me && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.25)', borderRadius: 6, padding: '2px 8px' }}>You</span>
                )}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
                {chittyData.currentPayout.month_name} {chittyData.currentPayout.year} · {chittyData.currentPayout.payout_day}{ordinalSuffix(chittyData.currentPayout.payout_day)} of the month
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {formatCurrency(chittyData.currentPayout.amount)}
              </div>
              {chittyData.currentPayout.status === 'paid' && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 6, padding: '3px 10px' }}>
                  ✓ Paid Out
                </div>
              )}
            </div>
          )}

          {/* Next payout */}
          {chittyData.nextPayout && (
            <div style={{
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 12,
              padding: '20px 24px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--gray-500)', marginBottom: 4, textTransform: 'uppercase' }}>
                Next Payout · Month {chittyData.nextPayout.month}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 2 }}>
                {chittyData.nextPayout.member_name}
                {chittyData.nextPayout.is_me && (
                  <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, background: 'var(--color-primary)', color: 'white', borderRadius: 6, padding: '2px 8px' }}>You</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                {chittyData.nextPayout.month_name} {chittyData.nextPayout.year} · {chittyData.nextPayout.payout_day}{ordinalSuffix(chittyData.nextPayout.payout_day)} of the month
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-primary)' }}>
                {formatCurrency(chittyData.nextPayout.amount)}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* My Chitty Fund Section */}
      {chittyData && !chittyData.linked && (
        <div style={{ marginBottom: 24, background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <InformationCircleIcon style={{ width: 24, height: 24, color: 'var(--color-primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: 2 }}>Chitty Fund — Not Linked</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>Your account is not yet linked to a Chitty slot. Contact your admin to link your account.</div>
          </div>
        </div>
      )}

      {chittyData?.linked && chittyData.member && chittyData.payout_schedule.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            My Chitty Fund
          </div>

          {/* 3 stat cards */}
          {(() => {
            const member = chittyData.member!;
            const group = chittyData.group;
            const schedule = chittyData.payout_schedule;
            const currentEntry = schedule.find(e => e.is_current);
            const paidCount = schedule.filter(e => !e.is_recipient && e.contribution_status === 'paid').length;
            const totalContrib = group.total_members - 1; // one month is payout
            const payoutLabel = chittyData.payoutInfo?.formatted?.split(' - ')[1]?.split(' (')[0] || getPayoutMonthLabel(group, member.payout_month);
            const payoutEntry = schedule.find(e => e.is_recipient);

            let thisMonthLabel = '—';
            let thisMonthColor = 'var(--gray-500)';
            if (currentEntry) {
              if (currentEntry.is_recipient) {
                thisMonthLabel = payoutEntry?.payout_status === 'received' ? 'Received!' : 'Payout Month!';
                thisMonthColor = 'var(--color-success)';
              } else {
                const s = currentEntry.contribution_status;
                if (s === 'paid') { thisMonthLabel = 'Paid'; thisMonthColor = 'var(--color-success)'; }
                else if (s === 'due') { thisMonthLabel = 'Due Now'; thisMonthColor = 'var(--color-warning, #f59e0b)'; }
                else if (s === 'unpaid') { thisMonthLabel = 'Overdue'; thisMonthColor = 'var(--color-danger)'; }
              }
            }

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  <div style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: 12, padding: '18px 20px', color: 'white' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>My Payout Month</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>{payoutLabel}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>Month {member.payout_month} of {group.total_members}</div>
                  </div>
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>This Month</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: thisMonthColor }}>{thisMonthLabel}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>{formatCurrency(group.chitty_amount)} contribution</div>
                  </div>
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '18px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Progress</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-primary)' }}>{paidCount} / {totalContrib}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>Contributions paid</div>
                  </div>
                </div>

                {/* 12-month timeline */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {schedule.map((entry: ChittyScheduleMonth) => {
                    const isPayoutMonth = entry.is_recipient;
                    const isPast = entry.is_past;
                    const isCurrent = entry.is_current;

                    let cardBg = 'var(--gray-50)';
                    let cardBorder = '1px solid var(--gray-200)';
                    let cardRing = 'none';
                    let statusColor = 'var(--gray-400)';
                    let statusText = 'Upcoming';
                    let amountColor = 'var(--gray-600)';

                    if (isPayoutMonth) {
                      const ps = entry.payout_status;
                      cardBg = 'linear-gradient(135deg, #fef3c7, #fde68a)';
                      cardBorder = '1px solid #f59e0b';
                      if (ps === 'received') { statusText = 'Received'; statusColor = '#b45309'; }
                      else if (ps === 'pending') { statusText = 'Your Payout'; statusColor = '#92400e'; }
                      else if (ps === 'missed') { statusText = 'Missed'; statusColor = 'var(--color-danger)'; }
                      else { statusText = 'Your Month'; statusColor = '#92400e'; }
                      amountColor = '#78350f';
                    } else if (!isPast && !isCurrent) {
                      statusText = 'Upcoming';
                      statusColor = 'var(--gray-400)';
                      amountColor = 'var(--gray-500)';
                    } else {
                      const cs = entry.contribution_status;
                      if (cs === 'paid') { cardBg = '#f0fdf4'; cardBorder = '1px solid #bbf7d0'; statusText = 'Paid'; statusColor = 'var(--color-success)'; amountColor = '#166534'; }
                      else if (cs === 'due') { cardBg = '#fffbeb'; cardBorder = '1px solid #fde68a'; statusText = 'Due'; statusColor = '#d97706'; amountColor = '#92400e'; }
                      else if (cs === 'unpaid') { cardBg = '#fef2f2'; cardBorder = '1px solid #fecaca'; statusText = 'Unpaid'; statusColor = 'var(--color-danger)'; amountColor = '#991b1b'; }
                    }

                    if (isCurrent) {
                      cardRing = '0 0 0 2px var(--color-primary)';
                    }

                    return (
                      <div
                        key={entry.month}
                        style={{
                          background: cardBg,
                          border: cardBorder,
                          borderRadius: 10,
                          padding: '12px 14px',
                          boxShadow: cardRing,
                          position: 'relative',
                          transition: 'transform 0.15s',
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {isCurrent && (
                          <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-primary)', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>
                            CURRENT
                          </div>
                        )}
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4 }}>
                          Month {entry.month}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6, lineHeight: 1.3 }}>
                          {entry.calendar_label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: amountColor, marginBottom: 6 }}>
                          {isPayoutMonth
                            ? formatCurrency(entry.payout_amount || 0)
                            : formatCurrency(entry.contribution_amount || 0)
                          }
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {isPayoutMonth && <span>★ </span>}{statusText}
                        </div>
                        {entry.paid_at && (
                          <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4 }}>
                            {new Date(entry.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Pending Loans Queue */}
      {pendingLoans.length > 0 && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Pending Loan Queue</h3>
              <p>All pending applications — first come, first served. Click a tile to see details.</p>
            </div>
            <span className="badge badge-pending">{pendingLoans.length} pending</span>
          </div>
          <div className="loans-list">
            {pendingLoans.map(loan => {
              const alreadyRequested = !!loan.my_swap_request;
              const requestStatus = loan.my_swap_request?.status;
              return (
                <div
                  key={loan.id}
                  className="loan-list-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedLoan(loan)}
                >
                  <div className="loan-list-left">
                    <DocumentTextIcon className="loan-list-icon" style={{ width: 28, height: 28 }} />
                    <div>
                      <div className="loan-list-amount">{formatCurrency(loan.amount)}</div>
                      <div className="loan-list-due" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>Due: {formatDate(loan.repayment_date)}</span>
                        {loan.is_mine && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#2563eb', color: 'white', borderRadius: 4, padding: '1px 6px' }}>Your Loan</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{loan.purpose}</div>
                    </div>
                  </div>
                  <div className="loan-list-right" onClick={e => e.stopPropagation()}>
                    <div className="loan-list-total">
                      <div className="loan-list-total-amt">{formatCurrency(loan.total_due)}</div>
                      <div className="loan-list-total-label">Total due</div>
                    </div>
                    {!loan.is_mine && (
                      alreadyRequested ? (
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: requestStatus === 'rejected' ? 'var(--color-danger)' : requestStatus === 'approved' ? 'var(--color-success)' : 'var(--gray-500)',
                          whiteSpace: 'nowrap',
                        }}>
                          {requestStatus === 'rejected' ? '✗ Rejected' : requestStatus === 'approved' ? '✓ Approved' : '⏳ Swap Requested'}
                        </span>
                      ) : (
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: 12, whiteSpace: 'nowrap' }}
                          disabled={swapActionLoading[loan.id]}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setSwapActionLoading(prev => ({ ...prev, [loan.id]: true }));
                            try {
                              await loanService.requestSwap(loan.id);
                              toast.success('Swap request submitted');
                              const updated = await loanService.getPendingPublic().catch(() => pendingLoans);
                              setPendingLoans(updated);
                            } catch (err: any) {
                              toast.error(err.response?.data?.error || 'Failed to request swap');
                            } finally {
                              setSwapActionLoading(prev => ({ ...prev, [loan.id]: false }));
                            }
                          }}
                        >
                          <ArrowsRightLeftIcon style={{ width: 14, height: 14 }} />
                          {swapActionLoading[loan.id] ? 'Requesting…' : 'Request Swap'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Incoming Swap Requests on My Loans */}
      {swapRequests.length > 0 && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Swap Requests on My Loans</h3>
              <p>Other members want to take your loan position</p>
            </div>
            <span className="badge badge-pending">{swapRequests.filter((r: any) => r.status === 'pending_owner').length} pending</span>
          </div>
          <div className="loans-list">
            {swapRequests.map((req: any) => (
              <div key={req.id} className="loan-list-item">
                <div className="loan-list-left">
                  <ArrowsRightLeftIcon className="loan-list-icon" style={{ width: 28, height: 28, color: '#8b5cf6' }} />
                  <div>
                    <div className="loan-list-amount" style={{ fontSize: 15 }}>{req.requester_name || 'Another member'}</div>
                    <div className="loan-list-due">
                      Wants your {formatCurrency(req.amount)} loan · Due {formatDate(req.repayment_date)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      Requested {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="loan-list-right">
                  {req.status === 'pending_owner' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-success"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        disabled={swapActionLoading[req.id]}
                        onClick={async () => {
                          setSwapActionLoading(prev => ({ ...prev, [req.id]: true }));
                          try {
                            await loanService.approveSwapOwner(req.id);
                            toast.success('Swap approved — pending admin review');
                            const updated = await loanService.getMySwapRequests().catch(() => swapRequests);
                            setSwapRequests(updated);
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Failed to approve');
                          } finally {
                            setSwapActionLoading(prev => ({ ...prev, [req.id]: false }));
                          }
                        }}
                      >
                        <CheckIcon style={{ width: 14, height: 14 }} />
                        {swapActionLoading[req.id] ? '…' : 'Approve'}
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        disabled={swapActionLoading[req.id]}
                        onClick={async () => {
                          setSwapActionLoading(prev => ({ ...prev, [req.id]: true }));
                          try {
                            await loanService.rejectSwapOwner(req.id);
                            toast.success('Swap request rejected');
                            const updated = await loanService.getMySwapRequests().catch(() => swapRequests);
                            setSwapRequests(updated);
                          } catch (err: any) {
                            toast.error(err.response?.data?.error || 'Failed to reject');
                          } finally {
                            setSwapActionLoading(prev => ({ ...prev, [req.id]: false }));
                          }
                        }}
                      >
                        <XMarkIcon style={{ width: 14, height: 14 }} />
                        {swapActionLoading[req.id] ? '…' : 'Reject'}
                      </button>
                    </div>
                  ) : (
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: req.status === 'rejected' ? 'var(--color-danger)' : req.status === 'approved' ? 'var(--color-success)' : 'var(--gray-500)',
                    }}>
                      {req.status === 'rejected' ? '✗ Rejected' : req.status === 'approved' ? '✓ Approved' : req.status === 'pending_admin' ? '⏳ Awaiting Admin' : req.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Loans */}
      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>Active Loans</h3>
            <p>Your currently approved loans</p>
          </div>
          {activeLoans.length > 0 && (
            <span className="badge badge-active-count">{activeLoans.length} active</span>
          )}
        </div>

        {activeLoans.length === 0 ? (
          <div className="empty-state">
            <DocumentTextIcon className="empty-state-icon" style={{ width: 48, height: 48 }} />
            <div className="empty-state-title">No active loans</div>
            <p className="empty-state-text">You have no approved loans at the moment.</p>
            <Link to="/apply-loan" className="btn btn-primary">
              Apply for a Loan
            </Link>
          </div>
        ) : (
          <div className="loans-list">
            {activeLoans.map((loan) => (
              <div
                key={loan.id}
                className="loan-list-item"
                onClick={() => setLoanDetailModal(loan)}
                style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                onMouseOut={e => (e.currentTarget.style.background = '')}
              >
                <div className="loan-list-left">
                  <DocumentTextIcon className="loan-list-icon" style={{ width: 28, height: 28 }} />
                  <div>
                    <div className="loan-list-amount">{formatCurrency(loan.amount)}</div>
                    <div className="loan-list-due">Due: {formatDate(loan.repayment_date)}</div>
                  </div>
                </div>
                <div className="loan-list-right">
                  <span className={getStatusBadgeClass(loan.status)}>
                    {getStatusText(loan.status)}
                  </span>
                  <div className="loan-list-total">
                    <div className="loan-list-total-amt">{formatCurrency(loan.total_due)}</div>
                    <div className="loan-list-total-label">Total due</div>
                  </div>
                  <InformationCircleIcon style={{ width: 18, height: 18, color: 'var(--color-primary)', opacity: 0.6 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed / Foreclosed Loans */}
      {closedLoans.length > 0 && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Loan History</h3>
              <p>Closed and foreclosed loans with repayment details</p>
            </div>
            <DocumentTextIcon style={{ width: 24, height: 24, color: 'var(--color-primary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {closedLoans.map(loan => (
              <div key={loan.id} onClick={() => setLoanDetailModal(loan)} style={{
                borderRadius: 14,
                border: `1.5px solid ${loan.status === 'closed' ? '#d1fae5' : '#fde68a'}`,
                background: loan.status === 'closed' ? '#f0fdf4' : '#fffbeb',
                padding: '16px 18px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, transform 0.12s',
              }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: loan.status === 'closed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {loan.status === 'closed' ? '✅' : '⚡'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.amount)}
                      </div>
                      {loan.purpose && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{loan.purpose}</div>
                      )}
                    </div>
                  </div>
                  <span className={getStatusBadgeClass(loan.status)} style={{ fontSize: 12 }}>
                    {loan.status === 'closed' ? 'Closed' : 'Foreclosed'}
                  </span>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Repayment Date</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                      {loan.repayment_date
                        ? new Date(loan.repayment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Payment Received</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: loan.payment_received_date ? '#059669' : '#9ca3af' }}>
                      {loan.payment_received_date
                        ? new Date(loan.payment_received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Not recorded'}
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total Paid</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.total_due)}
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                      {loan.status === 'closed' ? 'Closed On' : 'Foreclosed On'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                      {(loan.closed_on || loan.foreclosed_on)
                        ? new Date(loan.closed_on || loan.foreclosed_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                </div>

                {/* Screenshot link */}
                {loan.screenshot_path && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PhotoIcon style={{ width: 15, height: 15, color: '#6b7280' }} />
                    <a
                      href={`http://localhost:3000${loan.screenshot_path}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}
                    >
                      View Payment Screenshot
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Loans */}
      {rejectedLoans.length > 0 && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>Rejected Applications</h3>
              <p>Loan applications that were not approved</p>
            </div>
            <XCircleIcon style={{ width: 24, height: 24, color: 'var(--color-danger)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rejectedLoans.map(loan => (
              <div key={loan.id} style={{
                borderRadius: 14,
                border: '1.5px solid #fca5a5',
                background: 'linear-gradient(135deg, #fff5f5, #fff1f2)',
                padding: '16px 18px',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0,
                    }}>🚫</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.amount)}
                      </div>
                      {loan.purpose && (
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{loan.purpose}</div>
                      )}
                    </div>
                  </div>
                  <span className="badge badge-rejected" style={{ fontSize: 12 }}>Rejected</span>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: loan.admin_notes ? 10 : 0 }}>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Applied On</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                      {loan.applied_on ? new Date(loan.applied_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Rejected On</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
                      {loan.rejected_on ? new Date(loan.rejected_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Amount Requested</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.amount)}
                    </div>
                  </div>
                </div>

                {/* Rejection reason */}
                {loan.admin_notes && (
                  <div style={{
                    background: '#fff1f2', border: '1px solid #fca5a5',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>💬</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Rejection Reason</div>
                      <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5 }}>{loan.admin_notes}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chitty Card */}
      {chittyData && chittyData.group && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>{chittyData.group.name}</h3>
              <p>Your chitty details and payment information</p>
            </div>
            <CalendarDaysIcon style={{ width: 24, height: 24, color: 'var(--color-primary)' }} />
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Chitty Details</div>
                <div className="desc-row">
                  <span className="desc-label">Monthly Contribution</span>
                  <span className="desc-value" style={{ fontWeight: 600 }}>{formatCurrency(chittyData.group.chitty_amount)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Payout Value</span>
                  <span className="desc-value" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(chittyData.group.chitty_amount * chittyData.group.total_members)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Payout Month</span>
                  <span className="desc-value" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {chittyData.member
                      ? getPayoutMonthLabel(chittyData.group, chittyData.member.payout_month)
                      : 'Not assigned'}
                  </span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Subscription Deadline</span>
                  <span className="desc-value">{chittyData.group.subscription_deadline_day}th of each month</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Current Month</span>
                  <span className="desc-value">Month {chittyData.group.current_month} of {chittyData.group.total_members}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Payment Info</div>
                <div className="desc-row">
                  <span className="desc-label">UPI ID</span>
                  <span className="desc-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{chittyData.group.upi_id}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Account No.</span>
                  <span className="desc-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{chittyData.group.account_number}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">IFSC Code</span>
                  <span className="desc-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{chittyData.group.ifsc_code}</span>
                </div>
              </div>
            </div>

            {chittyData.member ? (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--color-primary-light, #eff6ff)', borderRadius: 8, border: '1px solid var(--color-primary-border, #bfdbfe)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Your Slot</div>
                <div className="desc-row">
                  <span className="desc-label">Name</span>
                  <span className="desc-value" style={{ fontWeight: 600 }}>{chittyData.member.member_name}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Status</span>
                  <span className="desc-value">
                    <span className={`badge ${chittyData.member.status === 'paid' ? 'badge-closed' : chittyData.member.status === 'transferred' ? 'badge-foreclosed' : 'badge-approved'}`}>
                      {chittyData.member.status.charAt(0).toUpperCase() + chittyData.member.status.slice(1)}
                    </span>
                  </span>
                </div>
                {chittyData.member.penalties_due > 0 && (
                  <div className="desc-row">
                    <span className="desc-label">Penalties Due</span>
                    <span className="desc-value" style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{formatCurrency(chittyData.member.penalties_due)}</span>
                  </div>
                )}
                {chittyData.member.status === 'active' && !chittyData.member.transfer_requested && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12 }}
                      onClick={async () => {
                        try {
                          await chittyService.requestTransfer(chittyData.member!.id);
                          const updated = await chittyService.getMyChitty();
                          setChittyData(updated);
                        } catch {}
                      }}
                    >
                      Request Transfer
                    </button>
                  </div>
                )}
                {chittyData.member.transfer_requested === 1 && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-500)' }}>
                    Transfer request pending admin approval
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 13, color: 'var(--gray-500)' }}>
                Your account is not linked to a chitty slot. Contact the admin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chitty Payment History */}
      {myPayments.length > 0 && (
        <div className="card section">
          <div className="card-header">
            <div className="card-header-text">
              <h3>My Payout History and Details</h3>
              <p>Payment records recorded by the admin</p>
            </div>
            <CreditCardIcon style={{ width: 24, height: 24, color: 'var(--color-primary)' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Month</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Phone Used</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>UPI ID</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Paid On</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Screenshot</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--gray-600)' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.map(p => (
                  <tr key={`${p.member_id}-${p.month}`} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                      Month {p.month}
                      {chittyData?.group && (
                        <span style={{ fontWeight: 400, color: 'var(--gray-500)', marginLeft: 6, fontSize: 12 }}>
                          ({getPayoutMonthLabel(chittyData.group, p.month)})
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13 }}>
                      {p.phone || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 13 }}>
                      {p.upi_id || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13 }}>
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : <span style={{ color: 'var(--gray-400)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {p.screenshot_path ? (
                        <button
                          onClick={() => setScreenshotViewPath(`http://localhost:3000${p.screenshot_path}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-primary)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <PhotoIcon style={{ width: 16, height: 16 }} /> View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--gray-400)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--gray-500)' }}>
                      {p.notes || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Timeline Modal */}
      {showTimeline && chittyData && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowTimeline(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(10,15,30,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            background: 'var(--color-bg, #fff)',
            borderRadius: 20,
            width: '100%', maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '22px 28px 18px',
              borderBottom: '1px solid var(--gray-200)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
              color: 'white',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.7, textTransform: 'uppercase', marginBottom: 4 }}>
                  {chittyData.group.name}
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Complete Payout Timeline</h2>
                <div style={{ fontSize: 13, opacity: 0.75, marginTop: 3 }}>
                  {chittyData.group.total_members} members · {formatCurrency(chittyData.group.chitty_amount)}/month · Payout on {chittyData.group.payout_day}{ordinalSuffix(chittyData.group.payout_day)}
                </div>
              </div>
              <button
                onClick={() => setShowTimeline(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
            </div>

            {/* Timeline body */}
            <div style={{ overflowY: 'auto', padding: '24px 28px', flex: 1 }}>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24, fontSize: 12 }}>
                {[
                  { color: '#22c55e', label: 'Paid Out' },
                  { color: '#1664c0', label: 'Current Month' },
                  { color: '#8b5cf6', label: 'Upcoming' },
                  { color: '#f59e0b', label: 'Your Month' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Timeline items */}
              <div style={{ position: 'relative' }}>
                {/* Vertical connector line */}
                <div style={{
                  position: 'absolute', left: 19, top: 10, bottom: 10, width: 2,
                  background: 'linear-gradient(180deg, #22c55e, #1664c0, #6366f1, #8b5cf6, #a855f7)',
                  borderRadius: 2,
                }} />

                {chittyData.schedule.map((entry, idx) => {
                  const isCurrent = entry.payout_month === chittyData.group.current_month;
                  const isPast = entry.payout_month < chittyData.group.current_month;
                  const isPaid = entry.status === 'paid';
                  const isMe = entry.is_me;
                  const total = chittyData.group.total_members;

                  // Pick a gradient color per position
                  const gradients = [
                    '#22c55e','#16a34a','#059669','#0d9488','#0891b2',
                    '#1664c0','#2563eb','#4f46e5','#6366f1','#7c3aed','#8b5cf6','#a855f7',
                  ];
                  const dotColor = isPaid ? '#22c55e' : isCurrent ? '#1664c0' : gradients[Math.min(idx, gradients.length - 1)];
                  const cardBg = isPaid
                    ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                    : isCurrent
                    ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                    : isMe
                    ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                    : 'var(--gray-50, #f8fafc)';
                  const cardBorder = isPaid ? '#86efac' : isCurrent ? '#93c5fd' : isMe ? '#fcd34d' : 'var(--gray-200)';
                  const opacity = isPast && !isPaid ? 0.65 : 1;

                  return (
                    <div
                      key={entry.payout_month}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 16,
                        marginBottom: idx < total - 1 ? 16 : 0,
                        opacity,
                      }}
                    >
                      {/* Dot */}
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: dotColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: 13,
                        boxShadow: isCurrent ? `0 0 0 4px rgba(22,100,192,0.2)` : isMe ? `0 0 0 4px rgba(245,158,11,0.25)` : 'none',
                        position: 'relative', zIndex: 1,
                      }}>
                        {entry.payout_month}
                      </div>

                      {/* Card */}
                      <div style={{
                        flex: 1, padding: '12px 16px', borderRadius: 12,
                        background: cardBg,
                        border: `1.5px solid ${cardBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{entry.member_name}</span>
                            {isMe && (
                              <span style={{ fontSize: 11, fontWeight: 700, background: '#f59e0b', color: 'white', borderRadius: 6, padding: '2px 7px', letterSpacing: '0.04em' }}>YOU</span>
                            )}
                            {isCurrent && (
                              <span style={{ fontSize: 11, fontWeight: 700, background: '#1664c0', color: 'white', borderRadius: 6, padding: '2px 7px' }}>CURRENT</span>
                            )}
                            {isPaid && (
                              <span style={{ fontSize: 11, fontWeight: 700, background: '#22c55e', color: 'white', borderRadius: 6, padding: '2px 7px' }}>✓ PAID</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 500 }}>
                            {entry.month_name} {entry.year} · {chittyData.group.payout_day}{ordinalSuffix(chittyData.group.payout_day)} of the month
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: isPaid ? '#16a34a' : isCurrent ? '#1664c0' : 'var(--gray-700)', whiteSpace: 'nowrap' }}>
                          {formatCurrency(chittyData.group.chitty_amount * chittyData.group.total_members)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--gray-50)' }}>
              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                Month {chittyData.group.current_month} of {chittyData.group.total_members} · {chittyData.schedule.filter(s => s.status === 'paid').length} paid out
              </div>
              <button
                onClick={() => setShowTimeline(false)}
                style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--color-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>Quick Actions</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            <Link to="/apply-loan" className="btn btn-primary">
              Apply for New Loan
            </Link>
            <Link to="/my-loans" className="btn btn-secondary">
              View All My Loans
            </Link>
            <Link to="/approved-loans" className="btn btn-secondary">
              Approved Loans Board
            </Link>
          </div>
        </div>
      </div>

      {/* Loan Detail Popup */}
      {selectedLoan && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelectedLoan(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1500,
            background: 'rgba(10,15,30,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            background: 'var(--color-bg, #fff)',
            borderRadius: 16,
            width: '100%', maxWidth: 480,
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '18px 24px 14px',
              background: 'linear-gradient(135deg, #1e3a5f, #1664c0)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', opacity: 0.75, textTransform: 'uppercase', marginBottom: 3 }}>
                  Loan #{selectedLoan.id.toString().padStart(4, '0')}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{formatCurrency(selectedLoan.amount)}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>Due: {formatDate(selectedLoan.repayment_date)}</div>
              </div>
              <button
                onClick={() => setSelectedLoan(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 24px' }}>
              {/* Loan details */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Loan Details</div>
                <div className="desc-row">
                  <span className="desc-label">Purpose</span>
                  <span className="desc-value">{selectedLoan.purpose}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Interest</span>
                  <span className="desc-value">{formatCurrency(selectedLoan.interest_amount)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Total Due</span>
                  <span className="desc-value" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(selectedLoan.total_due)}</span>
                </div>
                <div className="desc-row">
                  <span className="desc-label">Applied On</span>
                  <span className="desc-value">{formatDate(selectedLoan.applied_on)}</span>
                </div>
              </div>

              {/* Requester info */}
              <div style={{ marginBottom: selectedLoan.my_swap_request ? 16 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {selectedLoan.is_mine ? 'Your Loan' : 'Loan Owner'}
                </div>
                <div style={{
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <UserCircleIcon style={{ width: 32, height: 32, color: 'var(--color-primary)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>{selectedLoan.user_name || '—'}</div>
                      {selectedLoan.is_mine && <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>This is your loan</div>}
                    </div>
                  </div>
                  {selectedLoan.user_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-700)' }}>
                      <EnvelopeIcon style={{ width: 15, height: 15, color: 'var(--gray-400)', flexShrink: 0 }} />
                      <span>{selectedLoan.user_email}</span>
                    </div>
                  )}
                  {selectedLoan.user_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--gray-700)' }}>
                      <PhoneIcon style={{ width: 15, height: 15, color: 'var(--gray-400)', flexShrink: 0 }} />
                      <span>{selectedLoan.user_phone}</span>
                    </div>
                  )}
                  {!selectedLoan.user_phone && !selectedLoan.user_email && (
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>No contact info on file</div>
                  )}
                </div>
              </div>

              {/* Swap request status */}
              {selectedLoan.my_swap_request && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Your Swap Request</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: selectedLoan.my_swap_request.status === 'approved' ? '#f0fdf4' : selectedLoan.my_swap_request.status === 'rejected' ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${selectedLoan.my_swap_request.status === 'approved' ? '#86efac' : selectedLoan.my_swap_request.status === 'rejected' ? '#fca5a5' : '#bfdbfe'}`,
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <ArrowsRightLeftIcon style={{ width: 20, height: 20, color: selectedLoan.my_swap_request.status === 'approved' ? '#16a34a' : selectedLoan.my_swap_request.status === 'rejected' ? '#dc2626' : '#2563eb', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)' }}>
                        Requesting to swap with <strong>{selectedLoan.user_name}</strong>
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2, color: selectedLoan.my_swap_request.status === 'approved' ? '#16a34a' : selectedLoan.my_swap_request.status === 'rejected' ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
                        {selectedLoan.my_swap_request.status === 'approved' ? '✓ Approved' : selectedLoan.my_swap_request.status === 'rejected' ? '✗ Rejected' : selectedLoan.my_swap_request.status === 'pending_admin' ? '⏳ Awaiting admin approval' : '⏳ Awaiting owner approval'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {!selectedLoan.is_mine && !selectedLoan.my_swap_request && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 13 }}
                  disabled={swapActionLoading[selectedLoan.id]}
                  onClick={async () => {
                    setSwapActionLoading(prev => ({ ...prev, [selectedLoan.id]: true }));
                    try {
                      await loanService.requestSwap(selectedLoan.id);
                      toast.success('Swap request submitted');
                      const updated = await loanService.getPendingPublic().catch(() => pendingLoans);
                      setPendingLoans(updated);
                      setSelectedLoan(null);
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || 'Failed to request swap');
                    } finally {
                      setSwapActionLoading(prev => ({ ...prev, [selectedLoan.id]: false }));
                    }
                  }}
                >
                  <ArrowsRightLeftIcon style={{ width: 14, height: 14 }} />
                  {swapActionLoading[selectedLoan.id] ? 'Requesting…' : 'Request Swap'}
                </button>
              )}
              <button
                className="btn btn-primary"
                style={{ fontSize: 13 }}
                onClick={() => setSelectedLoan(null)}
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Loan Detail Modal (active / closed / foreclosed) */}
      {loanDetailModal && (() => {
        const loan = loanDetailModal;
        const isClosed = loan.status === 'closed';
        const isForeclosed = loan.status === 'foreclosed';
        const isDone = isClosed || isForeclosed;
        const headerGradient = isClosed
          ? 'linear-gradient(135deg, #064e3b, #059669)'
          : isForeclosed
          ? 'linear-gradient(135deg, #78350f, #d97706)'
          : 'linear-gradient(135deg, #1e3a5f, #1664c0)';
        const accentColor = isClosed ? '#059669' : isForeclosed ? '#d97706' : '#1664c0';
        const lightBg = isClosed ? '#f0fdf4' : isForeclosed ? '#fffbeb' : '#eff6ff';
        const lightBorder = isClosed ? '#86efac' : isForeclosed ? '#fcd34d' : '#bfdbfe';
        const icon = isClosed ? '✅' : isForeclosed ? '⚡' : '💳';

        // Interest breakdown for active loans
        const daysFromApply = loan.applied_on
          ? Math.max(0, Math.ceil((new Date(loan.repayment_date).getTime() - new Date(loan.applied_on).getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        const interestPct = loan.amount > 0 ? ((loan.interest_amount / loan.amount) * 100).toFixed(1) : '0';

        return (
          <div
            onClick={e => { if (e.target === e.currentTarget) setLoanDetailModal(null); }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1800,
              background: 'rgba(10,15,30,0.76)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <style>{`
              @keyframes loanModalPop {
                0% { opacity: 0; transform: scale(0.88) translateY(24px); }
                60% { transform: scale(1.02) translateY(-4px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
            `}</style>
            <div style={{
              background: 'var(--color-bg, #fff)',
              borderRadius: 20,
              width: '100%', maxWidth: 500,
              boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)`,
              overflow: 'hidden',
              animation: 'loanModalPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
              maxHeight: '92vh',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Header */}
              <div style={{
                padding: '22px 24px 18px',
                background: headerGradient,
                color: 'white',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0,
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.75, textTransform: 'uppercase', marginBottom: 3 }}>
                      Loan #{loan.id.toString().padStart(4, '0')} · {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.amount)}
                    </div>
                    {loan.purpose && (
                      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 3 }}>{loan.purpose}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setLoanDetailModal(null)}
                  style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white', borderRadius: 10, width: 34, height: 34, cursor: 'pointer', fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >×</button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

                {/* Interest Breakdown (active loans) */}
                {!isDone && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Payment Breakdown</div>
                    <div style={{ background: lightBg, border: `1.5px solid ${lightBorder}`, borderRadius: 14, padding: '16px 18px' }}>
                      {/* Progress bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>
                          <span>Principal</span>
                          <span>Interest ({interestPct}%)</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 99, background: 'var(--gray-200)', overflow: 'hidden', display: 'flex' }}>
                          <div style={{
                            width: `${loan.total_due > 0 ? (loan.amount / loan.total_due) * 100 : 100}%`,
                            background: 'linear-gradient(90deg, #1664c0, #3b82f6)',
                            borderRadius: '99px 0 0 99px',
                            transition: 'width 0.8s ease',
                          }} />
                          <div style={{
                            flex: 1,
                            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                            borderRadius: '0 99px 99px 0',
                          }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Principal', value: formatCurrency(loan.amount), color: '#1664c0' },
                          { label: 'Interest', value: formatCurrency(loan.interest_amount), color: '#d97706' },
                          { label: 'Total Due', value: formatCurrency(loan.total_due), color: accentColor },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', textAlign: 'center' }}>
                            <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                            <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Loan Details grid */}
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Loan Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Applied On', value: loan.applied_on ? new Date(loan.applied_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                      { label: 'Repayment Date', value: loan.repayment_date ? new Date(loan.repayment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                      ...(isDone ? [
                        { label: isClosed ? 'Closed On' : 'Foreclosed On', value: (loan.closed_on || loan.foreclosed_on) ? new Date(loan.closed_on || loan.foreclosed_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                        { label: 'Payment Received', value: loan.payment_received_date ? new Date(loan.payment_received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded' },
                      ] : [
                        { label: 'Loan Duration', value: daysFromApply !== null ? `${daysFromApply} days` : '—' },
                        { label: 'Approved On', value: loan.approved_on ? new Date(loan.approved_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                      ]),
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--gray-200)' }}>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total paid (closed/foreclosed) */}
                {isDone && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ background: lightBg, border: `1.5px solid ${lightBorder}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Total Paid</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: accentColor }}>{formatCurrency(loan.total_due)}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                          Principal {formatCurrency(loan.amount)} + Interest {formatCurrency(loan.interest_amount)}
                        </div>
                      </div>
                      <div style={{ fontSize: 36 }}>{isClosed ? '🎉' : '⚡'}</div>
                    </div>
                  </div>
                )}

                {/* Admin notes */}
                {loan.admin_notes && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</div>
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5 }}>
                      {loan.admin_notes}
                    </div>
                  </div>
                )}

                {/* Approval screenshot (approved/active loans) */}
                {!isDone && loan.approval_screenshot_path && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Payment Proof</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>Screenshot of amount sent by admin</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => { setLoanDetailModal(null); setScreenshotViewPath(`http://localhost:3000${loan.approval_screenshot_path}`); }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 18px', borderRadius: 10, border: '1.5px solid #bfdbfe',
                          background: '#eff6ff', color: '#1664c0', fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <PhotoIcon style={{ width: 18, height: 18 }} />
                        View Screenshot
                      </button>
                      <a
                        href={`http://localhost:3000${loan.approval_screenshot_path}`}
                        download
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 18px', borderRadius: 10, border: 'none',
                          background: '#1664c0', color: 'white', fontWeight: 700, fontSize: 13,
                          textDecoration: 'none', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <ArrowDownTrayIcon style={{ width: 18, height: 18 }} />
                        Download
                      </a>
                    </div>
                  </div>
                )}

                {/* Screenshot actions (closed/foreclosed) */}
                {isDone && loan.screenshot_path && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Payment Receipt</div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => { setLoanDetailModal(null); setScreenshotViewPath(`http://localhost:3000${loan.screenshot_path}`); }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${lightBorder}`,
                          background: lightBg, color: accentColor, fontWeight: 700, fontSize: 13,
                          cursor: 'pointer', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <PhotoIcon style={{ width: 18, height: 18 }} />
                        View Screenshot
                      </button>
                      <a
                        href={`http://localhost:3000${loan.screenshot_path}`}
                        download
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '11px 18px', borderRadius: 10, border: 'none',
                          background: accentColor, color: 'white', fontWeight: 700, fontSize: 13,
                          textDecoration: 'none', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <ArrowDownTrayIcon style={{ width: 18, height: 18 }} />
                        Download
                      </a>
                    </div>
                  </div>
                )}
                {isDone && !loan.screenshot_path && (
                  <div style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 10, border: '1px dashed var(--gray-300)', fontSize: 13, color: 'var(--gray-400)', textAlign: 'center' }}>
                    No payment screenshot on file
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button
                  onClick={() => setLoanDetailModal(null)}
                  style={{
                    padding: '10px 28px', borderRadius: 10, border: 'none',
                    background: headerGradient, color: 'white',
                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    boxShadow: `0 4px 14px rgba(0,0,0,0.2)`,
                  }}
                >Done</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Screenshot Viewer Overlay */}
      {screenshotViewPath && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setScreenshotViewPath(null); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            position: 'relative', maxWidth: '90vw', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-end' }}>
              <a
                href={screenshotViewPath}
                download
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  background: '#22c55e', color: 'white',
                  fontWeight: 600, fontSize: 13, textDecoration: 'none',
                }}
              >
                <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                Download
              </a>
              <button
                onClick={() => setScreenshotViewPath(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13,
                }}
              >
                Close
              </button>
            </div>
            <img
              src={screenshotViewPath}
              alt="Payment screenshot"
              style={{
                maxWidth: '85vw', maxHeight: '80vh',
                borderRadius: 12,
                boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
