const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth.routes');

// Use routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Cloudly Backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cognitoConfigured: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID)
  });
});

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Cloudly Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      health: '/api/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Cloudly Backend running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  console.log(`🔑 Cognito: ${process.env.COGNITO_USER_POOL_ID ? 'Configured' : 'Not configured'}`);
  console.log(`✅ Server started successfully!`);
  
  console.log('\n🔐 Authentication Endpoints:');
  console.log('  POST /api/auth/login         - Login with mock users');
  console.log('  POST /api/auth/verify-cognito - Verify Cognito tokens');
  console.log('  GET  /api/auth/me            - Get current user (requires token)');
  console.log('  GET  /api/auth/test          - Test endpoint');
  
  console.log('\n👤 Mock Users (for testing):');
  console.log('  Admin:   email=admin@cloudly.com,    password=admin123');
  console.log('  Manager: email=manager@cloudly.com,  password=manager123');
  console.log('  User:    email=user@cloudly.com,     password=user123');
});