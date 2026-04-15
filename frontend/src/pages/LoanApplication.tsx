import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { loanService, poolService } from '../services/loanService';
import { formatCurrency, formatDate } from '../utils/format';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, CalculatorIcon, CalendarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const LoanApplication: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [repaymentDate, setRepaymentDate] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [poolLoaded, setPoolLoaded] = useState(false);
  const [interestData, setInterestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [amountError, setAmountError] = useState('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        const dashboard = await poolService.getDashboard();
        setAvailableBalance(dashboard.available_balance);
        setPoolLoaded(true);
      } catch (error) {
        console.error('Failed to fetch pool data:', error);
        setPoolLoaded(true); // allow form to proceed even if pool fetch fails
      }
    };
    fetchPoolData();
  }, []);

  useEffect(() => {
    if (amount && repaymentDate) {
      calculateInterest();
    }
  }, [amount, repaymentDate]);

  const calculateInterest = async () => {
    const loanAmount = parseFloat(amount);
    if (!loanAmount || loanAmount <= 0 || !repaymentDate) return;
    setCalculating(true);
    try {
      const data = await loanService.calculateInterest(loanAmount, repaymentDate);
      setInterestData(data);
    } catch (error) {
      console.error('Failed to calculate interest:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loanAmount = parseFloat(amount);
    if (!loanAmount || loanAmount <= 0) {
      toast.error('Please enter a valid loan amount');
      return;
    }
    if (poolLoaded && loanAmount > availableBalance) {
      toast.error(`Loan amount cannot exceed available balance of ${formatCurrency(availableBalance)}`);
      return;
    }
    if (!purpose.trim()) {
      toast.error('Please enter a loan purpose');
      return;
    }
    if (!repaymentDate) {
      toast.error('Please select a repayment date');
      return;
    }
    setLoading(true);
    try {
      await loanService.applyForLoan({
        amount: loanAmount,
        purpose: purpose.trim(),
        repayment_date: repaymentDate,
      });
      toast.success('Loan application submitted successfully!');
      setAmount('');
      setPurpose('');
      setRepaymentDate('');
      setInterestData(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit loan application');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    const num = parseFloat(val);
    if (poolLoaded && val && num > availableBalance) {
      setAmountError(`Amount exceeds max available (${formatCurrency(availableBalance)})`);
    } else {
      setAmountError('');
    }
  };

  const openDatePicker = () => {
    if (dateInputRef.current) {
      try {
        (dateInputRef.current as any).showPicker();
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  const amountExceeded = poolLoaded && !!amount && parseFloat(amount) > availableBalance;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/dashboard" style={{ color: 'var(--gray-400)', display: 'flex' }}>
            <ArrowLeftIcon style={{ width: 24, height: 24 }} />
          </Link>
          <div>
            <h1 className="page-title">Apply for Loan</h1>
            <p className="page-subtitle">Fill out the form to submit your loan application</p>
          </div>
        </div>
      </div>

      {/* FCFS Notice */}
      <div className="loan-fcfs-notice" style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
        padding: '14px 18px', marginBottom: 24,
      }}>
        <InformationCircleIcon style={{ width: 22, height: 22, color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
        <div className="loan-fcfs-text" style={{ fontSize: 14, color: '#1e3a5f', lineHeight: 1.6 }}>
          <strong>First come, first served.</strong> Loan applications are reviewed and approved in the order they are received.
          Submitting your application early improves your chances of faster approval. Once submitted, you will be notified when your application is processed.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <div className="loan-app-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Application Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-text">
                <h3>Loan Application Form</h3>
                <p>Fill out the form below to apply for a loan.</p>
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="amount">Loan Amount (₹)</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">₹</span>
                    <input
                      id="amount"
                      type="number"
                      className={`form-control input-with-prefix${amountExceeded ? ' input-error' : ''}`}
                      min="1"
                      step="1"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0"
                      required
                    />
                  </div>
                  {amountError ? (
                    <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{amountError}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                      {poolLoaded ? `Max available: ${formatCurrency(availableBalance)}` : 'Loading available balance…'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="purpose">Purpose</label>
                  <textarea
                    id="purpose"
                    className="form-control"
                    rows={3}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Briefly describe the purpose of this loan..."
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="repayment-date">Repayment Date</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      id="repayment-date"
                      ref={dateInputRef}
                      type="date"
                      className="form-control"
                      min={minDate}
                      value={repaymentDate}
                      onChange={(e) => setRepaymentDate(e.target.value)}
                      required
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={openDatePicker}
                      style={{
                        position: 'absolute', right: 10, background: 'none', border: 'none',
                        cursor: 'pointer', color: 'var(--gray-500)', display: 'flex', padding: 0,
                      }}
                      tabIndex={-1}
                    >
                      <CalendarIcon style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                </div>

                {/* Interest Calculation Preview */}
                {interestData && (
                  <div className="interest-preview">
                    <div className="interest-preview-title">
                      <CalculatorIcon style={{ width: 18, height: 18 }} />
                      Interest Calculation
                      {calculating && <span style={{ fontSize: 12, color: 'var(--gray-500)' }}> (recalculating...)</span>}
                    </div>
                    <div className="interest-grid">
                      <div className="interest-item">
                        <div style={{ color: 'var(--gray-600)', fontSize: 13 }}>Principal</div>
                        <div style={{ fontWeight: 600 }}>{formatCurrency(parseFloat(amount))}</div>
                      </div>
                      <div className="interest-item">
                        <div style={{ color: 'var(--gray-600)', fontSize: 13 }}>Interest</div>
                        <div style={{ fontWeight: 600 }}>{formatCurrency(interestData.interest_amount)}</div>
                      </div>
                      <div className="interest-item">
                        <div style={{ color: 'var(--gray-600)', fontSize: 13 }}>Start Date</div>
                        <div style={{ fontWeight: 600 }}>{formatDate(todayStr)}</div>
                      </div>
                      <div className="interest-item">
                        <div style={{ color: 'var(--gray-600)', fontSize: 13 }}>Days</div>
                        <div style={{ fontWeight: 600 }}>{interestData.days} days</div>
                      </div>
                      <div className="interest-item">
                        <div style={{ color: 'var(--gray-600)', fontSize: 13 }}>Total Due</div>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(interestData.total_due)}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="loan-submit-row" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || calculating || amountExceeded}
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Info Panel */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-text">
                <h3>Loan Information</h3>
              </div>
            </div>
            <div className="card-body">
              <div className="desc-row">
                <span className="desc-label">Available Pool</span>
                <span className="desc-value" style={{ fontWeight: 600 }}>
                  {poolLoaded ? formatCurrency(availableBalance) : '—'}
                </span>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>Interest Rules</div>
                <ul style={{ fontSize: 13, color: 'var(--gray-600)', paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>≤ 15 days: 0% interest</li>
                  <li>&gt; 15 days: ₹50 per 7-day block</li>
                  <li>Interest added back to pool</li>
                </ul>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>After Submission</div>
                <span className="badge badge-pending">Pending Approval</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoanApplication;
