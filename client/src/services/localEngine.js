import initialBatchRaw from '../data/syntheticBatch.js';

const MAX_TOUCHPOINT_LIMIT = 3;
const MIN_COOLING_HOURS = 12;

export const FAILURE_ARCHETYPES = {
  INSUFFICIENT_FUNDS: {
    category: 'INSUFFICIENT_FUNDS',
    type: 'SOFT_DECLINE',
    baseRecoveryRate: 0.68,
    primaryChannel: 'SALARY_ALIGNED_RETRY_AND_WHATSAPP',
    urgency: 'MEDIUM',
    explanation: 'User balance temporarily depleted. Typically recovers during payroll cycles (1st-5th / 10th) or via instant UPI fallback payment link.'
  },
  BANK_DOWNTIME: {
    category: 'BANK_DOWNTIME',
    type: 'INFRASTRUCTURE_TRANSIENT',
    baseRecoveryRate: 0.89,
    primaryChannel: 'SILENT_SMART_MANDATE_RETRY',
    urgency: 'HIGH',
    explanation: 'Bank CBS or NPCI UPI router timeout. Customer was not at fault; zero customer-facing annoyance needed. Silent retry after bank recovery window.'
  },
  CHECKOUT_DROP_OFF: {
    category: 'CHECKOUT_DROP_OFF',
    type: 'INTENT_ABANDONMENT',
    baseRecoveryRate: 0.54,
    primaryChannel: 'CONTEXTUAL_HINGLISH_WHATSAPP',
    urgency: 'HIGH',
    explanation: 'Shopper was distracted or interrupted at checkout / OTP stage. Fast, frictionless 1-click Razorpay payment link recovers high-intent buyers.'
  },
  MANDATE_EXPIRED_OR_PAUSED: {
    category: 'MANDATE_EXPIRED_OR_PAUSED',
    type: 'AUTH_EXPIRY',
    baseRecoveryRate: 0.62,
    primaryChannel: 'RE_AUTH_MANDATE_LINK',
    urgency: 'MEDIUM',
    explanation: 'Recurring mandate expired or hit max cycle limit. Requires quick 1-click mandate re-authorization without full re-registration.'
  },
  INVOICE_OVERDUE_B2B: {
    category: 'INVOICE_OVERDUE_B2B',
    type: 'ENTERPRISE_RECEIVABLE',
    baseRecoveryRate: 0.74,
    primaryChannel: 'PROMISE_TO_PAY_B2B_AGENT',
    urgency: 'LOW',
    explanation: 'Enterprise invoice delayed in corporate AP approval or treasury cycle. Structured promise-to-pay tracker prevents disputes.'
  },
  FRAUD_OR_CARD_BLOCKED: {
    category: 'FRAUD_OR_CARD_BLOCKED',
    type: 'HARD_DECLINE',
    baseRecoveryRate: 0.0,
    primaryChannel: 'STOP_AND_FLAG',
    urgency: 'NONE',
    explanation: 'Permanently blocked instrument or fraud risk. Irreversible decline. Mandatory immediate halt to save processing fees and protect compliance.'
  }
};

export function diagnoseFailure(transaction) {
  const code = transaction.failureCode || '';
  let archetype = FAILURE_ARCHETYPES[code];

  if (!archetype) {
    if (code.includes('TIMEOUT') || code.includes('OUTAGE')) {
      archetype = FAILURE_ARCHETYPES.BANK_DOWNTIME;
    } else if (code.includes('FUNDS') || code.includes('BALANCE')) {
      archetype = FAILURE_ARCHETYPES.INSUFFICIENT_FUNDS;
    } else if (code.includes('ABANDON') || code.includes('DROPPED')) {
      archetype = FAILURE_ARCHETYPES.CHECKOUT_DROP_OFF;
    } else if (code.includes('MANDATE') || code.includes('PAUSED')) {
      archetype = FAILURE_ARCHETYPES.MANDATE_EXPIRED_OR_PAUSED;
    } else if (code.includes('INVOICE') || code.includes('B2B')) {
      archetype = FAILURE_ARCHETYPES.INVOICE_OVERDUE_B2B;
    } else {
      archetype = FAILURE_ARCHETYPES.FRAUD_OR_CARD_BLOCKED;
    }
  }

  let confidence = archetype.baseRecoveryRate;
  if (transaction.customer?.tier === 'Enterprise') confidence += 0.08;
  if (transaction.customer?.tier === 'Premium') confidence += 0.05;
  if (transaction.amount > 50000 && archetype.category !== 'INVOICE_OVERDUE_B2B') confidence -= 0.12;
  confidence = Math.min(0.95, Math.max(0.0, parseFloat(confidence.toFixed(2))));

  return {
    category: archetype.category,
    declineType: archetype.type,
    recoveryConfidence: confidence,
    primaryChannel: archetype.primaryChannel,
    urgency: archetype.urgency,
    rootCauseRationale: archetype.explanation,
    isActionable: archetype.category !== 'FRAUD_OR_CARD_BLOCKED'
  };
}

