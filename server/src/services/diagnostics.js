/**
 * Diagnostics & Root-Cause Classification Engine
 * Evaluates payment failure codes against Indian banking infrastructure patterns,
 * customer context, and amount to recommend optimal recovery interventions.
 */

const FAILURE_ARCHETYPES = {
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

function diagnoseFailure(transaction) {
  const code = transaction.failureCode;
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

  // Adjust recovery confidence based on customer tier & ticket size
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

module.exports = {
  diagnoseFailure,
  FAILURE_ARCHETYPES
};
