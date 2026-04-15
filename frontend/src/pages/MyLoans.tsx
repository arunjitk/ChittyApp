import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loanService, LoanApplication } from '../services/loanService';
import { formatCurrency, formatDate, getStatusText } from '../utils/format';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

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

const MyLoans: React.FC = () => {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loanDetailModal, setLoanDetailModal] = useState<LoanApplication | null>(null);
  const [screenshotViewPath, setScreenshotViewPath] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const loansData = await loanService.getMyLoans();
        setLoans(loansData);
      } catch (error) {
        console.error('Failed to fetch loans:', error);
        toast.error('Failed to fetch your loans');
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  if (loading) {
    return (
      <div className="spinner-page">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Loans</h1>
          <p className="page-subtitle">View all your loan applications and their status</p>
        </div>
        <Link to="/apply-loan" className="btn btn-primary">+ Apply for Loan</Link>
      </div>

      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>Loan History</h3>
            <p>A complete list of all your loan applications</p>
          </div>
          {loans.length > 0 && (
            <span className="badge badge-active-count">{loans.length} total</span>
          )}
        </div>

        {loans.length === 0 ? (
          <div className="empty-state">
            <DocumentTextIcon className="empty-state-icon" style={{ width: 48, height: 48 }} />
            <div className="empty-state-title">No loans found</div>
            <p className="empty-state-text">You haven't applied for any loans yet.</p>
            <Link to="/apply-loan" className="btn btn-primary">Apply for your first loan</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Amount</th>
                  <th>Applied On</th>
                  <th>Repayment Date</th>
                  <th>Interest</th>
                  <th>Total Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr
                    key={loan.id}
                    onClick={() => setLoanDetailModal(loan)}
                    style={{ cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                    onMouseOut={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      #{loan.id.toString().padStart(4, '0')}
                    </td>
                    <td>{formatCurrency(loan.amount)}</td>
                    <td className="nowrap">{formatDate(loan.applied_on)}</td>
                    <td className="nowrap">{formatDate(loan.repayment_date)}</td>
                    <td>{formatCurrency(loan.interest_amount)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(loan.total_due)}</td>
                    <td>
                      <span className={getStatusBadgeClass(loan.status)}>
                        {getStatusText(loan.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loan Cards */}
      {loans.length > 0 && (
        <div className="loan-cards-grid section">
          {loans.slice(0, 6).map((loan) => (
            <div
              key={loan.id}
              className="loan-card"
              onClick={() => setLoanDetailModal(loan)}
              style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.12s' }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
            >
              <div className="loan-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <DocumentTextIcon style={{ width: 28, height: 28, color: 'var(--gray-400)' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      Loan #{loan.id.toString().padStart(4, '0')}
                    </div>
                    <span className={getStatusBadgeClass(loan.status)}>
                      {getStatusText(loan.status)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="loan-detail-grid">
                <div className="loan-detail-item">
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Amount</div>
                  <div className="dval">{formatCurrency(loan.amount)}</div>
                </div>
                <div className="loan-detail-item">
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Total Due</div>
                  <div className="dval">{formatCurrency(loan.total_due)}</div>
                </div>
                <div className="loan-detail-item">
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Applied</div>
                  <div className="dval">{formatDate(loan.applied_on)}</div>
                </div>
                <div className="loan-detail-item">
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Due Date</div>
                  <div className="dval">{formatDate(loan.repayment_date)}</div>
                </div>
              </div>
              <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--gray-600)' }}>
                <span style={{ fontWeight: 500 }}>Purpose:</span> {loan.purpose}
              </div>
              {loan.admin_notes && (
                <div style={{ padding: '0 16px 12px', fontSize: 13, color: 'var(--gray-500)', fontStyle: 'italic' }}>
                  <span style={{ fontWeight: 500 }}>Admin Notes:</span> {loan.admin_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loan Detail Modal */}
      {loanDetailModal && (() => {
        const loan = loanDetailModal;
        const isClosed = loan.status === 'closed';
        const isForeclosed = loan.status === 'foreclosed';
        const isRejected = loan.status === 'rejected';
        const isApproved = loan.status === 'approved';
        const isDone = isClosed || isForeclosed;

        const headerGradient = isClosed
          ? 'linear-gradient(135deg, #064e3b, #059669)'
          : isForeclosed
          ? 'linear-gradient(135deg, #78350f, #d97706)'
          : isRejected
          ? 'linear-gradient(135deg, #7f1d1d, #dc2626)'
          : isApproved
          ? 'linear-gradient(135deg, #1e3a5f, #1664c0)'
          : 'linear-gradient(135deg, #374151, #6b7280)';

        const accentColor = isClosed ? '#059669' : isForeclosed ? '#d97706' : isRejected ? '#dc2626' : '#1664c0';
        const lightBg = isClosed ? '#f0fdf4' : isForeclosed ? '#fffbeb' : isRejected ? '#fff1f2' : '#eff6ff';
        const lightBorder = isClosed ? '#86efac' : isForeclosed ? '#fcd34d' : isRejected ? '#fca5a5' : '#bfdbfe';
        const icon = isClosed ? '✅' : isForeclosed ? '⚡' : isRejected ? '🚫' : isApproved ? '💳' : '📋';

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
              boxShadow: '0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
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

                {/* Interest Breakdown (active/approved loans) */}
                {isApproved && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Payment Breakdown</div>
                    <div style={{ background: lightBg, border: `1.5px solid ${lightBorder}`, borderRadius: 14, padding: '16px 18px' }}>
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
                          <div style={{ flex: 1, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '0 99px 99px 0' }} />
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

                {/* Pending loans: simple amount breakdown */}
                {loan.status === 'pending' && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: 14, padding: '16px 18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Principal', value: formatCurrency(loan.amount), color: '#374151' },
                          { label: 'Interest', value: formatCurrency(loan.interest_amount), color: '#d97706' },
                          { label: 'Total Due', value: formatCurrency(loan.total_due), color: '#1664c0' },
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
                        { label: isClosed ? 'Closed On' : 'Foreclosed On', value: (loan.closed_on || loan.foreclosed_on) ? new Date((loan.closed_on || loan.foreclosed_on)!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                        { label: 'Payment Received', value: loan.payment_received_date ? new Date(loan.payment_received_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not recorded' },
                      ] : isRejected ? [
                        { label: 'Rejected On', value: loan.rejected_on ? new Date(loan.rejected_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                        { label: 'Amount', value: formatCurrency(loan.amount) },
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
                {loan.admin_notes && !isRejected && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</div>
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5 }}>
                      {loan.admin_notes}
                    </div>
                  </div>
                )}

                {/* Rejection reason */}
                {isRejected && loan.admin_notes && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Rejection Reason</div>
                    <div style={{ background: '#fff1f2', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>💬</span>
                      <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6 }}>{loan.admin_notes}</div>
                    </div>
                  </div>
                )}

                {/* Approval screenshot (approved/active loans) */}
                {isApproved && loan.approval_screenshot_path && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payment Proof</div>
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

                {/* Payment receipt (closed/foreclosed) */}
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
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
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
              >✕ Close</button>
            </div>
            <img
              src={screenshotViewPath}
              alt="Payment screenshot"
              style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 80px)', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLoans;
