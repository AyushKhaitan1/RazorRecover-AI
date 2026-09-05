const db = require('../db/store');
const { diagnoseFailure } = require('../services/diagnostics');
const { evaluateGuardrails } = require('../services/guardrails');
const { calculateOptimalRetry } = require('../services/sequencer');
const { generateHinglishDunningCopy, processConversationalReply, generateVoiceScript } = require('../services/agent');
const { createRecoveryPaymentLink } = require('../services/razorpayClient');

// Helper to log immutable audit events
function recordAuditLog({ transactionId, actionType, status, rationale, guardrailResult = null, metadata = {} }) {
  return db.auditLogs.create({
    transactionId,
    actionType,
    status,
    rationale,
    guardrailResult,
    metadata,
    timestamp: new Date().toISOString()
  });
}

/**
 * Get aggregated batch metrics
 */
exports.getMetrics = (req, res) => {
  const allTxns = db.transactions.find();
  const totalVolumeAtRisk = allTxns.reduce((sum, t) => sum + t.amount, 0);
  
  const recoveredTxns = allTxns.filter(t => t.status === 'recovered');
  const totalVolumeRecovered = recoveredTxns.reduce((sum, t) => sum + t.amount, 0);

  const haltedTxns = allTxns.filter(t => t.status === 'halted_by_rule' || t.status === 'opted_out');
  const scheduledTxns = allTxns.filter(t => t.status === 'scheduled_retry' || t.status === 'outreach_active');
  const failedTxns = allTxns.filter(t => t.status === 'failed');

  const recoveryRate = totalVolumeAtRisk > 0 ? ((totalVolumeRecovered / totalVolumeAtRisk) * 100).toFixed(1) : 0;

  // Breakdown by diagnostic archetype category
  const breakdown = {
    INSUFFICIENT_FUNDS: { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 },
    BANK_DOWNTIME: { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 },
    CHECKOUT_DROP_OFF: { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 },
    MANDATE_EXPIRED_OR_PAUSED: { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 },
    INVOICE_OVERDUE_B2B: { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 },
    FRAUD_OR_CARD_BLOCKED: { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 }
  };

  allTxns.forEach(t => {
    const diag = diagnoseFailure(t);
    const cat = diag.category || 'INSUFFICIENT_FUNDS';
    if (!breakdown[cat]) {
      breakdown[cat] = { total: 0, recovered: 0, amount: 0, recoveredAmount: 0 };
    }
    breakdown[cat].total += 1;
    breakdown[cat].amount += t.amount;
    if (t.status === 'recovered') {
      breakdown[cat].recovered += 1;
      breakdown[cat].recoveredAmount += t.amount;
    }
  });

  return res.json({
    totalCount: allTxns.length,
    recoveredCount: recoveredTxns.length,
    pendingCount: scheduledTxns.length,
    failedCount: failedTxns.length,
    haltedCount: haltedTxns.length,
    scheduledCount: scheduledTxns.length,
    totalVolumeAtRisk,
    totalVolumeRecovered,
    recoveryRate: parseFloat(recoveryRate),
    breakdown,
    recentAudits: db.auditLogs.find().slice(-10).reverse()
  });
};

/**
 * List all transactions with diagnostics attached
 */
exports.getTransactions = (req, res) => {
  const { status, failureCode, category, search } = req.query;
  let list = db.transactions.find();

  // Attach runtime diagnostic summary to each
  let enriched = list.map(txn => {
    const diagnostic = diagnoseFailure(txn);
    const guardrail = evaluateGuardrails(txn);
    return {
      ...txn,
      status: txn.status || 'failed',
      diagnostic,
      guardrail
    };
  });

  if (status && status !== 'all') {
    if (status === 'halted_by_rule') {
      enriched = enriched.filter(t => t.status === 'halted_by_rule' || t.status === 'opted_out');
    } else if (status === 'scheduled_retry') {
      enriched = enriched.filter(t => t.status === 'scheduled_retry' || t.status === 'outreach_active');
    } else {
      enriched = enriched.filter(t => t.status === status);
    }
  }

  if (category && category !== 'all') {
    enriched = enriched.filter(t => t.diagnostic.category === category);
  } else if (failureCode && failureCode !== 'all') {
    enriched = enriched.filter(t => t.failureCode === failureCode);
  }

  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter(t => 
      t.customer.name.toLowerCase().includes(q) ||
      t.merchant.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.bank.toLowerCase().includes(q)
    );
  }

  return res.json({ transactions: enriched });
};

/**
 * Get specific transaction details
 */
