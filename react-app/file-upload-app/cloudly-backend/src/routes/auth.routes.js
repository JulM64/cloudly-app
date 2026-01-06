const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Public routes
router.post('/login', AuthController.login);
router.post('/verify-cognito', AuthController.verifyCognitoToken);

// Protected routes (require authentication)
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// Test endpoint (no auth required)
router.get('/test', AuthController.test);

module.exports = router;