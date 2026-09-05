import React from 'react';
import { Play, RotateCcw, ShieldCheck, Activity, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Header({ 
  onRunBatch, 
  onResetBatch, 
  isRunning, 
  recoveryRate = 0,
  auditCount = 0,
  onOpenAudit 
}) {
  return (
    <header className="glass-panel header-panel" style={{ padding: '14px 20px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0C2340 0%, #3395FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(51, 149, 255, 0.5)',
          boxShadow: '0 0 20px rgba(51, 149, 255, 0.35)',
          flexShrink: 0
        }}>
          <Sparkles size={22} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', margin: 0 }}>
              RazorRecover <span style={{ color: '#3395FF' }}>AI</span>
            </h1>

            {/* Live system status pill */}
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 7px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontWeight: 600
            }}>
              <span className="pulsing-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              System Active
            </span>
          </div>

          <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '3px 0 0 0' }}>
            Autonomous Revenue Recovery & Smart Dunning Engine
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Audit Log Button with live count */}
        <button 
          onClick={onOpenAudit} 
          className="btn-glass-secondary"
          title="Inspect complete compliance decision log"
        >
          <ShieldCheck size={16} color="#34D399" />
          <span>Audit Trail</span>
          <span style={{ 
            fontSize: '0.7rem', 
            background: 'rgba(51, 149, 255, 0.2)', 
            color: '#60A5FA', 
            padding: '1px 6px', 
            borderRadius: '999px',
            fontWeight: 700 
          }}>
            {auditCount}
          </span>
        </button>

        {/* Reset Batch Button */}
        <button 
          onClick={onResetBatch}
          disabled={isRunning}
          className="btn-glass-secondary"
          title="Reset database to baseline 50 failed transactions"
        >
          <RotateCcw size={15} />
          <span>Reset Batch</span>
        </button>

        {/* Run AI Batch Recovery Button */}
        <button 
          onClick={onRunBatch} 
          disabled={isRunning}
          className="btn-primary-action"
        >
          {isRunning ? (
            <>
              <Activity size={18} className="pulsing-dot" />
              <span>Executing AI Batch...</span>
            </>
          ) : (
            <>
              <Play size={17} fill="#FFFFFF" />
              <span>Run AI Batch Recovery (50 Records)</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
