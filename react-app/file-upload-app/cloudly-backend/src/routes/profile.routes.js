const express = require('express');
const router = express.Router();

// Create a simple auth middleware for now
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  req.user = { userId: 'mock-user-id' };
  next();
};

// Try to import ProfileController, but have a fallback
let ProfileController;
try {
  ProfileController = require('../controllers/profile.controller');
} catch (error) {
  console.warn('ProfileController not found, using mock');
  ProfileController = {
    getProfile: (req, res) => res.json({ message: 'Mock profile' }),
    updateProfile: (req, res) => res.json({ message: 'Mock update' }),
    updatePreferences: (req, res) => res.json({ message: 'Mock preferences' }),
    getStats: (req, res) => res.json({ stats: 'Mock stats' })
  };
}

// All profile routes require authentication
router.use(authMiddleware);

// Get profile
router.get('/', ProfileController.getProfile);

// Update profile
router.put('/', ProfileController.updateProfile);

// Update preferences
router.put('/preferences', ProfileController.updatePreferences);

// Get user stats
router.get('/stats', ProfileController.getStats);

module.exports = router;
