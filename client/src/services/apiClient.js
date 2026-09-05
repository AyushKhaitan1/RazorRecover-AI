import { localEngine } from './localEngine';

const DEFAULT_PROD_URL = 'https://razorrecover-ai-backend.onrender.com';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = (
  import.meta.env.VITE_API_URL || 
  (isLocalhost ? '' : DEFAULT_PROD_URL)
).replace(/\/$/, '');

let useLocalFallback = false;

async function requestWithFallback(endpoint, options = {}, localHandler) {
  if (useLocalFallback) {
    return localHandler();
  }

  const urlsToTry = [];
  if (API_BASE) {
    urlsToTry.push(`${API_BASE}/api${endpoint}`);
  }
  urlsToTry.push(`/api${endpoint}`);

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        return await res.json();
      }
    } catch (err) {
      // Continue to next URL or fallback
    }
  }

  // If remote endpoints are unreachable or not returning JSON (e.g. static deployment)
  console.info('[RazorRecover] Switching to In-Browser Autonomous Recovery Engine');
  useLocalFallback = true;
  return localHandler();
}

export const api = {
  getMetrics: async () => {
    return requestWithFallback('/metrics', {}, () => localEngine.getMetrics());
  },

  getTransactions: async (query = '') => {
    const endpoint = query ? `/transactions?${query}` : '/transactions';
    return requestWithFallback(endpoint, {}, () => localEngine.getTransactions());
  },

  getAuditLogs: async () => {
    return requestWithFallback('/audits', {}, () => localEngine.getAuditLogs());
  },

  runBatchRecovery: async () => {
    return requestWithFallback('/batch/recover', { method: 'POST' }, () => localEngine.runBatchRecovery());
  },

  resetBatch: async () => {
    return requestWithFallback('/batch/reset', { method: 'POST' }, () => localEngine.resetBatch());
  },

  sendChatMessage: async (txnId, message) => {
    return requestWithFallback(
      `/transactions/${txnId}/chat`,
      { method: 'POST', body: JSON.stringify({ message }) },
      () => localEngine.handleConversationalReply(txnId, message)
    );
  },

  simulatePayment: async (txnId) => {
    return requestWithFallback(
      `/transactions/${txnId}/pay`,
      { method: 'POST' },
      () => localEngine.simulatePaymentSuccess(txnId)
    );
  }
};

export default api;
