// server.js - Main Express Server
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudly';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============ SCHEMAS & MODELS ============

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  role: { 
    type: String, 
    enum: ['SUPER_ADMIN', 'TEAM_MANAGER', 'USER'],
    default: 'USER'
  },
  initials: String,
  color: String,
  jobTitle: String,
  timezone: { type: String, default: 'UTC-5 (Eastern Time)' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  settings: {
    emailNotifications: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: false },
    autoBackup: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    emailDigest: { type: Boolean, default: true },
    fileNotifications: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Department Schema
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  manager: { type: String, required: true },
  description: String,
  members: { type: Number, default: 0 },
  projects: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// File Schema
const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: String,
  size: Number,
  path: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  uploadDate: { type: Date, default: Date.now },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// Activity Log Schema
const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  file: String,
  folder: String,
  member: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Department = mongoose.model('Department', departmentSchema);
const File = mongoose.model('File', fileSchema);
const Activity = mongoose.model('Activity', activitySchema);

// ============ MIDDLEWARE ============

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate initials and color
    const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : firstName.charAt(1))).toUpperCase();
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'USER',
      initials,
      color
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
        initials: user.initials,
        color: user.color
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        role: user.role,
        initials: user.initials,
        color: user.color,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('department');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ============ USER ROUTES ============

// Get All Users (Admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('department');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update User Settings
app.put('/api/users/settings', authenticateToken, async (req, res) => {
  try {
    const { settings, profile } = req.body;
    
    const updateData = {};
    if (settings) updateData.settings = settings;
    if (profile) {
      if (profile.firstName) updateData.firstName = profile.firstName;
      if (profile.jobTitle) updateData.jobTitle = profile.jobTitle;
      if (profile.timezone) updateData.timezone = profile.timezone;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({ message: 'Settings updated', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============ DEPARTMENT ROUTES ============

// Get All Departments
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create Department (Admin only)
app.post('/api/departments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, manager, description } = req.body;

    const department = new Department({
      name,
      manager,
      description
    });

    await department.save();
    
    // Log activity
    await new Activity({
      user: req.user.id,
      action: 'Created',
      folder: `department "${name}"`
    }).save();

    res.status(201).json({ 
      message: 'Department created',
      department 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Department name already exists' });
    }
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update Department (Admin only)
app.put('/api/departments/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedAt = new Date();

    const department = await Department.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department updated', department });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete Department (Admin only)
app.delete('/api/departments/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await Department.findByIdAndDelete(id);
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ============ FILE ROUTES ============

// Upload File
app.post('/api/files/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const uploadedFiles = [];

    for (const file of req.files) {
      const newFile = new File({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        uploadedBy: req.user.id
      });

      await newFile.save();
      uploadedFiles.push(newFile);

      // Log activity
      await new Activity({
        user: req.user.id,
        action: 'Uploaded',
        file: file.originalname
      }).save();
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get User Files
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.user.id })
      .populate('uploadedBy', 'firstName email')
      .sort({ uploadDate: -1 });
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get Recent Files
app.get('/api/files/recent', authenticateToken, async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.user.id })
      .populate('uploadedBy', 'firstName email')
      .sort({ uploadDate: -1 })
      .limit(10);
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

// Delete File
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check ownership
    if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete physical file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await File.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ============ ACTIVITY ROUTES ============

// Get Recent Activities
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('user', 'firstName initials')
      .sort({ timestamp: -1 })
      .limit(20);
    
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ============ STATISTICS ROUTES ============

// Get Dashboard Stats
app.get('/api/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const totalFiles = await File.countDocuments({ uploadedBy: userId });
    const files = await File.find({ uploadedBy: userId });
    const storageUsed = files.reduce((sum, file) => sum + file.size, 0);
    
    // Get team members count (if user is in a department)
    const user = await User.findById(userId);
    let teamMembers = 1;
    if (user.department) {
      const dept = await Department.findById(user.department);
      teamMembers = dept ? dept.members : 1;
    }

    const sharedFiles = await File.countDocuments({
      sharedWith: userId
    });

    res.json({
      stats: {
        totalFiles,
        storageUsed,
        teamMembers,
        sharedFiles
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get Admin Stats
app.get('/api/stats/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDepartments = await Department.countDocuments();
    const activeDepartments = await Department.countDocuments({ status: 'Active' });
    const totalFiles = await File.countDocuments();
    
    const files = await File.find();
    const storageUsed = files.reduce((sum, file) => sum + file.size, 0);

    res.json({
      stats: {
        totalUsers,
        totalDepartments,
        activeDepartments,
        totalFiles,
        storageUsed
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ============ SEED DATA (FOR TESTING) ============

app.post('/api/seed', async (req, res) => {
  try {
    // Check if already seeded
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return res.status(400).json({ error: 'Database already seeded' });
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    await new User({
      email: 'admin@cloudly.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      initials: 'AU',
      color: '#9c27b0'
    }).save();

    // Create regular users
    const userPassword = await bcrypt.hash('User123!', 10);
    await new User({
      email: 'user@cloudly.com',
      password: userPassword,
      firstName: 'Regular',
      lastName: 'User',
      role: 'USER',
      initials: 'RU',
      color: '#4caf50'
    }).save();

    await new User({
      email: 'demo@cloudly.com',
      password: await bcrypt.hash('Demo123!', 10),
      firstName: 'Demo',
      lastName: 'User',
      role: 'USER',
      initials: 'DU',
      color: '#ff9800'
    }).save();

    // Create departments
    await new Department({
      name: 'Engineering',
      manager: 'John Doe',
      description: 'Software development team',
      members: 12,
      projects: 8,
      status: 'Active'
    }).save();

    await new Department({
      name: 'Marketing',
      manager: 'Jane Smith',
      description: 'Marketing and communications',
      members: 8,
      projects: 5,
      status: 'Active'
    }).save();

    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// ============ START SERVER ============

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET === 'your-secret-key-change-in-production' ? '⚠️  Using default (change in production!)' : '✅ Custom secret set'}`);
});

module.exports = app;