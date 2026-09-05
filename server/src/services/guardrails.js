/**
 * Guardrails & Compliance Engine
 * Enforces RBI / TRAI dunning regulations, maximum touchpoint quotas, cooling intervals,
 * and immediate fraud interlocks.
 */

const MAX_TOUCHPOINT_LIMIT = 3;
const MIN_COOLING_HOURS = 12;

function evaluateGuardrails(transaction, actionType = 'OUTREACH') {
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

  // 5. TRAI / RBI DND Hour Check (Simulated 21:00 - 09:00 IST restriction)
  // For interactive demo, we expose whether DND applies right now
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

module.exports = {
  evaluateGuardrails,
  MAX_TOUCHPOINT_LIMIT,
  MIN_COOLING_HOURS
};
