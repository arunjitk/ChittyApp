import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { poolService } from '../services/loanService';
import { chittyService, ChittyGroup, PayoutInfo, ScheduleEntry, ChittyPayment } from '../services/chittyService';
import { formatCurrency } from '../utils/format';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

function ordinalSuffix(n: number): string {
  const s = ['th','st','nd','rd'], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface DashboardData {
  available_balance: number;
  total_pool: number;
  total_interest_collected: number;
  pending_count: number;
  expected_interest: number;
}

const AdminDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [chittyData, setChittyData] = useState<{ group: ChittyGroup; member: any; payoutInfo: any; currentPayout: PayoutInfo | null; nextPayout: PayoutInfo | null; schedule: ScheduleEntry[] } | null>(null);
  const [chittyPayments, setChittyPayments] = useState<ChittyPayment[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, chitty, payments] = await Promise.all([
          poolService.getDashboard(),
          chittyService.getMyChitty().catch(() => null),
          chittyService.getAllPayments().catch(() => []),
        ]);
        setDashboard(dashboardData);
        setChittyData(chitty);
        setChittyPayments(payments);
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

  const paymentsThisMonth = chittyData
    ? chittyPayments.filter(p => p.month === chittyData.group.current_month)
    : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Overview of loan pool and system status</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid section">
        <div className="stat-card">
          <div className="stat-icon green">
            <CurrencyDollarIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Available Balance</div>
            <div className="stat-value">
              {dashboard ? formatCurrency(dashboard.available_balance) : '₹0'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <DocumentTextIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Total Pool</div>
            <div className="stat-value">
              {dashboard ? formatCurrency(dashboard.total_pool) : '₹0'}
            </div>
          </div>
        </div>

        <Link to="/admin-loans" className="stat-card" style={{ textDecoration: 'none', cursor: 'pointer' }}>
          <div className="stat-icon yellow">
            <ClockIcon style={{ width: 24, height: 24 }} />
          </div>
          <div className="stat-info">
            <div className="stat-label">Pending Applications</div>
            <div className="stat-value">{dashboard?.pending_count || 0}</div>
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-icon purple">
            <ArrowTrendingUpIcon style={{ width: 24, height: 24 }} />
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
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
                  {chittyData.currentPayout.month_name} {chittyData.currentPayout.year} · {chittyData.currentPayout.payout_day}{ordinalSuffix(chittyData.currentPayout.payout_day)} of the month
                </div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>
                  {formatCurrency(chittyData.currentPayout.amount)}
                </div>
                <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
                  Payments collected:&nbsp;
                  <span style={{ fontWeight: 700, color: paymentsThisMonth.length === chittyData.group.total_members ? '#86efac' : '#fde68a' }}>
                    {paymentsThisMonth.length} / {chittyData.group.total_members}
                  </span>
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

      {/* Quick Actions */}
      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>Quick Actions</h3>
            <p>Common administrative tasks</p>
          </div>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            <Link to="/admin-loans" className="btn btn-primary">
              <DocumentTextIcon style={{ width: 16, height: 16 }} />
              Manage Loans
            </Link>
            {dashboard && dashboard.pending_count > 0 && (
              <Link to="/admin-loans" className="btn btn-warning">
                <ClockIcon style={{ width: 16, height: 16 }} />
                Review Pending ({dashboard.pending_count})
              </Link>
            )}
            <Link to="/manage-users" className="btn btn-secondary">
              <UserGroupIcon style={{ width: 16, height: 16 }} />
              Manage Users
            </Link>
            <Link to="/admin-chitty" className="btn btn-secondary">
              <CalendarDaysIcon style={{ width: 16, height: 16 }} />
              Manage Chitty
            </Link>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>System Status</h3>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="status-indicator">
              <div className="status-dot"></div>
              <div>
                <div className="status-label">Database</div>
                <div className="status-sub">Connected and operational</div>
              </div>
            </div>
            <div className="status-indicator">
              <div className="status-dot"></div>
              <div>
                <div className="status-label">API Services</div>
                <div className="status-sub">All services running normally</div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  const total = chittyData.group.total_members;

                  const gradients = [
                    '#22c55e','#16a34a','#059669','#0d9488','#0891b2',
                    '#1664c0','#2563eb','#4f46e5','#6366f1','#7c3aed','#8b5cf6','#a855f7',
                  ];
                  const dotColor = isPaid ? '#22c55e' : isCurrent ? '#1664c0' : gradients[Math.min(idx, gradients.length - 1)];
                  const cardBg = isPaid
                    ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                    : isCurrent
                    ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                    : 'var(--gray-50, #f8fafc)';
                  const cardBorder = isPaid ? '#86efac' : isCurrent ? '#93c5fd' : 'var(--gray-200)';
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
                        boxShadow: isCurrent ? `0 0 0 4px rgba(22,100,192,0.2)` : 'none',
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
    </div>
  );
};

export default AdminDashboard;
