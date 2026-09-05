import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Clock, AlertTriangle, UserX, FileText, Filter, Check, ArrowRight } from 'lucide-react';

export default function AuditTrailDrawer({ isOpen, onClose, auditLogs = [], filterTxnId = null, onClearFilterTxn }) {
  const [filterType, setFilterType] = useState('ALL');

  if (!isOpen) return null;

  let displayLogs = auditLogs || [];
  if (filterTxnId) {
    displayLogs = displayLogs.filter(l => l.transactionId === filterTxnId);
  }
  if (filterType !== 'ALL') {
    displayLogs = displayLogs.filter(l => (l.actionType || '').includes(filterType));
  }

  const getActionIcon = (action = '') => {
    const act = (action || '').toUpperCase();
    if (act.includes('RECOVERED') || act.includes('SUCCESS') || act.includes('SETTLED')) {
      return <CheckCircle2 size={16} color="#34D399" />;
    }
    if (act.includes('GUARDRAIL') || act.includes('BLOCKED') || act.includes('INTERLOCK') || act.includes('HALT')) {
      return <ShieldAlert size={16} color="#F87171" />;
    }
    if (act.includes('OPT_OUT')) {
      return <UserX size={16} color="#F59E0B" />;
    }
    if (act.includes('SCHEDULED') || act.includes('PROMISE')) {
      return <Clock size={16} color="#FBBF24" />;
    }
    return <FileText size={16} color="#60A5FA" />;
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div 
        className="glass-card drawer-slide-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          width: '560px',
          maxWidth: '100vw',
          height: '100vh',
          borderRadius: '0',
          borderLeft: '1px solid rgba(51, 149, 255, 0.25)',
          background: '#090E18',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 50px rgba(0, 0, 0, 0.85)',
          position: 'relative',
          zIndex: 100000
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 28, 0.85) 100%)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', margin: 0 }}>
                Immutable Audit Trail
              </h2>
              <span style={{ 
                background: 'rgba(16, 185, 129, 0.15)', 
                color: '#34D399', 
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                VERIFIED LOG
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px', margin: '4px 0 0 0' }}>
              Cryptographic ledger of all money movements, LLM traces & stopping rules.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255, 255, 255, 0.06)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              color: '#CBD5E1', 
              cursor: 'pointer', 
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            title="Close Audit Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ 
          padding: '12px 24px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.015)'
        }}>
          {filterTxnId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#60A5FA' }}>
              <span>Filtering for: <strong className="mono" style={{ color: '#93C5FD' }}>{filterTxnId}</strong></span>
              <button 
                onClick={onClearFilterTxn}
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  color: '#F87171', 
                  cursor: 'pointer', 
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
              Showing <strong style={{ color: '#E2E8F0' }}>{displayLogs.length}</strong> verified events
            </span>
          )}

          <div style={{ display: 'flex', gap: '5px' }}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'RECOVERED', label: 'Recovered' },
              { id: 'GUARDRAIL', label: 'Guardrail' },
              { id: 'OPT_OUT', label: 'Opt-Out' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                style={{
                  background: filterType === tab.id ? '#3395FF' : 'rgba(255,255,255,0.04)',
                  color: filterType === tab.id ? '#FFFFFF' : '#94A3B8',
                  border: '1px solid ' + (filterType === tab.id ? '#3395FF' : 'rgba(255,255,255,0.08)'),
                  padding: '4px 9px',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Entries List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {displayLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(51, 149, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                border: '1px solid rgba(51, 149, 255, 0.2)'
              }}>
                <FileText size={20} color="#60A5FA" />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#E2E8F0' }}>No specific events recorded yet</div>
              <div style={{ fontSize: '0.78rem', marginTop: '6px', color: '#94A3B8', maxWidth: '320px', margin: '6px auto 0' }}>
                Run the batch recovery engine or simulate customer interaction on this record to generate live audit traces.
              </div>
            </div>
          ) : (
            displayLogs.map((log) => {
              const actionTitle = (log.actionType || 'SYSTEM_EVENT').replace(/_/g, ' ');
              const isHalted = actionTitle.includes('GUARDRAIL') || actionTitle.includes('HALT');
              const isSuccess = actionTitle.includes('RECOVER') || actionTitle.includes('SETTLED') || actionTitle.includes('SUCCESS');
              const formattedTime = log.timestamp 
                ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'Recorded';

              return (
                <div 
                  key={log.id || `log_${Math.random()}`} 
                  style={{
                    background: isSuccess 
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(10, 15, 28, 0.8) 100%)'
                      : (isHalted 
                          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(10, 15, 28, 0.8) 100%)'
                          : 'rgba(255, 255, 255, 0.03)'),
                    border: '1px solid ' + (isSuccess 
                      ? 'rgba(16, 185, 129, 0.25)' 
                      : (isHalted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)')),
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '0.82rem',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getActionIcon(log.actionType)}
                      <span style={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.84rem' }}>
                        {actionTitle}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: '0.7rem', color: '#64748B' }}>
                      {formattedTime}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: '1.45', marginBottom: '10px' }}>
                    {log.rationale}
                  </div>

                  {/* Transaction & Metadata reference */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.72rem', 
                    color: '#94A3B8', 
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
                    paddingTop: '10px' 
                  }}>
                    <span>Target: <strong className="mono" style={{ color: '#60A5FA' }}>{log.transactionId}</strong></span>
                    {log.guardrailResult && log.guardrailResult.ruleTriggered && (
                      <span style={{ color: '#F87171', fontWeight: 700 }}>
                        Rule: {log.guardrailResult.ruleTriggered}
                      </span>
                    )}
                    {log.metadata?.paymentLinkId && (
                      <span className="mono" style={{ color: '#34D399', fontWeight: 600 }}>
                        {log.metadata.paymentLinkId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
