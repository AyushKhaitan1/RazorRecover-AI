import React from 'react';
import { IndianRupee, TrendingUp, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

export default function MetricsOverview({ metrics }) {
  const atRisk = metrics?.totalVolumeAtRisk || 0;
  const recovered = metrics?.totalVolumeRecovered || 0;
  const rate = metrics?.recoveryRate || 0;
  const recoveredCount = metrics?.recoveredCount || 0;
  const totalCount = metrics?.totalCount || 50;
  const haltedCount = metrics?.haltedCount || 0;

  return (
    <div className="metrics-grid">
      {/* Total Volume At Risk */}
      <div className="glass-panel" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Revenue At Risk
            </span>
            <div className="mono" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#F1F5F9', marginTop: '4px' }}>
              ₹{atRisk.toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            <IndianRupee size={18} />
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#64748B' }}>
          Across <strong style={{ color: '#E2E8F0' }}>{totalCount}</strong> degraded payment events
        </div>
      </div>

      {/* Recovered Revenue */}
      <div className="glass-panel" style={{ padding: '16px 18px', borderLeft: '4px solid #10B981', boxShadow: '0 0 25px rgba(16, 185, 129, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recovered Revenue
            </span>
            <div className="mono" style={{ fontSize: '1.55rem', fontWeight: 800, color: '#34D399', marginTop: '4px' }}>
              ₹{recovered.toLocaleString('en-IN')}
            </div>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <TrendingUp size={18} />
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <CheckCircle2 size={13} color="#34D399" />
          <span><strong style={{ color: '#E2E8F0' }}>{recoveredCount}</strong> recovered via Razorpay</span>
        </div>
      </div>

      {/* Net Recovery Rate */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Measured Recovery Rate
            </span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3395FF', marginTop: '6px' }}>
              {rate}%
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(51, 149, 255, 0.15)', color: '#3395FF', border: '1px solid rgba(51, 149, 255, 0.3)' }}>
            <RefreshCw size={22} />
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ width: '100%', height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginTop: '14px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, Math.max(0, rate))}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #3395FF 0%, #10B981 100%)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* Stopping Rules & Compliance */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stopping Rules Enforced
            </span>
            <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '6px' }}>
              {haltedCount} Halted
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <ShieldAlert size={22} />
          </div>
        </div>
        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#64748B' }}>
          Fraud hard-blocks & max touch limits respected
        </div>
      </div>
    </div>
  );
}
