const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  
  firstName: String,
  lastName: String,
  jobTitle: String,
  department: String,
  avatar: String,
  phone: String,
  
  role: {
    type: String,
    default: 'USER'
  },
  
  preferences: {
    theme: {
      type: String,
      default: 'system'
    }
  },
  
  totalUploads: {
    type: Number,
    default: 0
  },
  totalStorageUsed: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
