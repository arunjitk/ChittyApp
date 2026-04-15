import React, { useState } from 'react';
import { CodeBracketIcon, CalculatorIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const AdminSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('loans');
  const [interestDays, setInterestDays] = useState<number>(25);
  const interestAmount = Math.floor((interestDays - 15) / 7) * 50;

  const tabs = [
    { id: 'loans', label: 'Loan Management APIs', icon: CodeBracketIcon },
    { id: 'interest', label: 'Interest Calculation', icon: CalculatorIcon },
    { id: 'pool', label: 'Pool Management APIs', icon: CodeBracketIcon },
    { id: 'chitty', label: 'Chitty Fund APIs', icon: CodeBracketIcon },
    { id: 'auth', label: 'Auth & User APIs', icon: CodeBracketIcon },
    { id: 'swap', label: 'Loan Swap Flow', icon: ArrowRightIcon }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'loans':
        return <LoanManagementAPIs />;
      case 'interest':
        return <InterestCalculation interestDays={interestDays} setInterestDays={setInterestDays} />;
      case 'pool':
        return <PoolManagementAPIs />;
      case 'chitty':
        return <ChittyFundAPIs />;
      case 'auth':
        return <AuthUserAPIs />;
      case 'swap':
        return <LoanSwapFlow />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Documentation</h1>
          <p className="page-subtitle">API Reference and Business Logic Documentation</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        borderBottom: '1px solid var(--gray-200)',
        overflowX: 'auto',
        paddingBottom: 0
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: activeTab === tab.id ? 'transparent' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--gray-600)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        <div className="card-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const LoanManagementAPIs: React.FC = () => (
  <div>
    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Loan Management APIs</h2>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Endpoint</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Method</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Auth</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Description</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Business Logic</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/loans</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Get all loans for current user</td>
            <td style={{ padding: 12, fontSize: 13 }}>Returns loans filtered by user_id with active status</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/loans/{'{'}id{'}'}</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Get loan details with interest</td>
            <td style={{ padding: 12, fontSize: 13 }}>Calculates accrued interest: floor((days−15)/7) × ₹50</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/loans</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Request a new loan from pool</td>
            <td style={{ padding: 12, fontSize: 13 }}>Validates pool availability, creates loan_application with pending status</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/loans/{'{'}id{'}'}/repay</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>PUT</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Make partial or full repayment</td>
            <td style={{ padding: 12, fontSize: 13 }}>Calculates interest on remaining balance, marks as repaid when zero balance</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/loans/{'{'}id{'}'}</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-danger)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>DELETE</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Admin</td>
            <td style={{ padding: 12, fontSize: 13 }}>Delete loan (admin only)</td>
            <td style={{ padding: 12, fontSize: 13 }}>Soft delete, archived for audit trail</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const InterestCalculation: React.FC<{ interestDays: number; setInterestDays: (days: number) => void }> = ({ interestDays, setInterestDays }) => {
  const interestAmount = Math.floor((interestDays - 15) / 7) * 50;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Interest Calculation Formula</h2>

      {/* Formula Explanation */}
      <div style={{
        background: 'var(--gray-50)',
        padding: 20,
        borderRadius: 8,
        marginBottom: 24,
        borderLeft: '4px solid var(--color-primary)'
      }}>
        <p style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>Formula:</p>
        <div style={{
          background: 'white',
          padding: 12,
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 14,
          marginBottom: 12,
          color: 'var(--color-primary)'
        }}>
          Interest = floor((days − 15) / 7) × ₹50
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.6 }}>
          <li><strong>Grace Period:</strong> 15 days (no interest charged)</li>
          <li><strong>Interest Interval:</strong> Every 7 days (weekly)</li>
          <li><strong>Interest Rate:</strong> ₹50 per week</li>
          <li><strong>Rounding:</strong> Floor function (always rounds down)</li>
        </ul>
      </div>

      {/* Interactive Calculator */}
      <div style={{
        background: 'var(--blue-50)',
        padding: 20,
        borderRadius: 8,
        marginBottom: 24,
        border: '1px solid var(--blue-200)'
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--color-primary)' }}>Interactive Calculator</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--gray-700)' }}>
              Days Since Loan Issued
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={interestDays}
              onChange={e => setInterestDays(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
              {interestDays} days
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--gray-700)' }}>
              Calculated Interest
            </label>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: interestAmount > 0 ? 'var(--color-danger)' : 'var(--color-success)',
              padding: 16,
              background: 'white',
              borderRadius: 6,
              textAlign: 'center'
            }}>
              ₹{interestAmount}
            </div>
            {interestDays <= 15 && (
              <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 8, textAlign: 'center' }}>
                ✓ Grace period active - no interest charged
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Examples */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--gray-800)' }}>Examples</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { days: 10, interest: 0, note: 'Grace period' },
            { days: 15, interest: 0, note: 'Grace period ends' },
            { days: 22, interest: 50, note: 'First week after grace' },
            { days: 29, interest: 100, note: 'Two weeks' },
            { days: 36, interest: 150, note: 'Three weeks' },
            { days: 50, interest: 250, note: 'Five weeks' }
          ].map((example, idx) => {
            const calc = Math.floor((example.days - 15) / 7) * 50;
            return (
              <div key={idx} style={{
                padding: 12,
                background: 'var(--gray-50)',
                borderRadius: 6,
                border: '1px solid var(--gray-200)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 4 }}>
                  {example.days} days
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                  ₹{calc}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                  {example.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PoolManagementAPIs: React.FC = () => (
  <div>
    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Pool Management APIs</h2>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Endpoint</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Method</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Auth</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/pool</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Get pool status and available balance</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/pool/deposit</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Contribute funds to the pool</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/pool/withdraw</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Withdraw personal contribution from pool</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/pool/history</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Get transaction history for pool account</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/pool/reset</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>PUT</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Admin</td>
            <td style={{ padding: 12, fontSize: 13 }}>Reset pool balance to initial amount</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const ChittyFundAPIs: React.FC = () => (
  <div>
    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Chitty Fund Management APIs</h2>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Endpoint</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Method</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Auth</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/chitty</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Get all chitty groups for current user</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/chitty</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Create a new chitty group</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/chitty/{'{'}id{'}'}/join</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Join an existing chitty group</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/chitty/{'{'}id{'}'}/pay</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Make chitty fund payment</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/chitty/{'{'}id{'}'}/payments</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User</td>
            <td style={{ padding: 12, fontSize: 13 }}>Get payment history for chitty group</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const AuthUserAPIs: React.FC = () => (
  <div>
    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Authentication & User Management APIs</h2>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Endpoint</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Method</th>
            <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--gray-700)' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/auth/register</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Public - Creates pending account, awaiting admin approval</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/auth/login</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Public - Returns JWT token valid for 24 hours</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/users/profile</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User - Get current user details</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/users/profile</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>PUT</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User - Update name and email</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/users/password</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>PUT</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>User - Change password with current password verification</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/users</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-success)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>GET</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Admin - List all users with status filtering</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/users/{'{'}id{'}'}/approve</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-info)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>POST</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Admin - Approve pending user registration</td>
          </tr>
          <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
            <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>/api/users/{'{'}id{'}'}/lock</td>
            <td style={{ padding: 12, fontSize: 13 }}><span style={{ background: 'var(--color-warning)', color: 'white', padding: '2px 6px', borderRadius: 3, fontSize: 11, fontWeight: 600 }}>PUT</span></td>
            <td style={{ padding: 12, fontSize: 13 }}>Admin - Lock/unlock user account</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const LoanSwapFlow: React.FC = () => (
  <div>
    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Loan Swap Workflow</h2>

    <p style={{ color: 'var(--gray-600)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
      The loan swap feature enables users to transfer their outstanding loan balance to another user. This is useful when one user wants to refinance another's debt. Below is the step-by-step process.
    </p>

    <div style={{ display: 'grid', gap: 20 }}>
      {[
        {
          step: 1,
          title: 'Initiate Swap Request',
          description: 'User A creates a swap request for their loan, specifying the target User B and proposed terms',
          details: [
            'POST /api/loans/{id}/swap-request',
            'Target user ID must be valid and active',
            'Request status: pending',
            'Original loan remains active'
          ]
        },
        {
          step: 2,
          title: 'User B Reviews Request',
          description: 'User B receives notification and reviews the swap proposal with current interest accrual',
          details: [
            'Shows original loan amount',
            'Shows current accrued interest',
            'Shows full outstanding balance',
            'User B can accept or reject'
          ]
        },
        {
          step: 3,
          title: 'User B Accepts/Rejects',
          description: 'User B decides whether to take over the loan responsibility',
          details: [
            'PUT /api/loans/{id}/swap-request',
            'If rejected: request status = rejected, loan stays with User A',
            'If accepted: proceeds to Step 4'
          ]
        },
        {
          step: 4,
          title: 'Loan Transfer',
          description: 'System transfers the loan from User A to User B with interest calculated',
          details: [
            'Loan ownership changes to User B',
            'Interest accrued to acceptance timestamp is settled',
            'New interest calculation begins for User B',
            'Request status: completed'
          ]
        },
        {
          step: 5,
          title: 'User B Manages Loan',
          description: 'User B now owns the loan and can manage it independently',
          details: [
            'Can make repayments',
            'Can initiate another swap if desired',
            'Interest accrues based on new ownership period',
            'Original User A has no further obligation'
          ]
        }
      ].map((item, idx) => (
        <div key={idx} style={{
          display: 'flex',
          gap: 16,
          padding: 16,
          background: 'var(--gray-50)',
          borderRadius: 8,
          border: '1px solid var(--gray-200)'
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            flexShrink: 0
          }}>
            {item.step}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: 'var(--gray-800)' }}>
              {item.title}
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.5 }}>
              {item.description}
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: 'var(--gray-600)', lineHeight: 1.8 }}>
              {item.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>

    {/* Key Business Rules */}
    <div style={{
      background: 'var(--yellow-50)',
      padding: 16,
      borderRadius: 8,
      border: '1px solid var(--yellow-200)',
      marginTop: 24
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: 'var(--yellow-800)' }}>
        ⚠️ Key Business Rules
      </h4>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.8 }}>
        <li>Both users must have active accounts</li>
        <li>User A cannot swap with themselves</li>
        <li>Only one active swap request per loan at a time</li>
        <li>Swap cannot be initiated if loan is already fully repaid</li>
        <li>User B must have sufficient liquidity to absorb interest</li>
        <li>Interest is recalculated at transfer time, not frozen</li>
        <li>Audit trail maintains history of all swaps</li>
      </ul>
    </div>
  </div>
);

export default AdminSystem;
