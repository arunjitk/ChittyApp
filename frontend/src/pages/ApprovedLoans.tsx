import React, { useState, useEffect } from 'react';
import { loanService } from '../services/loanService';
import { formatCurrency, formatDate, getStatusText } from '../utils/format';
import { UserIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface Loan {
  id: number;
  user_name?: string;
  user_email?: string;
  amount: number;
  purpose: string;
  approved_on?: string;
  repayment_date: string;
  interest_amount: number;
  total_due: number;
  status: string;
}

const ApprovedLoans: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const loansData = await loanService.getActiveLoans();
        setLoans(loansData);
      } catch (error) {
        console.error('Failed to fetch approved loans:', error);
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

  const totalDisbursed = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalInterest = loans.reduce((sum, loan) => sum + loan.interest_amount, 0);
  const totalDue = loans.reduce((sum, loan) => sum + loan.total_due, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Approved Loans Board</h1>
          <p className="page-subtitle">View all currently approved loans across all users</p>
        </div>
        {loans.length > 0 && (
          <span className="badge badge-approved" style={{ fontSize: 13, padding: '6px 14px' }}>
            {loans.length} Active Loans
          </span>
        )}
      </div>

      {/* Summary Stats */}
      {loans.length > 0 && (
        <div className="stat-grid section">
          <div className="stat-card">
            <div className="stat-icon blue">
              <CurrencyDollarIcon style={{ width: 24, height: 24 }} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Disbursed</div>
              <div className="stat-value">{formatCurrency(totalDisbursed)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <CalendarIcon style={{ width: 24, height: 24 }} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Interest</div>
              <div className="stat-value">{formatCurrency(totalInterest)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <UserIcon style={{ width: 24, height: 24 }} />
            </div>
            <div className="stat-info">
              <div className="stat-label">Total Due</div>
              <div className="stat-value">{formatCurrency(totalDue)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card section">
        <div className="card-header">
          <div className="card-header-text">
            <h3>Active Loans</h3>
            <p>Currently approved and active loans</p>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="empty-state">
            <CurrencyDollarIcon className="empty-state-icon" style={{ width: 48, height: 48 }} />
            <div className="empty-state-title">No active loans</div>
            <p className="empty-state-text">There are currently no approved loans.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Amount</th>
                  <th>Approved On</th>
                  <th>Due Date</th>
                  <th>Interest</th>
                  <th>Total Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
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
                    <td className="nowrap">{loan.approved_on ? formatDate(loan.approved_on) : 'N/A'}</td>
                    <td className="nowrap">{formatDate(loan.repayment_date)}</td>
                    <td>{formatCurrency(loan.interest_amount)}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(loan.total_due)}</td>
                    <td>
                      <span className="badge badge-approved">{getStatusText(loan.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedLoans;
