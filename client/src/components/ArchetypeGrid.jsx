import React from 'react';
import { Landmark, Wallet, ShoppingCart, KeyRound, Briefcase, Ban, CheckCircle2 } from 'lucide-react';

const ARCHETYPES = [
  {
    code: 'INSUFFICIENT_FUNDS',
    title: 'Insufficient Funds',
    channel: 'Salary Window & WhatsApp',
    icon: Wallet,
    color: '#38BDF8',
    bg: 'rgba(56, 189, 248, 0.12)'
  },
  {
    code: 'BANK_DOWNTIME',
    title: 'Bank CBS Downtime',
    channel: 'Silent Mandate Retry',
    icon: Landmark,
    color: '#818CF8',
    bg: 'rgba(129, 140, 248, 0.12)'
  },
  {
    code: 'CHECKOUT_DROP_OFF',
    title: 'Checkout Drop-off',
    channel: '15m Cart Revival Link',
    icon: ShoppingCart,
    color: '#FB923C',
    bg: 'rgba(251, 146, 60, 0.12)'
  },
  {
    code: 'MANDATE_EXPIRED_OR_PAUSED',
    title: 'Mandate Expired',
    channel: 'Instant Re-authorization',
    icon: KeyRound,
    color: '#A78BFA',
    bg: 'rgba(167, 139, 250, 0.12)'
  },
  {
    code: 'INVOICE_OVERDUE_B2B',
    title: 'B2B Overdue Invoices',
    channel: 'Promise-to-Pay Tracker',
    icon: Briefcase,
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.12)'
  },
  {
    code: 'FRAUD_OR_CARD_BLOCKED',
    title: 'Fraud & Hotlisted',
    channel: 'Hard Stopping Rule (Halt)',
    icon: Ban,
    color: '#F87171',
    bg: 'rgba(248, 113, 113, 0.12)'
  }
];

export default function ArchetypeGrid({ breakdown = {}, activeFilter = 'all', onSelectFilter }) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <h2 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.01em', margin: 0 }}>
            Diagnostic Archetypes & Intervention Strategy
          </h2>
          <p style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '1px', margin: '1px 0 0 0' }}>
            Click any archetype to filter the transaction batch below
          </p>
        </div>

        {activeFilter && activeFilter !== 'all' && (
          <button 
            onClick={() => onSelectFilter('all')} 
            style={{ 
              background: 'rgba(51, 149, 255, 0.12)', 
              border: '1px solid rgba(51, 149, 255, 0.3)', 
              color: '#60A5FA', 
              fontSize: '0.74rem', 
              cursor: 'pointer', 
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '6px'
            }}
          >
            ✕ Reset Filter (Showing All)
          </button>
        )}
      </div>

      <div className="archetypes-grid">
        {ARCHETYPES.map((arch) => {
          const Icon = arch.icon;
          const stats = breakdown[arch.code] || { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 };
          const isSelected = activeFilter === arch.code;
          const recoveryPercent = stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0;

          return (
            <div
              key={arch.code}
              onClick={() => onSelectFilter(isSelected ? 'all' : arch.code)}
              className="glass-panel"
              style={{
                padding: '12px 14px',
                cursor: 'pointer',
                borderColor: isSelected ? arch.color : 'rgba(255, 255, 255, 0.08)',
                background: isSelected ? 'rgba(18, 28, 48, 0.95)' : 'rgba(13, 19, 31, 0.75)',
                boxShadow: isSelected ? `0 0 20px ${arch.color}33` : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
            >
              {/* Header Icon + Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ padding: '6px', borderRadius: '7px', background: arch.bg, color: arch.color }}>
                  <Icon size={15} />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', display: 'block' }}>
                    {arch.title}
                  </span>
                </div>
              </div>

              {/* Subtitle Channel */}
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: '8px' }}>
                {arch.channel}
              </div>

              {/* Recovery Stats */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                <div>
                  <span className="mono" style={{ fontSize: '0.88rem', fontWeight: 700, color: arch.color }}>
                    {stats.recovered} / {stats.total}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'block' }}>
                    recovered
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    padding: '2px 7px', 
                    borderRadius: '999px',
                    background: recoveryPercent > 50 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)',
                    color: recoveryPercent > 50 ? '#34D399' : '#CBD5E1',
                    fontWeight: 700
                  }}>
                    {recoveryPercent}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
