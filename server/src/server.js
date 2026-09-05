const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes/api');

const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

// API mounting
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'RazorRecover AI Backend',
    version: '1.0.0',
    mode: 'MERN Stack - Track 03: AI Revenue Recovery',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if present (e.g. unified deployment or production build)
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = app.listen(config.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 RazorRecover AI Backend active on port ${config.PORT}`);
  console.log(`🌐 Health check: http://localhost:${config.PORT}/health`);
  console.log(`📊 API endpoints: http://localhost:${config.PORT}/api/metrics`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