export function evaluateGuardrails(transaction, actionType = 'OUTREACH') {
  const touchpoints = transaction.touchpointCount || 0;
  const lastTouchpoint = transaction.lastTouchpointAt ? new Date(transaction.lastTouchpointAt) : null;
  const now = new Date();

  // 1. Hard Fraud & Irreversible Decline Check
  if (transaction.failureCode === 'FRAUD_OR_CARD_BLOCKED') {
    return {
      allowed: false,
      ruleTriggered: 'HARD_FRAUD_INTERLOCK',
      reason: 'Transaction is flagged as permanently hotlisted or high-risk. Further attempts violate risk protocol.',
      actionTaken: 'HALT_PERMANENT'
    };
  }

  // 2. Customer Opt-Out Check
  if (transaction.optedOut || transaction.status === 'opted_out') {
    return {
      allowed: false,
      ruleTriggered: 'CUSTOMER_OPT_OUT',
      reason: 'Customer explicitly requested opt-out / cancellation. Further contact prohibited under DPDP / TRAI.',
      actionTaken: 'HALT_OPT_OUT'
    };
  }

  // 3. Max Touchpoint Cap
  if (actionType === 'OUTREACH' && touchpoints >= MAX_TOUCHPOINT_LIMIT) {
    return {
      allowed: false,
      ruleTriggered: 'MAX_TOUCHPOINT_QUOTA',
      reason: `Customer reached maximum contact limit (${MAX_TOUCHPOINT_LIMIT} attempts). Escalation stopped to prevent fatigue.`,
      actionTaken: 'STOP_ESCALATION'
    };
  }

  // 4. Inter-Touch Cooling Period Check
  if (actionType === 'OUTREACH' && lastTouchpoint) {
    const elapsedHours = (now.getTime() - lastTouchpoint.getTime()) / (1000 * 60 * 60);
    if (elapsedHours < MIN_COOLING_HOURS) {
      return {
        allowed: false,
        ruleTriggered: 'COOLING_INTERVAL_VIOLATION',
        reason: `Only ${elapsedHours.toFixed(1)}h elapsed since last outreach. Mandatory cooling interval is ${MIN_COOLING_HOURS}h.`,
        actionTaken: 'DELAY_OUTREACH',
        suggestedNextWindowHours: parseFloat((MIN_COOLING_HOURS - elapsedHours).toFixed(1))
      };
    }
  }

  const currentHourIST = (now.getUTCHours() + 5.5) % 24;
  const isDndActive = currentHourIST >= 21 || currentHourIST < 9;

  return {
    allowed: true,
    ruleTriggered: null,
    reason: 'All compliance checks passed (touchpoint quota valid, cooling period satisfied, risk clear).',
    dndActive: isDndActive,
    dndPolicy: isDndActive ? 'DND active: outreach queued for 09:00 IST' : 'Active contact permitted'
  };
}

