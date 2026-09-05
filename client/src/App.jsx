import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import MetricsOverview from './components/MetricsOverview';
import ArchetypeGrid from './components/ArchetypeGrid';
import TransactionTable from './components/TransactionTable';
import WhatsAppSandboxModal from './components/WhatsAppSandboxModal';
import AuditTrailDrawer from './components/AuditTrailDrawer';
import confetti from 'canvas-confetti';
import api from './services/apiClient';

export default function App() {
  const [metrics, setMetrics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [archetypeFilter, setArchetypeFilter] = useState('all');
  const [isRunning, setIsRunning] = useState(false);
  
  // Modals state
  const [selectedWhatsAppTxn, setSelectedWhatsAppTxn] = useState(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditFilterTxnId, setAuditFilterTxnId] = useState(null);

  // Load state from backend (with automatic in-browser fallback if backend unavailable)
  const loadData = async () => {
    try {
      const [mData, tData, aData] = await Promise.all([
        api.getMetrics(),
        api.getTransactions(),
        api.getAuditLogs()
      ]);

      if (mData) setMetrics(mData);
      if (tData?.transactions) setTransactions(tData.transactions);
      if (aData?.auditLogs) setAuditLogs(aData.auditLogs);
    } catch (err) {
      console.error('Error loading RazorRecover data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live counts for the status filter tabs
  const tabCounts = useMemo(() => {
    let failed = 0;
    let recovered = 0;
    let scheduled = 0;
    let halted = 0;

    transactions.forEach(t => {
      if (t.status === 'recovered') recovered++;
      else if (t.status === 'halted_by_rule' || t.status === 'opted_out') halted++;
      else if (t.status === 'scheduled_retry' || t.status === 'outreach_active') scheduled++;
      else failed++;
    });

    return {
      failedCount: failed,
      recoveredCount: recovered,
      scheduledCount: scheduled,
      haltedCount: halted
    };
  }, [transactions]);

  // Filtered transactions
  const displayedTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Query Filter
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = t.customer?.name?.toLowerCase().includes(q);
        const matchMerchant = t.merchant?.toLowerCase().includes(q);
        const matchId = t.id?.toLowerCase().includes(q);
        const matchBank = t.bank?.toLowerCase().includes(q);
        if (!matchName && !matchMerchant && !matchId && !matchBank) return false;
      }

      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'halted_by_rule') {
          if (t.status !== 'halted_by_rule' && t.status !== 'opted_out') return false;
        } else if (statusFilter === 'scheduled_retry') {
          if (t.status !== 'scheduled_retry' && t.status !== 'outreach_active') return false;
        } else if (statusFilter === 'failed') {
          if (t.status === 'recovered' || t.status === 'halted_by_rule' || t.status === 'opted_out' || t.status === 'scheduled_retry' || t.status === 'outreach_active') {
            return false;
          }
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // 3. Archetype Filter (Matches diagnosed category)
      if (archetypeFilter !== 'all') {
        const cat = t.diagnostic?.category;
        if (cat !== archetypeFilter) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, statusFilter, archetypeFilter]);

  // Run Batch Recovery
  const handleRunBatch = async () => {
    setIsRunning(true);
    try {
      const data = await api.runBatchRecovery();
      await loadData();

      if (data?.summary && data.summary.recovered > 0) {
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.5 }
        });
      }
    } catch (err) {
      console.error('Batch recovery failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // Reset Batch
  const handleResetBatch = async () => {
    try {
      await api.resetBatch();
      setStatusFilter('all');
      setArchetypeFilter('all');
      setSearchTerm('');
      await loadData();
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  // 1-Click Pay simulation
  const handleSimulatePay = async (txn) => {
    try {
      await api.simulatePayment(txn.id);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 }
      });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open audit drawer focused on specific transaction
  const handleOpenAuditForTxn = (txn) => {
    setAuditFilterTxnId(txn.id);
    setIsAuditOpen(true);
  };

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <Header 
        onRunBatch={handleRunBatch}
        onResetBatch={handleResetBatch}
        isRunning={isRunning}
        recoveryRate={metrics?.recoveryRate || 0}
        auditCount={auditLogs.length}
        onOpenAudit={() => {
          setAuditFilterTxnId(null);
          setIsAuditOpen(true);
        }}
      />

      {/* KPI Metric Overview */}
      <MetricsOverview metrics={metrics} />

      {/* 6 Failure Archetypes Grid */}
      <ArchetypeGrid 
        breakdown={metrics?.breakdown || {}}
        activeFilter={archetypeFilter}
        onSelectFilter={setArchetypeFilter}
      />

      {/* Main 50-Record Batch Table */}
      <TransactionTable 
        transactions={displayedTransactions}
        allTransactionsCount={transactions.length}
        counts={tabCounts}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onOpenWhatsApp={(txn) => setSelectedWhatsAppTxn(txn)}
        onOpenAuditForTxn={handleOpenAuditForTxn}
        onSimulatePay={handleSimulatePay}
      />

      {/* WhatsApp & Voice Concierge Sandbox Modal */}
      {selectedWhatsAppTxn && (
        <WhatsAppSandboxModal 
          txn={selectedWhatsAppTxn}
          onClose={() => setSelectedWhatsAppTxn(null)}
          onPaymentSettled={async () => {
            await loadData();
          }}
        />
      )}

      {/* Immutable Audit Trail Slide-in Drawer */}
      <AuditTrailDrawer 
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        auditLogs={auditLogs}
        filterTxnId={auditFilterTxnId}
        onClearFilterTxn={() => setAuditFilterTxnId(null)}
      />

      {/* Footer watermark */}
      <footer style={{ marginTop: '20px', textAlign: 'center', color: '#64748B', fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
        <p>
          Built for <strong style={{ color: '#E2E8F0' }}>Razorpay AI Builder Internship 2026</strong> • Track 03: AI Revenue Recovery
        </p>
        <p style={{ marginTop: '3px', fontSize: '0.7rem' }}>
          MERN Stack Architecture • Razorpay Test Mode API • TRAI / RBI Stopping Rules Compliance
        </p>
      </footer>
    </div>
  );
}