exports.getTransactionById = (req, res) => {
  const txn = db.transactions.findById(req.params.id);
  if (!txn) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  const diagnostic = diagnoseFailure(txn);
  const guardrail = evaluateGuardrails(txn);
  const retryPlan = calculateOptimalRetry(txn, txn.touchpointCount || 0);
  const auditTrail = db.auditLogs.find({ transactionId: txn.id });
  const voiceScript = generateVoiceScript(txn);

  return res.json({
    transaction: { ...txn, status: txn.status || 'failed' },
    diagnostic,
    guardrail,
    retryPlan,
    auditTrail,
    voiceScript
  });
};

/**
 * Execute automated AI Recovery across the entire batch
 */
exports.runBatchRecovery = async (req, res) => {
  const allTxns = db.transactions.find();
  const results = {
    processed: 0,
    recovered: 0,
    scheduled: 0,
    haltedByGuardrail: 0,
    moneyRecovered: 0
  };

  for (const txn of allTxns) {
    // If already recovered or halted, skip
    if (txn.status === 'recovered' || txn.status === 'opted_out') continue;

    results.processed += 1;
    const diagnostic = diagnoseFailure(txn);
    const guardrail = evaluateGuardrails(txn, 'OUTREACH');

    // 1. Guardrail check (e.g. hard fraud or hotlisted card)
    if (!guardrail.allowed) {
      db.transactions.updateById(txn.id, {
        status: 'halted_by_rule',
        haltReason: guardrail.reason,
        ruleTriggered: guardrail.ruleTriggered
      });
      recordAuditLog({
        transactionId: txn.id,
        actionType: 'GUARDRAIL_INTERLOCK_TRIGGERED',
        status: 'HALTED',
        rationale: guardrail.reason,
        guardrailResult: guardrail
      });
      results.haltedByGuardrail += 1;
      continue;
    }

    // 2. Actionable recovery path
    const paymentLink = await createRecoveryPaymentLink(txn);
    const dunningCopy = generateHinglishDunningCopy(txn, paymentLink);
    const retryPlan = calculateOptimalRetry(txn, txn.touchpointCount || 0);

    // Stochastic recovery: simulate realistic recovery rate (~70-90%)
    const recoveredThisTurn = Math.random() < Math.max(0.65, diagnostic.recoveryConfidence);

    if (recoveredThisTurn) {
      db.transactions.updateById(txn.id, {
        status: 'recovered',
        recoveredAt: new Date().toISOString(),
        touchpointCount: (txn.touchpointCount || 0) + 1,
        activePaymentLink: paymentLink,
        recoveryChannel: diagnostic.primaryChannel,
        recoveredVia: diagnostic.primaryChannel.includes('WHATSAPP') ? 'Razorpay Payment Link' : 'Automated Mandate Switch',
        razorpayPaymentId: `pay_rec_${Math.random().toString(36).substr(2, 9)}`
      });

      recordAuditLog({
        transactionId: txn.id,
        actionType: 'REVENUE_RECOVERED',
        status: 'SUCCESS',
        rationale: `Successfully recovered ₹${txn.amount.toLocaleString('en-IN')} via ${diagnostic.primaryChannel.replace(/_/g, ' ')}. Confidence score: ${(diagnostic.recoveryConfidence * 100).toFixed(0)}%.`,
        guardrailResult: guardrail,
        metadata: { paymentLinkId: paymentLink.paymentLinkId, amount: txn.amount }
      });

      results.recovered += 1;
      results.moneyRecovered += txn.amount;
    } else {
      // Scheduled for optimal next sequence
      db.transactions.updateById(txn.id, {
        status: 'scheduled_retry',
        touchpointCount: (txn.touchpointCount || 0) + 1,
        lastTouchpointAt: new Date().toISOString(),
        activePaymentLink: paymentLink,
        nextRetryScheduledAt: retryPlan.scheduledAt,
        nextRetryWindow: retryPlan.scheduledAtHuman,
        retryRationale: retryPlan.sequenceRationale,
        dunningPreview: dunningCopy
      });

      recordAuditLog({
        transactionId: txn.id,
        actionType: 'INTERVENTION_DISPATCHED_AND_SCHEDULED',
        status: 'SCHEDULED',
        rationale: `Outreach scheduled via ${diagnostic.primaryChannel.replace(/_/g, ' ')}. ${retryPlan.sequenceRationale}`,
        guardrailResult: guardrail,
        metadata: { nextRetry: retryPlan.scheduledAtHuman }
      });

      results.scheduled += 1;
    }
  }

  // Calculate live fresh metrics
  const freshTxns = db.transactions.find();
  const totalVolumeAtRisk = freshTxns.reduce((sum, t) => sum + t.amount, 0);
  const recoveredTxns = freshTxns.filter(t => t.status === 'recovered');
  const totalVolumeRecovered = recoveredTxns.reduce((sum, t) => sum + t.amount, 0);

  return res.json({
    message: 'Batch recovery run completed successfully',
    summary: results,
    metrics: {
      totalVolumeAtRisk,
      totalVolumeRecovered,
      recoveryRate: totalVolumeAtRisk > 0 ? parseFloat(((totalVolumeRecovered / totalVolumeAtRisk) * 100).toFixed(1)) : 0,
      recoveredCount: recoveredTxns.length
    }
  });
};