export function calculateOptimalRetry(transaction, currentAttempt = 1) {
  const bank = (transaction.bank || 'HDFC').toUpperCase();
  const baseDate = new Date();
  let delayMinutes = 120;
  let sequenceRationale = '';

  switch (transaction.failureCode) {
    case 'GATEWAY_TIMEOUT':
      delayMinutes = bank === 'SBI' ? 180 : 120;
      sequenceRationale = `Bank CBS switch recovery window identified for ${bank}. Silent mandate retry scheduled without pinging customer.`;
      break;

    case 'BAD_REQUEST_INSUFFICIENT_FUNDS':
      const dayOfMonth = baseDate.getDate();
      if (dayOfMonth >= 25 && dayOfMonth <= 31) {
        delayMinutes = 24 * 60;
        sequenceRationale = 'Month-end liquidity dip detected. Scheduled for salary credit window (1st of month at 10:30 AM IST).';
      } else {
        delayMinutes = 24 * 60;
        sequenceRationale = 'Insufficient balance auto-retry scheduled in 24h at peak liquidity window (11:00 AM IST) alongside soft WhatsApp reminder.';
      }
      break;

    case 'MANDATE_EXPIRED_OR_PAUSED':
      delayMinutes = 60;
      sequenceRationale = 'Mandate expired or paused. Re-authorization token generated for instant customer approval.';
      break;

    case 'CUSTOMER_DROPPED_OFF':
    case 'PAYMENT_OTP_ABANDONED':
      delayMinutes = 15;
      sequenceRationale = 'Cart drop-off: Immediate 15-minute intent revival window. Pre-filled 1-click Razorpay payment link dispatched.';
      break;

    case 'INVOICE_OVERDUE_B2B':
      delayMinutes = 48 * 60;
      sequenceRationale = 'B2B Accounts Payable escalation cadence: 48-hour gentle cadence with automated reconciliation ledger.';
      break;

    default:
      delayMinutes = 180;
      sequenceRationale = 'Standard automated retry cadence applied.';
  }

  const scheduledTime = new Date(baseDate.getTime() + delayMinutes * 60 * 1000);

  return {
    attemptNumber: currentAttempt + 1,
    delayMinutes,
    scheduledAt: scheduledTime.toISOString(),
    scheduledAtHuman: scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    sequenceRationale
  };
}

export function generateHinglishDunningCopy(transaction, paymentLink) {
  const firstName = (transaction.customer?.name || 'Customer').split(' ')[0];
  const merchant = transaction.merchant || 'Merchant';
  const amountStr = `₹${(transaction.amount || 0).toLocaleString('en-IN')}`;
  const link = paymentLink?.shortUrl || `https://rzp.io/i/test_${transaction.id}`;

  switch (transaction.failureCode) {
    case 'BAD_REQUEST_INSUFFICIENT_FUNDS':
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `⚠️ ${merchant} Subscription Renewal Alert`,
        message: `Namaste ${firstName} ji! 🙏\n\nAapka *${merchant}* ka ${amountStr} ka monthly subscription auto-debit complete nahi ho paya.\n\nFikar mat kijiye, aapki service band nahi hui hai. Bas neeche diye gaye secure Razorpay link se 1-click me payment complete kar lijiye:`,
        ctaText: `Pay ${amountStr} via Razorpay`,
        ctaUrl: link,
        footer: 'Agar aap kal pay karna chahte hain, toh reply kijiye "Kal dunga". Opt-out ke liye reply "STOP".'
      };

    case 'CUSTOMER_DROPPED_OFF':
    case 'PAYMENT_OTP_ABANDONED':
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `🛍️ Order reserved on ${merchant}`,
        message: `Hi ${firstName}! ✨\n\nAapka *${amountStr}* ka order cart me reserve kar ke rakha hai. Lagta hai payment ke waqt screen slip ho gayi thi!\n\nInventory khatam hone se pehle yahan se bina kisi jhanjhat ke complete karein:`,
        ctaText: `Complete Payment (${amountStr})`,
        ctaUrl: link,
        footer: 'Razorpay 100% Buyer Protected Checkout 🛡️'
      };

    case 'MANDATE_EXPIRED_OR_PAUSED':
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `🔄 ${merchant} Mandate Re-approval`,
        message: `Namaste ${firstName} ji! Aapka UPI AutoPay mandate cycle complete ho gaya tha. Seamless access continue rakhne ke liye sirf ek touch me verify karein:`,
        ctaText: `Re-authorise AutoPay`,
        ctaUrl: link,
        footer: 'Powered by NPCI UPI AutoPay & Razorpay'
      };

    case 'INVOICE_OVERDUE_B2B':
      return {
        channel: 'B2B Enterprise Dunning',
        language: 'Formal Hinglish & English',
        headline: `Invoice Outstanding: ${merchant}`,
        message: `Dear ${firstName},\n\nHope you are having a productive week. This is a gentle follow-up regarding Invoice #${transaction.id} for *${amountStr}* with ${merchant}.\n\nIf the remittance is already scheduled in your weekly batch, please share the UTR or reply with the expected payment date. Direct settlement link:`,
        ctaText: `View & Settle Invoice`,
        ctaUrl: link,
        footer: 'Accounts Receivable Automation | Razorpay Verified'
      };

    default:
      return {
        channel: 'WhatsApp Interactive',
        language: 'Hinglish',
        headline: `Update from ${merchant}`,
        message: `Hi ${firstName}, aapka ${amountStr} ka payment process nahi ho paya. Please check this link to retry securely:`,
        ctaText: `Complete Payment`,
        ctaUrl: link,
        footer: 'Razorpay Secure'
      };
  }
}

