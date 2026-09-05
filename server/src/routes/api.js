const express = require('express');
const router = express.Router();
const controller = require('../controllers/recoveryController');

// Metrics & Telemetry
router.get('/metrics', controller.getMetrics);

// Transactions List & Detail
router.get('/transactions', controller.getTransactions);
router.get('/transactions/:id', controller.getTransactionById);

// Batch & Single Recovery Actions
router.post('/batch/recover', controller.runBatchRecovery);
router.post('/batch/reset', controller.resetBatch);
router.post('/transactions/:id/recover', controller.triggerSingleRecovery);

// WhatsApp / Hinglish Interaction & Payment Settlement Simulator
router.post('/transactions/:id/chat', controller.handleConversationalReply);
router.post('/transactions/:id/pay', controller.simulatePaymentSuccess);

// Immutable Audit Log
router.get('/audits', controller.getAuditLogs);

module.exports = router;
