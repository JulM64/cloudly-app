// server-cognito.js - Backend with AWS Cognito Integration
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const cognito = new AWS.CognitoIdentityServiceProvider();
const s3 = new AWS.S3();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cloudly-cognito';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============ SCHEMAS ============

// Department Schema
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  s3Bucket: { type: String, required: true, unique: true },
  manager: String,
  description: String,
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// File Metadata Schema (for tracking)
const fileMetadataSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: String,
  s3Key: { type: String, required: true },
  s3Bucket: { type: String, required: true },
  department: String,
  userId: String,
  userEmail: String,
  fileSize: Number,
  fileType: String,
  uploadDate: { type: Date, default: Date.now },
  lastAccessed: Date
});

// Activity Log Schema
const activitySchema = new mongoose.Schema({
  userId: String,
  userEmail: String,
  action: String,
  resource: String,
  department: String,
  details: Object,
  timestamp: { type: Date, default: Date.now }
});

const Department = mongoose.model('Department', departmentSchema);
const FileMetadata = mongoose.model('FileMetadata', fileMetadataSchema);
const Activity = mongoose.model('Activity', activitySchema);

// ============ MIDDLEWARE ============

// Verify Cognito JWT Token
const verifyCognitoToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Decode token
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Extract user info from token
    req.user = {
      userId: decoded.payload.sub,
      email: decoded.payload.email,
      groups: decoded.payload['cognito:groups'] || [],
      department: decoded.payload['custom:department']
    };

    // Determine role
    if (req.user.groups.includes('Administrators')) {
      req.user.role = 'SUPER_ADMIN';
    } else if (req.user.groups.includes('DepartmentAdmins')) {
      req.user.role = 'DEPARTMENT_ADMIN';
    } else {
      req.user.role = 'USER';
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin check
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// ============ DEPARTMENT ROUTES ============

// Get All Departments
app.get('/api/departments', verifyCognitoToken, async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json({ departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create Department (Admin only)
app.post('/api/departments', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { name, manager, description } = req.body;

    // Create S3 bucket name
    const bucketName = `${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

    // Create S3 bucket
    try {
      await s3.createBucket({
        Bucket: bucketName,
        ACL: 'private'
      }).promise();

      // Set bucket CORS
      await s3.putBucketCors({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [{
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag']
          }]
        }
      }).promise();

      console.log(`✅ S3 bucket created: ${bucketName}`);
    } catch (s3Error) {
      if (s3Error.code !== 'BucketAlreadyOwnedByYou') {
        throw s3Error;
      }
      console.log(`ℹ️ S3 bucket already exists: ${bucketName}`);
    }

    // Create department in database
    const department = new Department({
      name,
      s3Bucket: bucketName,
      manager,
      description
    });

    await department.save();

    // Log activity
    await new Activity({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: 'CREATE_DEPARTMENT',
      resource: name,
      details: { bucketName }
    }).save();

    res.status(201).json({ 
      message: 'Department created successfully',
      department 
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: error.message || 'Failed to create department' });
  }
});

// Update Department
app.put('/api/departments/:id', verifyCognitoToken, requireAdmin, async (req, res) => {
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

// Delete Department
app.delete('/api/departments/:id', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await Department.findByIdAndDelete(id);
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Note: We don't delete the S3 bucket for safety
    // You can manually delete it later if needed

    res.json({ message: 'Department deleted (S3 bucket preserved)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ============ FILE ROUTES ============

// Save File Metadata
app.post('/api/files/metadata', verifyCognitoToken, async (req, res) => {
  try {
    const { fileName, originalName, s3Key, s3Bucket, fileSize, fileType } = req.body;

    const metadata = new FileMetadata({
      fileName,
      originalName,
      s3Key,
      s3Bucket,
      department: req.user.department,
      userId: req.user.userId,
      userEmail: req.user.email,
      fileSize,
      fileType
    });

    await metadata.save();

    // Log activity
    await new Activity({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: 'UPLOAD_FILE',
      resource: fileName,
      department: req.user.department,
      details: { s3Key, fileSize }
    }).save();

    res.status(201).json({ 
      message: 'File metadata saved',
      metadata 
    });
  } catch (error) {
    console.error('Error saving file metadata:', error);
    res.status(500).json({ error: 'Failed to save file metadata' });
  }
});

// Get User Files
app.get('/api/files/my-files', verifyCognitoToken, async (req, res) => {
  try {
    const files = await FileMetadata.find({ 
      userId: req.user.userId 
    }).sort({ uploadDate: -1 });
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get Department Files
app.get('/api/files/department/:department', verifyCognitoToken, async (req, res) => {
  try {
    const { department } = req.params;

    // Check if user has access to this department
    if (req.user.role !== 'SUPER_ADMIN' && req.user.department !== department) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = await FileMetadata.find({ 
      department 
    }).sort({ uploadDate: -1 });
    
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch department files' });
  }
});

// Get All Files (Admin Only)
app.get('/api/files/all', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const files = await FileMetadata.find().sort({ uploadDate: -1 });
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all files' });
  }
});

// Delete File Metadata
app.delete('/api/files/metadata/:id', verifyCognitoToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await FileMetadata.findById(id);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check ownership or admin
    if (file.userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await FileMetadata.findByIdAndDelete(id);
    
    res.json({ message: 'File metadata deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file metadata' });
  }
});

// ============ STATISTICS ROUTES ============

// Get Dashboard Stats
app.get('/api/stats/dashboard', verifyCognitoToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const totalFiles = await FileMetadata.countDocuments({ userId });
    const files = await FileMetadata.find({ userId });
    const storageUsed = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    
    // Get department info
    const department = await Department.findOne({ name: req.user.department });
    
    res.json({
      stats: {
        totalFiles,
        storageUsed,
        department: department ? department.name : 'N/A',
        recentUploads: files.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get Admin Stats
app.get('/api/stats/admin', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const totalDepartments = await Department.countDocuments();
    const activeDepartments = await Department.countDocuments({ status: 'Active' });
    const totalFiles = await FileMetadata.countDocuments();
    
    const files = await FileMetadata.find();
    const storageUsed = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    // Get files by department
    const departmentStats = await FileMetadata.aggregate([
      {
        $group: {
          _id: '$department',
          fileCount: { $sum: 1 },
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    res.json({
      stats: {
        totalDepartments,
        activeDepartments,
        totalFiles,
        storageUsed,
        departmentStats
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// ============ ACTIVITY ROUTES ============

// Get Recent Activities
app.get('/api/activities', verifyCognitoToken, async (req, res) => {
  try {
    let query = {};
    
    // Non-admin users only see their own activities
    if (req.user.role !== 'SUPER_ADMIN') {
      query.userId = req.user.userId;
    }

    const activities = await Activity.find(query)
      .sort({ timestamp: -1 })
      .limit(50);
    
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// ============ COGNITO USER MANAGEMENT ============

// Add User to Group
app.post('/api/cognito/add-to-group', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { username, groupName } = req.body;

    await cognito.adminAddUserToGroup({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: username,
      GroupName: groupName
    }).promise();

    res.json({ message: `User added to ${groupName}` });
  } catch (error) {
    console.error('Error adding user to group:', error);
    res.status(500).json({ error: 'Failed to add user to group' });
  }
});

// List Users in Group
app.get('/api/cognito/group/:groupName/users', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { groupName } = req.params;

    const result = await cognito.listUsersInGroup({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      GroupName: groupName
    }).promise();

    res.json({ users: result.Users });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cognito: 'configured',
    s3: 'configured'
  });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Cognito User Pool: ${process.env.COGNITO_USER_POOL_ID}`);
  console.log(`☁️  S3 Bucket Prefix: ${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}`);
});

module.exports = app;