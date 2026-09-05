import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ShieldCheck, 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Clock, 
  Ban, 
  AlertCircle, 
  Sparkles,
  User,
  Store,
  IndianRupee,
  Activity,
  Cpu,
  Zap,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function TransactionTable({ 
  transactions = [], 
  allTransactionsCount = 50,
  counts = {},
  searchTerm, 
  onSearchChange, 
  statusFilter = 'all', 
  onStatusFilterChange,
  onOpenWhatsApp,
  onOpenAuditForTxn,
  onSimulatePay
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const filterTabs = [
    { key: 'all', label: 'All Transactions', count: allTransactionsCount },
    { key: 'failed', label: 'Failed (Baseline)', count: counts.failedCount || 0 },
    { key: 'recovered', label: 'Recovered', count: counts.recoveredCount || 0 },
    { key: 'scheduled_retry', label: 'Scheduled Retry', count: counts.scheduledCount || 0 },
    { key: 'halted_by_rule', label: 'Halted (Rule)', count: counts.haltedCount || 0 }
  ];

  // Reset to page 1 if filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, transactions.length]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, transactions.length);
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  // Helper for method badge styling
  const getMethodBadge = (method = 'upi', bank = 'HDFC') => {
    const isUpi = method.toLowerCase().includes('upi');
    const isCard = method.toLowerCase().includes('card');
    return (
      <span style={{
        fontSize: '0.66rem',
        padding: '2px 6px',
        borderRadius: '4px',
        background: isUpi ? 'rgba(51, 149, 255, 0.12)' : (isCard ? 'rgba(168, 85, 247, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
        color: isUpi ? '#60A5FA' : (isCard ? '#C084FC' : '#FBBF24'),
        border: '1px solid ' + (isUpi ? 'rgba(51, 149, 255, 0.25)' : (isCard ? 'rgba(168, 85, 247, 0.25)' : 'rgba(245, 158, 11, 0.25)')),
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px'
      }}>
        {method.toUpperCase()} • {bank}
      </span>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: '14px', overflow: 'hidden' }}>
      {/* Table Controls Header */}
      <div className="table-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(51, 149, 255, 0.2)',
            borderRadius: '8px',
            padding: '8px 12px',
            width: '100%',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.2s ease'
          }}>
            <Search size={15} color="#60A5FA" />
            <input 
              type="text"
              placeholder="Search customer, merchant, bank or ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                outline: 'none',
                fontSize: '0.82rem',
                width: '100%',
                fontFamily: 'inherit'
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => onSearchChange('')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs with Live Dynamic Counts */}
        <div className="status-filter-scroll" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onStatusFilterChange(tab.key)}
                style={{
                  background: isActive 
                    ? 'linear-gradient(135deg, #3395FF 0%, #0052CC 100%)' 
                    : 'rgba(255, 255, 255, 0.035)',
                  color: isActive ? '#FFFFFF' : '#94A3B8',
                  border: '1px solid ' + (isActive ? 'rgba(51, 149, 255, 0.6)' : 'rgba(255, 255, 255, 0.08)'),
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isActive ? '0 4px 14px rgba(0, 102, 255, 0.4)' : 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.07)',
                  color: isActive ? '#FFFFFF' : '#CBD5E1',
                  fontWeight: 800
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction Table with Responsive Fitting */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
              color: '#94A3B8', 
              fontSize: '0.7rem', 
              textTransform: 'uppercase', 
              letterSpacing: '0.06em',
              fontWeight: 700
            }}>
              <th style={{ padding: '12px 12px', minWidth: '170px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={12} color="#60A5FA" />
                  <span>Customer & Merchant</span>
                </div>
              </th>
              <th style={{ padding: '12px 12px', minWidth: '115px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IndianRupee size={12} color="#34D399" />
                  <span>Amount</span>
                </div>
              </th>
              <th style={{ padding: '12px 12px', minWidth: '175px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Activity size={12} color="#F87171" />
                  <span>Failure Root Cause</span>
                </div>
              </th>
              <th style={{ padding: '12px 12px', minWidth: '145px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Cpu size={12} color="#A78BFA" />
                  <span>AI Intervention</span>
                </div>
              </th>
              <th style={{ padding: '12px 12px', minWidth: '90px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Zap size={12} color="#FBBF24" />
                  <span>Confidence</span>
                </div>
              </th>
              <th style={{ padding: '12px 12px', minWidth: '105px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={12} color="#38BDF8" />
                  <span>Status</span>
                </div>
              </th>
              <th style={{ padding: '12px 12px', textAlign: 'right', minWidth: '165px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                  <SlidersHorizontal size={12} color="#60A5FA" />
                  <span>Actions</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '44px 20px', color: '#64748B' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(51, 149, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    border: '1px solid rgba(51, 149, 255, 0.2)'
                  }}>
                    <Search size={20} color="#60A5FA" />
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#F1F5F9' }}>No transactions match this filter.</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px', color: '#94A3B8' }}>
                    Try clearing your search query or switching tabs above.
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((txn, idx) => {
                const isRecovered = txn.status === 'recovered';
                const isHalted = txn.status === 'halted_by_rule' || txn.status === 'opted_out';
                const isScheduled = txn.status === 'scheduled_retry' || txn.status === 'outreach_active';
                const isFailed = !isRecovered && !isHalted && !isScheduled;

                // Customer initials for avatar
                const initials = txn.customer?.name 
                  ? txn.customer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : 'TX';

                return (
                  <tr 
                    key={txn.id}
                    className="txn-table-row"
                    style={{
                      background: idx % 2 === 0 ? 'rgba(10, 15, 28, 0.45)' : 'rgba(15, 23, 42, 0.25)',
                    }}
                  >
                    {/* Customer & Merchant */}
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isRecovered 
                            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 100%)'
                            : (isHalted 
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.1) 100%)'
                                : 'linear-gradient(135deg, rgba(51, 149, 255, 0.25) 0%, rgba(30, 64, 175, 0.1) 100%)'),
                          color: isRecovered ? '#34D399' : (isHalted ? '#F87171' : '#60A5FA'),
                          border: '1px solid ' + (isRecovered ? 'rgba(16, 185, 129, 0.4)' : (isHalted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(51, 149, 255, 0.35)')),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.76rem',
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.84rem' }}>
                            {txn.customer?.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{txn.merchant}</span>
                            <span style={{ color: '#475569' }}>•</span>
                            <span style={{ color: '#38BDF8', fontSize: '0.66rem' }}>{txn.businessType}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Amount & Method */}
                    <td style={{ padding: '11px 12px' }}>
                      <div className="mono" style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.88rem', letterSpacing: '-0.01em' }}>
                        ₹{txn.amount?.toLocaleString('en-IN')}
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        {getMethodBadge(txn.paymentMethod || 'UPI', txn.bank || 'HDFC')}
                      </div>
                    </td>

                    {/* Root Cause */}
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        color: '#E2E8F0',
                        fontWeight: 600,
                        fontSize: '0.68rem'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isHalted ? '#EF4444' : '#F59E0B' }} />
                        <span className="mono">{txn.failureCode?.replace(/_/g, ' ')}</span>
                      </div>
                      <div 
                        style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        title={txn.failureMessage}
                      >
                        {txn.failureMessage}
                      </div>
                    </td>

                    {/* AI Intervention */}
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        background: 'rgba(51, 149, 255, 0.12)',
                        border: '1px solid rgba(51, 149, 255, 0.28)',
                        color: '#60A5FA',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>
                        <Sparkles size={10} />
                        <span>{txn.diagnostic?.primaryChannel?.replace(/_/g, ' ') || 'AI Diagnosed'}</span>
                      </div>
                      {txn.nextRetryWindow && (
                        <div style={{ fontSize: '0.66rem', color: '#FBBF24', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <Clock size={10} />
                          <span>{txn.nextRetryWindow}</span>
                        </div>
                      )}
                    </td>

                    {/* Recovery Confidence */}
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '44px', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${(txn.diagnostic?.recoveryConfidence || 0.5) * 100}%`,
                            height: '100%',
                            borderRadius: '999px',
                            background: txn.diagnostic?.recoveryConfidence > 0.7 
                              ? 'linear-gradient(90deg, #10B981, #34D399)' 
                              : (txn.diagnostic?.recoveryConfidence > 0.3 
                                  ? 'linear-gradient(90deg, #3395FF, #60A5FA)' 
                                  : 'linear-gradient(90deg, #EF4444, #F87171)')
                          }} />
                        </div>
                        <span className="mono" style={{ fontSize: '0.72rem', color: '#F1F5F9', fontWeight: 700 }}>
                          {Math.round((txn.diagnostic?.recoveryConfidence || 0) * 100)}%
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '11px 12px' }}>
                      {isRecovered && (
                        <span className="badge-pill badge-recovered-pill">
                          <CheckCircle2 size={11} /> Recovered
                        </span>
                      )}
                      {isHalted && (
                        <span className="badge-pill badge-halted-pill" title={txn.haltReason || 'Halted by stopping rule'}>
                          <Ban size={11} /> Halted (Rule)
                        </span>
                      )}
                      {isScheduled && (
                        <span className="badge-pill badge-scheduled-pill">
                          <Clock size={11} /> Scheduled
                        </span>
                      )}
                      {isFailed && (
                        <span className="badge-pill badge-failed-pill">
                          <AlertCircle size={11} /> Failed
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '11px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {/* WhatsApp Simulator trigger */}
                        <button
                          onClick={() => onOpenWhatsApp(txn)}
                          title="Open Hinglish WhatsApp Dunning Sandbox"
                          className="btn-action-whatsapp"
                        >
                          <MessageSquare size={12} />
                          <span>WhatsApp</span>
                        </button>

                        {/* Audit inspector */}
                        <button
                          onClick={() => onOpenAuditForTxn(txn)}
                          title="Inspect AI Decision & Audit Trail"
                          className="btn-action-audit"
                        >
                          <ShieldCheck size={12} />
                          <span>Audit</span>
                        </button>

                        {/* Pay Now simulator if not recovered */}
                        {!isRecovered && !isHalted && (
                          <button
                            onClick={() => onSimulatePay(txn)}
                            title="Simulate 1-Click Razorpay Payment Settlement"
                            className="btn-action-pay"
                          >
                            <CreditCard size={12} />
                            <span>Pay</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Telemetry Footer */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '14px', 
        padding: '0 4px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        {/* Record count info */}
        <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
          Showing <strong style={{ color: '#F1F5F9' }}>{transactions.length > 0 ? startIndex + 1 : 0}</strong> - <strong style={{ color: '#F1F5F9' }}>{endIndex}</strong> of <strong style={{ color: '#F1F5F9' }}>{transactions.length}</strong> records
        </div>

        {/* Pagination Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
            <span>Prev</span>
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`page-number-pill ${currentPage === page ? 'active' : ''}`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="Next Page"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Page size toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748B' }}>
          <span>Per page:</span>
          {[8, 15, 50].map(sz => (
            <button
              key={sz}
              onClick={() => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
              style={{
                background: pageSize === sz ? 'rgba(51, 149, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: pageSize === sz ? '#60A5FA' : '#94A3B8',
                border: '1px solid ' + (pageSize === sz ? 'rgba(51, 149, 255, 0.4)' : 'rgba(255, 255, 255, 0.08)'),
                padding: '2px 7px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: pageSize === sz ? 700 : 500,
                fontSize: '0.72rem'
              }}
            >
              {sz === 50 ? 'All' : sz}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