/**
 * Trigger single recovery action on a transaction
 */
exports.triggerSingleRecovery = async (req, res) => {
  const { id } = req.params;
  const txn = db.transactions.findById(id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  const diagnostic = diagnoseFailure(txn);
  const guardrail = evaluateGuardrails(txn, 'OUTREACH');

  if (!guardrail.allowed) {
    recordAuditLog({
      transactionId: txn.id,
      actionType: 'MANUAL_INTERVENTION_BLOCKED',
      status: 'HALTED',
      rationale: guardrail.reason,
      guardrailResult: guardrail
    });
    return res.status(400).json({ error: guardrail.reason, guardrail });
  }

  const paymentLink = await createRecoveryPaymentLink(txn);
  const dunningCopy = generateHinglishDunningCopy(txn, paymentLink);
  const retryPlan = calculateOptimalRetry(txn, txn.touchpointCount || 0);

  const updated = db.transactions.updateById(txn.id, {
    status: 'scheduled_retry',
    touchpointCount: (txn.touchpointCount || 0) + 1,
    lastTouchpointAt: new Date().toISOString(),
    activePaymentLink: paymentLink,
    dunningPreview: dunningCopy,
    nextRetryScheduledAt: retryPlan.scheduledAt
  });

  recordAuditLog({
    transactionId: txn.id,
    actionType: 'MANUAL_INTERVENTION_SENT',
    status: 'DISPATCHED',
    rationale: `Dispatched interactive ${diagnostic.primaryChannel.replace(/_/g, ' ')} dunning message. Touchpoint #${(txn.touchpointCount || 0) + 1}`,
    guardrailResult: guardrail,
    metadata: { paymentLinkId: paymentLink.paymentLinkId }
  });

  return res.json({ transaction: updated, dunningCopy, paymentLink, retryPlan });
};

/**
 * Process conversational reply in WhatsApp / Voice simulator
 */
exports.handleConversationalReply = (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const txn = db.transactions.findById(id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  const replyResult = processConversationalReply(txn, message || '');

  if (replyResult.intent === 'OPT_OUT') {
    db.transactions.updateById(txn.id, {
      status: 'opted_out',
      optedOut: true,
      optedOutAt: new Date().toISOString()
    });
    recordAuditLog({
      transactionId: txn.id,
      actionType: 'CUSTOMER_OPT_OUT_RECORDED',
      status: 'CANCELLED',
      rationale: `Customer replied: "${message}". Mandate cancelled and outreach stopped permanently per TRAI / DPDP compliance.`,
      metadata: { userReply: message }
    });
  } else if (replyResult.intent === 'PROMISE_TO_PAY') {
    db.transactions.updateById(txn.id, {
      status: 'scheduled_retry',
      promisedAt: replyResult.promisedDate
    });
    recordAuditLog({
      transactionId: txn.id,
      actionType: 'PROMISE_TO_PAY_LOGGED',
      status: 'POSTPONED',
      rationale: `Customer promised payment: "${message}". Automated retries paused until ${new Date(replyResult.promisedDate).toLocaleDateString('en-IN')}.`,
      metadata: { userReply: message }
    });
  }

  return res.json({
    reply: replyResult.reply,
    intent: replyResult.intent,
    action: replyResult.action,
    stoppingRuleEnforced: replyResult.stoppingRuleEnforced
  });
};

/**
 * Simulate 1-click Razorpay payment link fulfillment
 */
exports.simulatePaymentSuccess = (req, res) => {
  const { id } = req.params;
  const txn = db.transactions.findById(id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  const razorpayPaymentId = `pay_test_${Math.random().toString(36).substr(2, 9)}`;
  const updated = db.transactions.updateById(id, {
    status: 'recovered',
    recoveredAt: new Date().toISOString(),
    recoveredVia: 'Razorpay 1-Click Payment Link Callback',
    razorpayPaymentId
  });

  recordAuditLog({
    transactionId: txn.id,
    actionType: 'PAYMENT_LINK_SETTLED',
    status: 'SUCCESS',
    rationale: `Payment link callback verified. Successfully recovered ₹${txn.amount.toLocaleString('en-IN')}.`,
    metadata: { razorpayPaymentId }
  });

  return res.json({ message: 'Payment successfully settled', transaction: updated });
};

/**
 * Fetch complete audit log
 */
exports.getAuditLogs = (req, res) => {
  const logs = db.auditLogs.find().reverse();
  return res.json({ auditLogs: logs });
};

/**
 * Reset dataset back to initial failed state
 */
exports.resetBatch = (req, res) => {
  db.resetDatabase();
  return res.json({ message: 'Database reset to initial test batch' });
};
