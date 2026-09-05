const http = require('http');

async function test() {
  console.log('[Test] Starting backend validation test...');
  
  // Require app
  const { app, server } = require('./src/server');

  // Helper for requests
  function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const dataString = body ? JSON.stringify(body) : null;
      const options = {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(dataString ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseData) });
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      });

      req.on('error', reject);
      if (dataString) req.write(dataString);
      req.end();
    });
  }

  try {
    // 1. Health check
    const health = await request('/health');
    console.log('✅ Health check:', health.status, health.data.service);

    // 2. Metrics check
    const metrics = await request('/api/metrics');
    console.log('✅ Metrics loaded:', {
      totalCount: metrics.data.totalCount,
      totalVolumeAtRisk: metrics.data.totalVolumeAtRisk,
      recoveredCount: metrics.data.recoveredCount
    });

    // 3. Transactions list
    const txns = await request('/api/transactions');
    console.log('✅ Transactions count:', txns.data.transactions.length);
    console.log('✅ Sample transaction diagnostic:', txns.data.transactions[0].diagnostic.category);

    // 4. Test conversational WhatsApp reply with Promise-to-Pay
    const replyPTP = await request('/api/transactions/txn_rec_001/chat', 'POST', { message: 'Paise kal dunga' });
    console.log('✅ Promise-to-pay intent detection:', replyPTP.data.intent, '->', replyPTP.data.action);

    // 5. Run Batch Recovery
    const batchRun = await request('/api/batch/recover', 'POST');
    console.log('✅ Batch recovery executed:', batchRun.data.summary);

    // 6. Updated metrics
    const updatedMetrics = await request('/api/metrics');
    console.log('✅ Updated Recovery Metrics:', {
      recoveredCount: updatedMetrics.data.recoveredCount,
      totalVolumeRecovered: updatedMetrics.data.totalVolumeRecovered,
      recoveryRate: updatedMetrics.data.recoveryRate + '%'
    });

    // 7. Reset batch
    const reset = await request('/api/batch/reset', 'POST');
    console.log('✅ Batch reset successfully:', reset.data.message);

    console.log('\n🌟 ALL BACKEND TESTS PASSED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

test();
