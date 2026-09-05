const initialBatch = require('../data/syntheticBatch.json');

// In-Memory storage mimicking MongoDB collections with thread-safe atomic updates
class MemoryCollection {
  constructor(name, initialData = []) {
    this.name = name;
    this.data = new Map();
    this.load(initialData);
  }

  load(items = []) {
    this.data.clear();
    items.forEach(item => {
      const id = item.id || item._id;
      const cleanItem = {
        ...item,
        status: item.status || item.initialStatus || 'failed',
        touchpointCount: item.touchpointCount || 0
      };
      this.data.set(id, JSON.parse(JSON.stringify(cleanItem)));
    });
  }

  find(filter = {}) {
    let results = Array.from(this.data.values());
    for (const [key, val] of Object.entries(filter)) {
      results = results.filter(item => {
        if (typeof val === 'object' && val !== null) {
          if (val.$in && Array.isArray(val.$in)) return val.$in.includes(item[key]);
          if (val.$ne !== undefined) return item[key] !== val.$ne;
        }
        return item[key] === val;
      });
    }
    return JSON.parse(JSON.stringify(results));
  }

  findById(id) {
    const item = this.data.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  create(doc) {
    const id = doc.id || doc._id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newDoc = { ...doc, _id: id, id, createdAt: new Date().toISOString() };
    this.data.set(id, JSON.parse(JSON.stringify(newDoc)));
    return newDoc;
  }

  updateById(id, updateFields) {
    const existing = this.data.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updateFields,
      updatedAt: new Date().toISOString()
    };
    this.data.set(id, JSON.parse(JSON.stringify(updated)));
    return updated;
  }

  count(filter = {}) {
    return this.find(filter).length;
  }

  reset(initialData = []) {
    this.load(initialData);
  }
}

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

// Global collections
const db = {
  transactions: new MemoryCollection('transactions', initialBatch),
  auditLogs: new MemoryCollection('auditLogs', seedAudits),
  stoppingRules: new MemoryCollection('stoppingRules', [
    {
      id: 'rule_max_touches',
      name: 'Maximum Touchpoint Quota',
      description: 'Halt all customer outreach if 3 touches have been made across SMS/WhatsApp/Email',
      limit: 3,
      enabled: true
    },
    {
      id: 'rule_cooling_period',
      name: 'Inter-Touch Cooling Interval',
      description: 'Enforce minimum 12 hours between consecutive active customer notifications',
      hours: 12,
      enabled: true
    },
    {
      id: 'rule_dnd_window',
      name: 'TRAI / RBI DND Protection',
      description: 'Block all active notifications between 21:00 IST and 09:00 IST',
      startHour: 21,
      endHour: 9,
      enabled: true
    },
    {
      id: 'rule_fraud_killswitch',
      name: 'Hard Risk & Fraud Interlock',
      description: 'Instantly cease all retry attempts for hotlisted/blocked cards or fraud flags',
      enabled: true
    }
  ]),
  resetDatabase: () => {
    db.transactions.reset(initialBatch);
    db.auditLogs.reset(seedAudits);
  }
};

module.exports = db;
