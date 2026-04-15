import React, { useState, useEffect, useRef } from 'react';
import {
  CalculatorIcon,
  SparklesIcon,
  ClockIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  CalendarDaysIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function calcInterest(days: number): number {
  return days > 15 ? Math.floor((days - 15) / 7) * 50 : 0;
}

function useAnimatedNumber(target: number, duration = 500): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(target);

  useEffect(() => {
    const from = fromRef.current;
    const diff = target - from;
    if (diff === 0) return;

    const start = performance.now();
    startRef.current = start;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + diff * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        fromRef.current = target;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

/* ─── Colour palette per interest tier ───────────────────────────────────── */

function getTier(weeks: number) {
  if (weeks === 0)
    return {
      label: 'No Interest',
      icon: '🎉',
      bg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
      pill: '#059669',
      pillText: '#fff',
      border: '#6ee7b7',
      textDark: '#065f46',
      textMid: '#047857',
    };
  if (weeks <= 2)
    return {
      label: 'Low',
      icon: '🟡',
      bg: 'linear-gradient(135deg,#fef9c3,#fde68a)',
      pill: '#d97706',
      pillText: '#fff',
      border: '#fcd34d',
      textDark: '#78350f',
      textMid: '#b45309',
    };
  if (weeks <= 4)
    return {
      label: 'Moderate',
      icon: '🟠',
      bg: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
      pill: '#ea580c',
      pillText: '#fff',
      border: '#fb923c',
      textDark: '#7c2d12',
      textMid: '#c2410c',
    };
  return {
    label: 'High',
    icon: '🔴',
    bg: 'linear-gradient(135deg,#fee2e2,#fecaca)',
    pill: '#dc2626',
    pillText: '#fff',
    border: '#fca5a5',
    textDark: '#7f1d1d',
    textMid: '#b91c1c',
  };
}

/* ─── Scenario data ──────────────────────────────────────────────────────── */

const SCENARIOS = [
  { days: 7,  label: '1 week',   emoji: '🌱' },
  { days: 15, label: '15 days',  emoji: '✅' },
  { days: 22, label: '22 days',  emoji: '⚠️' },
  { days: 29, label: '29 days',  emoji: '📈' },
  { days: 43, label: '43 days',  emoji: '🔥' },
  { days: 57, label: '57 days',  emoji: '💸' },
  { days: 90, label: '90 days',  emoji: '🚨' },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

const FormulaChip: React.FC<{ children: React.ReactNode; color: string }> = ({
  children,
  color,
}) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: 999,
      background: color,
      color: '#fff',
      fontWeight: 700,
      fontSize: 14,
      fontFamily: 'monospace',
      boxShadow: `0 2px 8px ${color}66`,
    }}
  >
    {children}
  </span>
);

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}
const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  color,
  onChange,
  formatValue,
}) => {
  const pct = ((value - min) / (max - min)) * 100;
  const display = formatValue ? formatValue(value) : `${value}`;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
          {label}
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color,
            fontFamily: 'monospace',
            minWidth: 80,
            textAlign: 'right',
          }}
        >
          {unit === '₹' ? `₹${Number(display).toLocaleString('en-IN')}` : `${display} ${unit}`}
        </span>
      </div>

      {/* Track */}
      <div style={{ position: 'relative', height: 8, borderRadius: 999, background: '#e2e8f0' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            transition: 'width 0.15s ease',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: '100%',
            height: 20,
            transform: 'translateY(-50%)',
            opacity: 0,
            cursor: 'pointer',
            zIndex: 2,
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            border: `3px solid ${color}`,
            boxShadow: `0 2px 8px ${color}55`,
            transition: 'left 0.15s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        <span>
          {unit === '₹' ? `₹${min.toLocaleString('en-IN')}` : `${min} ${unit}`}
        </span>
        <span>
          {unit === '₹' ? `₹${max.toLocaleString('en-IN')}` : `${max} ${unit}`}
        </span>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

const InterestCalculator: React.FC = () => {
  const [loanAmount, setLoanAmount] = useState<number>(10000);
  const [days, setDays] = useState<number>(25);

  const GRACE = 15;
  const WEEKLY_RATE = 50;

  const weeksCharged = days > GRACE ? Math.floor((days - GRACE) / 7) : 0;
  const interest = weeksCharged * WEEKLY_RATE;
  const totalDue = loanAmount + interest;
  const daysUntilNextCharge =
    days <= GRACE
      ? GRACE - days
      : 7 - ((days - GRACE) % 7) === 7
      ? 7
      : 7 - ((days - GRACE) % 7);

  const tier = getTier(weeksCharged);

  const animatedInterest = useAnimatedNumber(interest);
  const animatedTotal = useAnimatedNumber(totalDue);
  const animatedWeeks = useAnimatedNumber(weeksCharged);

  /* weekly schedule */
  const weeklySchedule: { week: number; day: number; cumulative: number }[] = [];
  for (let w = 1; w <= Math.max(weeksCharged + 2, 4); w++) {
    const d = GRACE + w * 7;
    weeklySchedule.push({ week: w, day: d, cumulative: w * WEEKLY_RATE });
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #1664c0 0%, #7c3aed 50%, #db2777 100%)',
          padding: '40px 36px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {/* decorative blobs */}
        {[
          { w: 200, h: 200, top: -60, right: -40, op: 0.08 },
          { w: 140, h: 140, bottom: -40, left: 80, op: 0.07 },
          { w: 80, h: 80, top: 20, left: '45%', op: 0.06 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: b.w,
              height: b.h,
              borderRadius: '50%',
              background: '#fff',
              opacity: b.op,
              top: (b as any).top ?? 'auto',
              bottom: (b as any).bottom ?? 'auto',
              left: (b as any).left ?? 'auto',
              right: (b as any).right ?? 'auto',
            }}
          />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalculatorIcon style={{ width: 28, height: 28, color: '#fff' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                Interest Calculator
              </h1>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.85, marginTop: 2 }}>
                Understand exactly how loan interest is calculated
              </p>
            </div>
          </div>

          {/* formula chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              marginTop: 20,
              padding: '16px 20px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            <span style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>Formula:</span>
            <FormulaChip color="#059669">Interest</FormulaChip>
            <span style={{ fontSize: 20, opacity: 0.7 }}>=</span>
            <FormulaChip color="#7c3aed">floor( (days − 15) ÷ 7 )</FormulaChip>
            <span style={{ fontSize: 20, opacity: 0.7 }}>×</span>
            <FormulaChip color="#db2777">₹50</FormulaChip>
            <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>
              (charged per week after 15-day grace period)
            </span>
          </div>
        </div>
      </div>

      {/* ── SLIDERS ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BanknotesIcon style={{ width: 20, height: 20, color: '#1664c0' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Loan Amount</span>
          </div>
          <Slider
            label="Principal"
            value={loanAmount}
            min={1000}
            max={100000}
            step={500}
            unit="₹"
            color="#1664c0"
            onChange={setLoanAmount}
          />
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '24px 28px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <CalendarDaysIcon style={{ width: 20, height: 20, color: '#7c3aed' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>Days Elapsed</span>
          </div>
          <Slider
            label="Days since loan approved"
            value={days}
            min={1}
            max={120}
            step={1}
            unit="days"
            color="#7c3aed"
            onChange={setDays}
          />
        </div>
      </div>

      {/* ── LIVE RESULT CARDS ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Principal */}
        <div
          style={{
            borderRadius: 16,
            padding: '20px 22px',
            background: 'linear-gradient(135deg,#dbeafe,#eff6ff)',
            border: '1px solid #93c5fd',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CurrencyRupeeIcon style={{ width: 14, height: 14 }} /> PRINCIPAL
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#1e40af', fontFamily: 'monospace' }}>
            ₹{loanAmount.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Interest */}
        <div
          style={{
            borderRadius: 16,
            padding: '20px 22px',
            background: tier.bg,
            border: `1px solid ${tier.border}`,
            transition: 'background 0.4s, border 0.4s',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: tier.textMid, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowTrendingUpIcon style={{ width: 14, height: 14 }} /> INTEREST
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: tier.textDark, fontFamily: 'monospace', transition: 'color 0.4s' }}>
            ₹{animatedInterest.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: tier.textMid, marginTop: 4 }}>
            {tier.icon} {tier.label} — {animatedWeeks} week{animatedWeeks !== 1 ? 's' : ''} charged
          </div>
        </div>

        {/* Total Due */}
        <div
          style={{
            borderRadius: 16,
            padding: '20px 22px',
            background: 'linear-gradient(135deg,#fdf4ff,#fae8ff)',
            border: '1px solid #d8b4fe',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <BanknotesIcon style={{ width: 14, height: 14 }} /> TOTAL DUE
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#5b21b6', fontFamily: 'monospace' }}>
            ₹{animatedTotal.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Next charge countdown */}
        <div
          style={{
            borderRadius: 16,
            padding: '20px 22px',
            background: 'linear-gradient(135deg,#fef9c3,#fef3c7)',
            border: '1px solid #fcd34d',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#b45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ClockIcon style={{ width: 14, height: 14 }} />
            {days <= GRACE ? 'GRACE ENDS IN' : 'NEXT CHARGE IN'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#78350f', fontFamily: 'monospace' }}>
            {daysUntilNextCharge} day{daysUntilNextCharge !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 11, color: '#92400e', marginTop: 4 }}>
            {days <= GRACE ? 'Repay now — zero interest!' : `₹50 added on day ${days + daysUntilNextCharge}`}
          </div>
        </div>
      </div>

      {/* ── TIMELINE BAR ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SparklesIcon style={{ width: 18, height: 18, color: '#7c3aed' }} />
          Loan Timeline — Day {days}
        </div>

        {/* Main bar */}
        <div style={{ position: 'relative', height: 36, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', marginBottom: 12 }}>
          {/* Grace zone */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${Math.min((GRACE / 120) * 100, 100)}%`,
              background: 'linear-gradient(90deg,#6ee7b7,#34d399)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46', whiteSpace: 'nowrap' }}>
              ✅ Grace (0–15 days)
            </span>
          </div>

          {/* Interest zone */}
          {days > GRACE && (
            <div
              style={{
                position: 'absolute',
                left: `${(GRACE / 120) * 100}%`,
                top: 0,
                height: '100%',
                width: `${Math.min(((days - GRACE) / 120) * 100, 100 - (GRACE / 120) * 100)}%`,
                background: `linear-gradient(90deg,${tier.pill}88,${tier.pill})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'width 0.2s ease',
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                Interest zone
              </span>
            </div>
          )}

          {/* Cursor */}
          <div
            style={{
              position: 'absolute',
              left: `${Math.min((days / 120) * 100, 99)}%`,
              top: 0,
              height: '100%',
              width: 3,
              background: '#1e293b',
              transition: 'left 0.2s ease',
              zIndex: 5,
            }}
          />
        </div>

        {/* Tick labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
          {[0, 15, 29, 43, 57, 71, 85, 99, 113, 120].map((d) => (
            <span key={d} style={{ fontFamily: 'monospace' }}>
              {d === 0 ? 'Day 0' : d === 120 ? '120' : d}
            </span>
          ))}
        </div>

        {/* Status pill */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              background: days <= GRACE ? '#d1fae5' : tier.bg,
              border: `1px solid ${days <= GRACE ? '#6ee7b7' : tier.border}`,
              fontSize: 13,
              fontWeight: 600,
              color: days <= GRACE ? '#065f46' : tier.textDark,
              transition: 'all 0.3s',
            }}
          >
            {days <= GRACE ? (
              <>
                <CheckCircleIcon style={{ width: 16, height: 16 }} />
                You're in the grace period — no interest yet!
              </>
            ) : (
              <>
                <ExclamationTriangleIcon style={{ width: 16, height: 16 }} />
                ₹{interest} interest accrued over {weeksCharged} week{weeksCharged !== 1 ? 's' : ''} past grace period
              </>
            )}
          </span>

          {days > GRACE && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                fontSize: 13,
                fontWeight: 600,
                color: '#78350f',
              }}
            >
              <ClockIcon style={{ width: 16, height: 16 }} />
              Next ₹50 charge in {daysUntilNextCharge} day{daysUntilNextCharge !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── WEEKLY BREAKDOWN ─────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDaysIcon style={{ width: 18, height: 18, color: '#db2777' }} />
          Week-by-Week Interest Accumulation
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, marginTop: 4 }}>
          Each column shows total interest at that point for a ₹{loanAmount.toLocaleString('en-IN')} loan. Your current position is highlighted.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {weeklySchedule.slice(0, 8).map(({ week, day, cumulative }) => {
            const isActive = weeksCharged === week;
            const isPast = weeksCharged > week;
            const cardColor = getTier(week);

            return (
              <div
                key={week}
                style={{
                  flex: '1 1 100px',
                  minWidth: 90,
                  borderRadius: 14,
                  padding: '16px 12px',
                  textAlign: 'center',
                  background: isActive
                    ? `linear-gradient(135deg,${cardColor.pill},${cardColor.pill}cc)`
                    : isPast
                    ? cardColor.bg
                    : '#f8fafc',
                  border: isActive
                    ? `2px solid ${cardColor.pill}`
                    : isPast
                    ? `1px solid ${cardColor.border}`
                    : '1px solid #e2e8f0',
                  transform: isActive ? 'scale(1.06)' : 'scale(1)',
                  transition: 'all 0.25s ease',
                  boxShadow: isActive
                    ? `0 8px 24px ${cardColor.pill}44`
                    : 'none',
                  cursor: 'default',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? 'rgba(255,255,255,0.85)' : '#94a3b8',
                    marginBottom: 4,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}
                >
                  Week {week}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: isActive ? '#fff' : isPast ? cardColor.textDark : '#cbd5e1',
                    fontFamily: 'monospace',
                    marginBottom: 4,
                  }}
                >
                  ₹{cumulative}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? 'rgba(255,255,255,0.75)' : '#94a3b8',
                  }}
                >
                  Day {day}+
                </div>
                {isActive && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      background: 'rgba(255,255,255,0.25)',
                      borderRadius: 6,
                      padding: '2px 6px',
                    }}
                  >
                    📍 You are here
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SCENARIO TABLE ───────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowTrendingUpIcon style={{ width: 18, height: 18, color: '#059669' }} />
          Scenario Comparison
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20, marginTop: 4 }}>
          How interest grows for your ₹{loanAmount.toLocaleString('en-IN')} loan at different repayment dates.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr>
                {['Duration', 'Days', 'Weeks Charged', 'Interest', 'Total Due', 'Savings vs Late'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748b',
                      borderBottom: '2px solid #e2e8f0',
                      background: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map(({ days: d, label, emoji }) => {
                const wks = d > 15 ? Math.floor((d - 15) / 7) : 0;
                const int = wks * 50;
                const tot = loanAmount + int;
                const worst = calcInterest(90) * 1;
                const saved = worst * 1 - int;
                const isCurrentRange = days >= d - 3 && days <= d + 3;
                const t = getTier(wks);

                return (
                  <tr
                    key={d}
                    style={{
                      background: isCurrentRange ? '#f0f9ff' : '#fff',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: 14, color: '#1e293b', borderRadius: '10px 0 0 10px', border: isCurrentRange ? '2px solid #93c5fd' : '1px solid #f1f5f9', borderRight: 'none' }}>
                      {emoji} {label}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#475569', border: isCurrentRange ? '2px solid #93c5fd' : '1px solid #f1f5f9', borderLeft: 'none', borderRight: 'none' }}>
                      {d}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, border: isCurrentRange ? '2px solid #93c5fd' : '1px solid #f1f5f9', borderLeft: 'none', borderRight: 'none' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: t.bg, border: `1px solid ${t.border}`, color: t.textDark, fontWeight: 700, fontSize: 12 }}>
                        {wks} week{wks !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 700, color: t.textDark, fontFamily: 'monospace', border: isCurrentRange ? '2px solid #93c5fd' : '1px solid #f1f5f9', borderLeft: 'none', borderRight: 'none' }}>
                      ₹{int.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace', border: isCurrentRange ? '2px solid #93c5fd' : '1px solid #f1f5f9', borderLeft: 'none', borderRight: 'none' }}>
                      ₹{tot.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', border: isCurrentRange ? '2px solid #93c5fd' : '1px solid #f1f5f9', borderLeft: 'none' }}>
                      {saved > 0 ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                          💰 Save ₹{saved}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TIPS SECTION ─────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 16,
          padding: '24px 28px',
          background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
          border: '1px solid #86efac',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <LightBulbIcon style={{ width: 22, height: 22, color: '#059669' }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#14532d' }}>
            Smart Repayment Tips
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { icon: '🎯', tip: 'Repay within 15 days to pay zero interest' },
            { icon: '📅', tip: 'Interest jumps every 7 days after the grace period — repay before the next weekly mark' },
            { icon: '💡', tip: 'Even one day before a weekly mark saves you ₹50' },
            { icon: '🔔', tip: 'Track your loan approval date to know when charges kick in' },
          ].map(({ icon, tip }) => (
            <div
              key={tip}
              style={{
                display: 'flex',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 10,
                background: '#fff',
                border: '1px solid #bbf7d0',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 13, color: '#166534', lineHeight: 1.5 }}>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterestCalculator;