export function processConversationalReply(transaction, userMessage) {
  const normalized = (userMessage || '').toLowerCase().trim();

  if (normalized.includes('stop') || normalized.includes('cancel') || normalized.includes('band karo') || normalized.includes('nahi chahiye')) {
    return {
      intent: 'OPT_OUT',
      action: 'CANCEL_MANDATE_AND_HALT',
      reply: 'Aapka request note kar liya gaya hai. Subscription cancel kar di gayi hai aur aapko koi further reminders nahi aayenge. Thank you!',
      stoppingRuleEnforced: 'CUSTOMER_OPT_OUT'
    };
  }

  if (
    normalized.includes('kal') ||
    normalized.includes('tomorrow') ||
    normalized.includes('salary') ||
    normalized.includes('pay later') ||
    normalized.includes('friday') ||
    normalized.includes('somwar') ||
    normalized.includes('next week')
  ) {
    return {
      intent: 'PROMISE_TO_PAY',
      action: 'PAUSE_RETRIES_SCHEDULE_DATE',
      promisedDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      reply: 'Dhanyawad batane ke liye! 🙏 Humne aapka Promise-to-Pay record kar liya hai. Automated retries kal tak pause kar diye gaye hain. Link aapke pass ready hai.',
      stoppingRuleEnforced: 'PROMISE_TO_PAY_COOLDOWN'
    };
  }

  if (normalized.includes('ho gaya') || normalized.includes('already paid') || normalized.includes('paise kat gaye') || normalized.includes('utr')) {
    return {
      intent: 'DISPUTE_OR_ALREADY_PAID',
      action: 'FLAG_FOR_RECON_VERIFICATION',
      reply: 'Agar aapke account se paise kat gaye hain, toh chinta mat kijiye! Humare system me reconciliation check trigger kar diya gaya hai. 15 minutes me update mil jayega.',
      stoppingRuleEnforced: 'AUTO_PAUSE_DISPUTE'
    };
  }

  return {
    intent: 'GENERAL_QUERY',
    action: 'PROVIDE_PAYMENT_HELP',
    reply: `Kya aapko payment karne me koi pareshani aa rahi hai? Aap UPI, Cards, ya Netbanking kisi se bhi 1-click me pay kar sakte hain: https://rzp.io/i/test_${transaction.id}`,
    stoppingRuleEnforced: null
  };
}

export function createRecoveryPaymentLink(transaction) {
  const linkId = `plink_test_${Math.random().toString(36).substring(2, 10)}`;
  return {
    paymentLinkId: linkId,
    shortUrl: `https://rzp.io/i/test_${linkId}`,
    amount: transaction.amount,
    status: 'created',
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  };
}

// Initial seed audit events
const seedAudits = [
  {
    id: 'aud_init_001',
    transactionId: 'SYSTEM',
    actionType: 'BATCH_INGEST_INITIALIZED',
    status: 'COMPLETED',
    rationale: 'Ingested 50 synthetic degraded payment records across UPI AutoPay, Cards, and Netbanking (Volume: ₹18.78L).',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'aud_init_002',
    transactionId: 'SYSTEM',
    actionType: 'COMPLIANCE_POLICIES_LOADED',
    status: 'ACTIVE',
    rationale: 'Enforced TRAI DND windows, Max 3 outreach cap, and RBI cooling interval (12 hours).',
    timestamp: new Date(Date.now() - 3500000).toISOString()
  },
  {
    id: 'aud_init_003',
    transactionId: 'txn_rec_008',
    actionType: 'GUARDRAIL_INTERLOCK_TRIGGERED',
    status: 'HALTED',
    rationale: 'Card permanently hotlisted / reported lost. Hard fraud interlock triggered: zero retries permitted.',
    guardrailResult: {
      allowed: false,
      ruleTriggered: 'HARD_FRAUD_INTERLOCK',
      reason: 'Permanently blocked instrument. Immediate halt to eliminate processing fees.'
    },
    timestamp: new Date(Date.now() - 3400000).toISOString()
  },
  {
    id: 'aud_init_004',
    transactionId: 'txn_rec_004',
    actionType: 'INTERVENTION_DISPATCHED_AND_SCHEDULED',
    status: 'SCHEDULED',
    rationale: 'HDFC UPI gateway timeout. Silent mandate retry queued post-switch recovery window.',
    timestamp: new Date(Date.now() - 3300000).toISOString()
  }
];

