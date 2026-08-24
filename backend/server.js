const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'AcademiaPulse Firebase Single Source of Truth Backend API'
  });
});

// System Info Endpoint
app.get('/api/info', (req, res) => {
  res.json({
    platform: 'AcademiaPulse',
    database: 'Cloud Firestore',
    auth: 'Firebase Authentication',
    storage: 'Firebase Storage'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 AcademiaPulse API Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n⚠️ Port ${PORT} is already in use. The backend API server is ALREADY RUNNING on http://localhost:${PORT}`);
  } else {
    console.error('Server error:', err);
  }
});