// Persistent or in-memory client state
class ClientDatabase {
  constructor() {
    this.transactions = [];
    this.auditLogs = [];
    this.reset();
  }

  reset() {
    this.transactions = JSON.parse(JSON.stringify(initialBatchRaw)).map(item => ({
      ...item,
      status: item.status || item.initialStatus || 'failed',
      touchpointCount: item.touchpointCount || 0
    }));
    this.auditLogs = JSON.parse(JSON.stringify(seedAudits));
  }

  recordAudit({ transactionId, actionType, status, rationale, guardrailResult = null, metadata = {} }) {
    const doc = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transactionId,
      actionType,
      status,
      rationale,
      guardrailResult,
      metadata,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(doc);
    return doc;
  }
}

const localDb = new ClientDatabase();

// Local engine exports matching backend API contract
export const localEngine = {
  getMetrics: () => {
    const allTxns = localDb.transactions;
    const totalVolumeAtRisk = allTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const recoveredTxns = allTxns.filter(t => t.status === 'recovered');
    const totalVolumeRecovered = recoveredTxns.reduce((sum, t) => sum + (t.amount || 0), 0);
    const haltedTxns = allTxns.filter(t => t.status === 'halted_by_rule' || t.status === 'opted_out');
    const scheduledTxns = allTxns.filter(t => t.status === 'scheduled_retry' || t.status === 'outreach_active');
    const failedTxns = allTxns.filter(t => t.status === 'failed');
    const recoveryRate = totalVolumeAtRisk > 0 ? ((totalVolumeRecovered / totalVolumeAtRisk) * 100).toFixed(1) : 0;

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
      breakdown[cat].amount += (t.amount || 0);
      if (t.status === 'recovered') {
        breakdown[cat].recovered += 1;
        breakdown[cat].recoveredAmount += (t.amount || 0);
      }
    });

    return {
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
      recentAudits: localDb.auditLogs.slice(0, 10)
    };
  },

  getTransactions: () => {
    const enriched = localDb.transactions.map(txn => ({
      ...txn,
      status: txn.status || 'failed',
      diagnostic: diagnoseFailure(txn),
      guardrail: evaluateGuardrails(txn)
    }));
    return { transactions: enriched };
  },

  getAuditLogs: () => {
    return { auditLogs: [...localDb.auditLogs] };
  },

  runBatchRecovery: () => {
    const results = {
      processed: 0,
      recovered: 0,
      scheduled: 0,
      haltedByGuardrail: 0,
      moneyRecovered: 0
    };

    for (const txn of localDb.transactions) {
      if (txn.status === 'recovered' || txn.status === 'opted_out') continue;

      results.processed += 1;
      const diagnostic = diagnoseFailure(txn);
      const guardrail = evaluateGuardrails(txn, 'OUTREACH');

      if (!guardrail.allowed) {
        txn.status = 'halted_by_rule';
        txn.haltReason = guardrail.reason;
        txn.ruleTriggered = guardrail.ruleTriggered;

        localDb.recordAudit({
          transactionId: txn.id,
          actionType: 'GUARDRAIL_INTERLOCK_TRIGGERED',
          status: 'HALTED',
          rationale: guardrail.reason,
          guardrailResult: guardrail
        });
        results.haltedByGuardrail += 1;
        continue;
      }

      const paymentLink = createRecoveryPaymentLink(txn);
      const dunningCopy = generateHinglishDunningCopy(txn, paymentLink);
      const retryPlan = calculateOptimalRetry(txn, txn.touchpointCount || 0);

      // Realistic probabilistic recovery
      const recoveredThisTurn = Math.random() < Math.max(0.65, diagnostic.recoveryConfidence);

      if (recoveredThisTurn) {
        txn.status = 'recovered';
        txn.recoveredAt = new Date().toISOString();
        txn.touchpointCount = (txn.touchpointCount || 0) + 1;
        txn.activePaymentLink = paymentLink;
        txn.recoveryChannel = diagnostic.primaryChannel;
        txn.recoveredVia = diagnostic.primaryChannel.includes('WHATSAPP') ? 'Razorpay Payment Link' : 'Automated Mandate Switch';
        txn.razorpayPaymentId = `pay_rec_${Math.random().toString(36).substring(2, 9)}`;

        localDb.recordAudit({
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
        txn.status = 'scheduled_retry';
        txn.touchpointCount = (txn.touchpointCount || 0) + 1;
        txn.lastTouchpointAt = new Date().toISOString();
        txn.activePaymentLink = paymentLink;
        txn.nextRetryScheduledAt = retryPlan.scheduledAt;
        txn.nextRetryWindow = retryPlan.scheduledAtHuman;
        txn.retryRationale = retryPlan.sequenceRationale;
        txn.dunningPreview = dunningCopy;

        localDb.recordAudit({
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

    const freshTxns = localDb.transactions;
    const totalVolumeAtRisk = freshTxns.reduce((sum, t) => sum + t.amount, 0);
    const recoveredTxns = freshTxns.filter(t => t.status === 'recovered');
    const totalVolumeRecovered = recoveredTxns.reduce((sum, t) => sum + t.amount, 0);

    return {
      message: 'Batch recovery run completed successfully',
      summary: results,
      metrics: {
        totalVolumeAtRisk,
        totalVolumeRecovered,
        recoveryRate: totalVolumeAtRisk > 0 ? parseFloat(((totalVolumeRecovered / totalVolumeAtRisk) * 100).toFixed(1)) : 0,
        recoveredCount: recoveredTxns.length
      }
    };
  },

  resetBatch: () => {
    localDb.reset();
    return { message: 'Database reset to initial test batch' };
  },

  handleConversationalReply: (id, message) => {
    const txn = localDb.transactions.find(t => t.id === id);
    if (!txn) return { error: 'Transaction not found' };

    const replyResult = processConversationalReply(txn, message || '');

    if (replyResult.intent === 'OPT_OUT') {
      txn.status = 'opted_out';
      txn.optedOut = true;
      txn.optedOutAt = new Date().toISOString();

      localDb.recordAudit({
        transactionId: txn.id,
        actionType: 'CUSTOMER_OPT_OUT_RECORDED',
        status: 'CANCELLED',
        rationale: `Customer replied: "${message}". Mandate cancelled and outreach stopped permanently per TRAI / DPDP compliance.`,
        metadata: { userReply: message }
      });
    } else if (replyResult.intent === 'PROMISE_TO_PAY') {
      txn.status = 'scheduled_retry';
      txn.promisedAt = replyResult.promisedDate;

      localDb.recordAudit({
        transactionId: txn.id,
        actionType: 'PROMISE_TO_PAY_LOGGED',
        status: 'POSTPONED',
        rationale: `Customer promised payment: "${message}". Automated retries paused until ${new Date(replyResult.promisedDate).toLocaleDateString('en-IN')}.`,
        metadata: { userReply: message }
      });
    }

    return {
      reply: replyResult.reply,
      intent: replyResult.intent,
      action: replyResult.action,
      stoppingRuleEnforced: replyResult.stoppingRuleEnforced
    };
  },

  simulatePaymentSuccess: (id) => {
    const txn = localDb.transactions.find(t => t.id === id);
    if (!txn) return { error: 'Transaction not found' };

    const razorpayPaymentId = `pay_test_${Math.random().toString(36).substring(2, 9)}`;
    txn.status = 'recovered';
    txn.recoveredAt = new Date().toISOString();
    txn.recoveredVia = 'Razorpay 1-Click Payment Link Callback';
    txn.razorpayPaymentId = razorpayPaymentId;

    localDb.recordAudit({
      transactionId: txn.id,
      actionType: 'PAYMENT_LINK_SETTLED',
      status: 'SUCCESS',
      rationale: `Payment link callback verified. Successfully recovered ₹${txn.amount.toLocaleString('en-IN')}.`,
      metadata: { razorpayPaymentId }
    });

    return {
      message: 'Payment successfully settled',
      transaction: txn
    };
  }
};
