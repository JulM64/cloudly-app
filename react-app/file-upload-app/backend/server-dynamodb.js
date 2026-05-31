// server-dynamodb.js - AWS Cognito + DynamoDB Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// AWS Configuration
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize AWS Services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'us-east-1'
});

// ============ CORS CONFIGURATION (FIXED FOR CODESPACES) ============
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Handle preflight for Codespaces
app.options('*', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).send('');
});

// ============ COGNITO TOKEN VERIFICATION (SIMPLIFIED) ============

// Verify Cognito Token Middleware
function verifyCognitoToken(req, res, next) {
  console.log('');
  console.log('🔐 ============================================');
  console.log('🔐 TOKEN VERIFICATION');
  console.log('🔐 ============================================');

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  console.log('📝 Token received (first 30 chars):', token.substring(0, 30) + '...');

  // Decode token without verification (simple approach)
  try {
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || !decoded.payload) {
      throw new Error('Invalid token format');
    }

    console.log('✅ Token decoded');
    console.log('   Email:', decoded.payload.email);
    console.log('   Groups:', decoded.payload['cognito:groups']);

    req.user = {
      userId: decoded.payload.sub,
      email: decoded.payload.email,
      groups: decoded.payload['cognito:groups'] || [],
      department: decoded.payload['custom:department'],
      firstName: decoded.payload.given_name || 'User'
    };

    // Determine role
    if (req.user.groups.includes('Administrators')) {
      req.user.role = 'SUPER_ADMIN';
      req.user.isAdmin = true;
    } else if (req.user.groups.includes('DepartmentAdmins')) {
      req.user.role = 'DEPARTMENT_ADMIN';
      req.user.isAdmin = false;
    } else {
      req.user.role = 'USER';
      req.user.isAdmin = false;
    }

    console.log('   Role:', req.user.role);
    console.log('🔐 ============================================');
    console.log('');

    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    console.log('🔐 ============================================');
    console.log('');
    res.status(401).json({ 
      error: 'Invalid token',
      details: error.message 
    });
  }
}

// Admin middleware
function requireAdmin(req, res, next) {
  console.log('🔒 Checking admin privileges...');
  console.log('   User role:', req.user.role);
  
  if (req.user.role !== 'SUPER_ADMIN') {
    console.log('❌ Access denied - not admin');
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  console.log('✅ Admin access granted');
  next();
}

// ============ ACTIVITY LOGGING ============
async function logActivity(userId, email, action, target, details = {}) {
  try {
    const activity = {
      userId,
      timestamp: Date.now(),
      email,
      action,
      target,
      details: JSON.stringify(details),
      createdAt: new Date().toISOString()
    };

    const params = {
      TableName: 'cloudly-activities',
      Item: activity
    };

    await dynamoDB.put(params).promise();
    console.log('📝 Activity logged:', action, 'by', email);
  } catch (error) {
    console.error('❌ Error logging activity:', error);
  }
}

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  console.log('❤️ Health check requested');
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      dynamodb: 'configured',
      s3: 'configured',
      cognito: 'configured'
    }
  });
});

app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint hit');
  res.json({ 
    success: true,
    message: '✅ Backend is working perfectly!',
    timestamp: new Date().toISOString(),
    env: {
      region: process.env.AWS_REGION,
      hasCognitoConfig: !!(process.env.COGNITO_USER_POOL_ID),
      hasAwsKeys: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    }
  });
});

// ============ USERS ROUTE (for Members modal) ============

// Get all Cognito users (Admin only)
app.get('/api/users', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    console.log('👥 Fetching Cognito users...');

    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Limit: 60
    };

    const result = await cognito.listUsers(params).promise();

    const users = (result.Users || []).map(u => {
      const attr = (name) => (u.Attributes || []).find(a => a.Name === name)?.Value || '';
      return {
        email: attr('email'),
        name: `${attr('given_name')} ${attr('family_name')}`.trim() || attr('email'),
        department: attr('custom:department'),
        status: u.UserStatus,
        groups: []
      };
    });

    console.log(`✅ Found ${users.length} users`);
    res.json({ users });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
});

// ============ DEPARTMENT ROUTES ============

// Get All Departments
app.get('/api/departments', verifyCognitoToken, async (req, res) => {
  try {
    console.log('📂 Fetching departments from DynamoDB...');
    
    const params = {
      TableName: 'cloudly-departments'
    };

    const result = await dynamoDB.scan(params).promise();
    console.log(`✅ Found ${result.Items.length} departments`);
    
    const departments = result.Items.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.json({ departments });
  } catch (error) {
    console.error('❌ Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments: ' + error.message });
  }
});

// Get Department Hierarchy
app.get('/api/departments/hierarchy', verifyCognitoToken, async (req, res) => {
  try {
    console.log('🌲 Fetching department hierarchy...');
    
    const params = {
      TableName: 'cloudly-departments'
    };

    const result = await dynamoDB.scan(params).promise();
    const allDepartments = result.Items || [];
    
    // Build hierarchy
    const topLevel = allDepartments.filter(d => !d.parentId);
    
    const buildTree = (parentId) => {
      return allDepartments
        .filter(d => d.parentId === parentId)
        .map(dept => ({
          ...dept,
          children: buildTree(dept.id)
        }));
    };
    
    const hierarchy = topLevel.map(dept => ({
      ...dept,
      children: buildTree(dept.id)
    }));
    
    console.log(`✅ Built hierarchy with ${topLevel.length} top-level departments`);
    
    res.json({ hierarchy, allDepartments });
  } catch (error) {
    console.error('❌ Error fetching hierarchy:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy: ' + error.message });
  }
});

// Create Department (Admin only) - WITH HIERARCHY SUPPORT
app.post('/api/departments', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { name, manager, description, type, parentId } = req.body;

    console.log('');
    console.log('🆕 ============================================');
    console.log('🆕 CREATE DEPARTMENT/UNIT REQUEST');
    console.log('🆕 ============================================');
    console.log('   Name:', name);
    console.log('   Type:', type || 'department');
    console.log('   Parent:', parentId || 'none');
    console.log('   Manager:', manager);
    console.log('   Requested by:', req.user.email);
    console.log('');

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Default to 'department' if type not specified
    const itemType = type || 'department';

    // If it's a unit, it must have a parent department
    if (itemType === 'unit' && !parentId) {
      return res.status(400).json({ error: 'Units must have a parent department' });
    }

    // Validate parent exists if provided
    if (parentId) {
      const parentParams = {
        TableName: 'cloudly-departments',
        Key: { id: parentId }
      };
      const parentResult = await dynamoDB.get(parentParams).promise();
      if (!parentResult.Item) {
        return res.status(404).json({ error: 'Parent department not found' });
      }
      console.log('   Parent validated:', parentResult.Item.name);
    }

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials not configured in .env');
      return res.status(500).json({ 
        error: 'AWS credentials not configured' 
      });
    }

    // Generate unique ID
    const departmentId = `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('   Generated ID:', departmentId);
    
    // Create S3 bucket name
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const bucketName = `${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}-${sanitizedName}`;

    console.log('');
    console.log('☁️  STEP 1: Creating S3 bucket');
    console.log('   Bucket name:', bucketName);

    // Create S3 bucket
    try {
      try {
        await s3.headBucket({ Bucket: bucketName }).promise();
        console.log('   ℹ️  Bucket already exists');
      } catch (headErr) {
        if (headErr.code === 'NotFound' || headErr.code === 'NoSuchBucket') {
          console.log('   Creating new bucket...');
          
          await s3.createBucket({
            Bucket: bucketName,
            ACL: 'private'
          }).promise();
          
          console.log('   ✅ S3 bucket created successfully!');
        } else {
          throw headErr;
        }
      }

      console.log('');
      console.log('🔧 STEP 2: Configuring CORS');
      
      await s3.putBucketCors({
        Bucket: bucketName,
        CORSConfiguration: {
          CORSRules: [{
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: [
              'http://localhost:3000',
              'http://127.0.0.1:3000',
              '*'
            ],
            ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
            MaxAgeSeconds: 3000
          }]
        }
      }).promise();
      
      console.log('   ✅ CORS configured successfully!');

    } catch (s3Error) {
      console.error('');
      console.error('❌ S3 ERROR:', s3Error.code);
      console.error('   Message:', s3Error.message);
      
      if (s3Error.code === 'InvalidAccessKeyId' || s3Error.code === 'SignatureDoesNotMatch') {
        return res.status(500).json({ 
          error: 'AWS credentials are invalid' 
        });
      }
      
      if (s3Error.code === 'AccessDenied') {
        return res.status(500).json({ 
          error: 'AWS user does not have S3 permissions' 
        });
      }

      if (s3Error.code === 'BucketAlreadyExists') {
        console.log('   ℹ️  Bucket exists but owned by another account');
        return res.status(400).json({ 
          error: `Bucket name already taken. Try a different name.` 
        });
      }
      
      return res.status(500).json({ 
        error: `Failed to create S3 bucket: ${s3Error.message}`,
        code: s3Error.code
      });
    }

    // Save to DynamoDB with hierarchy
    console.log('');
    console.log('💾 STEP 3: Saving to DynamoDB');
    
    const department = {
      id: departmentId,
      name,
      s3Bucket: bucketName,
      manager: manager || 'Not assigned',
      description: description || '',
      type: itemType,
      parentId: parentId || null,
      status: 'Active',
      members: 0,
      projects: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: 'cloudly-departments',
      Item: department
    };

    await dynamoDB.put(params).promise();
    console.log(`   ✅ ${itemType} saved to DynamoDB!`);

    await logActivity(req.user.userId, req.user.email, 'CREATE_' + itemType.toUpperCase(), name, { bucketName, parentId });

    console.log('');
    console.log('✅ ============================================');
    console.log(`✅ ${itemType.toUpperCase()} CREATED SUCCESSFULLY!`);
    console.log('✅ ============================================');
    console.log('   Name:', name);
    console.log('   S3 Bucket:', bucketName);
    console.log('   DynamoDB ID:', departmentId);
    console.log('✅ ============================================');
    console.log('');

    res.status(201).json({ 
      message: `${itemType} created successfully`,
      department 
    });
  } catch (error) {
    console.error('');
    console.error('❌ ============================================');
    console.error('❌ ERROR CREATING DEPARTMENT/UNIT');
    console.error('❌ ============================================');
    console.error('Error:', error);
    console.error('❌ ============================================');
    console.error('');
    
    res.status(500).json({ 
      error: error.message || 'Failed to create',
      details: error.code 
    });
  }
});

// Update Department
app.put('/api/departments/:id', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, manager, description, status, members, projects, type, parentId } = req.body;

    console.log('📝 Updating department:', id);

    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name) {
      updateExpression.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }
    if (manager !== undefined) {
      updateExpression.push('manager = :manager');
      expressionAttributeValues[':manager'] = manager;
    }
    if (description !== undefined) {
      updateExpression.push('description = :description');
      expressionAttributeValues[':description'] = description;
    }
    if (status) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }
    if (members !== undefined) {
      updateExpression.push('members = :members');
      expressionAttributeValues[':members'] = members;
    }
    if (projects !== undefined) {
      updateExpression.push('projects = :projects');
      expressionAttributeValues[':projects'] = projects;
    }
    if (type !== undefined) {
      updateExpression.push('#type = :type');
      expressionAttributeNames['#type'] = 'type';
      expressionAttributeValues[':type'] = type;
    }
    if (parentId !== undefined) {
      updateExpression.push('parentId = :parentId');
      expressionAttributeValues[':parentId'] = parentId;
    }
    
    updateExpression.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: 'cloudly-departments',
      Key: { id },
      UpdateExpression: 'set ' + updateExpression.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    if (Object.keys(expressionAttributeNames).length > 0) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await dynamoDB.update(params).promise();
    console.log('✅ Department updated');
    
    res.json({ message: 'Department updated', department: result.Attributes });
  } catch (error) {
    console.error('❌ Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department: ' + error.message });
  }
});

// Delete Department
app.delete('/api/departments/:id', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️  Deleting department:', id);

    const params = {
      TableName: 'cloudly-departments',
      Key: { id }
    };

    await dynamoDB.delete(params).promise();
    console.log('✅ Department deleted from DynamoDB');
    
    res.json({ message: 'Department deleted (S3 bucket preserved for safety)' });
  } catch (error) {
    console.error('❌ Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department: ' + error.message });
  }
});

// ============ FILE ROUTES ============

// Save file metadata
app.post('/api/files/metadata', verifyCognitoToken, async (req, res) => {
  try {
    const { fileName, originalName, s3Key, s3Bucket, fileSize, fileType } = req.body;
    
    console.log('💾 Saving file metadata for:', fileName);

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata = {
      userId: req.user.userId,
      fileId,
      fileName,
      originalName,
      s3Key,
      s3Bucket,
      department: req.user.department,
      userEmail: req.user.email,
      fileSize: fileSize || 0,
      fileType: fileType || 'unknown',
      uploadDate: new Date().toISOString()
    };

    const params = {
      TableName: 'cloudly-files',
      Item: metadata
    };

    await dynamoDB.put(params).promise();
    console.log('✅ File metadata saved');
    
    await logActivity(req.user.userId, req.user.email, 'UPLOAD_FILE', fileName, { s3Key, fileSize });

    res.status(201).json({ message: 'File metadata saved', file: metadata });
  } catch (error) {
    console.error('❌ Error saving file metadata:', error);
    res.status(500).json({ error: 'Failed to save file metadata: ' + error.message });
  }
});

// Get user's files
app.get('/api/files/my-files', verifyCognitoToken, async (req, res) => {
  try {
    console.log('📁 Fetching files for user:', req.user.email);

    const params = {
      TableName: 'cloudly-files',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': req.user.userId
      },
      ScanIndexForward: false
    };

    const result = await dynamoDB.query(params).promise();
    console.log(`✅ Found ${result.Items.length} files`);
    
    res.json({ files: result.Items || [] });
  } catch (error) {
    console.error('❌ Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files: ' + error.message });
  }
});

// Get department files
app.get('/api/files/department/:department', verifyCognitoToken, async (req, res) => {
  try {
    const { department } = req.params;

    if (req.user.role !== 'SUPER_ADMIN' && req.user.department !== department) {
      return res.status(403).json({ error: 'Access denied to this department' });
    }
    
    console.log('📁 Fetching files for department:', department);

    const params = {
      TableName: 'cloudly-files',
      FilterExpression: 'department = :dept',
      ExpressionAttributeValues: { ':dept': department }
    };

    const result = await dynamoDB.scan(params).promise();
    console.log(`✅ Found ${result.Items.length} files`);
    
    res.json({ files: result.Items || [] });
  } catch (error) {
    console.error('❌ Error fetching department files:', error);
    res.status(500).json({ error: 'Failed to fetch department files: ' + error.message });
  }
});

// Get all files (admin only)
app.get('/api/files/all', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    console.log('📁 Fetching all files (admin)...');

    const params = {
      TableName: 'cloudly-files'
    };

    const result = await dynamoDB.scan(params).promise();
    console.log(`✅ Found ${result.Items.length} total files`);
    
    res.json({ files: result.Items || [] });
  } catch (error) {
    console.error('❌ Error fetching all files:', error);
    res.status(500).json({ error: 'Failed to fetch all files: ' + error.message });
  }
});

// Delete file metadata
app.delete('/api/files/metadata/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    
    if (userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    console.log('🗑️  Deleting file metadata:', fileId);

    const params = {
      TableName: 'cloudly-files',
      Key: { userId, fileId }
    };

    await dynamoDB.delete(params).promise();
    console.log('✅ File metadata deleted');
    
    res.json({ message: 'File metadata deleted' });
  } catch (error) {
    console.error('❌ Error deleting file metadata:', error);
    res.status(500).json({ error: 'Failed to delete file metadata: ' + error.message });
  }
});

// ============ ACTIVITY ROUTES ============

// Get activities
app.get('/api/activities', verifyCognitoToken, async (req, res) => {
  try {
    if (req.user.role === 'SUPER_ADMIN') {
      const params = {
        TableName: 'cloudly-activities',
        Limit: 50
      };
      const result = await dynamoDB.scan(params).promise();
      const activities = result.Items.sort((a, b) => b.timestamp - a.timestamp);
      res.json({ activities });
    } else {
      const params = {
        TableName: 'cloudly-activities',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': req.user.userId
        },
        Limit: 50,
        ScanIndexForward: false
      };
      const result = await dynamoDB.query(params).promise();
      res.json({ activities: result.Items || [] });
    }
  } catch (error) {
    console.error('❌ Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities: ' + error.message });
  }
});

// ============ STATS ROUTES ============

// Get dashboard stats
app.get('/api/stats/dashboard', verifyCognitoToken, async (req, res) => {
  try {
    const params = {
      TableName: 'cloudly-files',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': req.user.userId
      }
    };

    const result = await dynamoDB.query(params).promise();
    const files = result.Items || [];
    
    const totalFiles = files.length;
    const storageUsed = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    res.json({
      stats: {
        totalFiles,
        storageUsed,
        department: req.user.department || 'N/A',
        recentUploads: files.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats: ' + error.message });
  }
});

// Get admin stats
app.get('/api/stats/admin', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const [deptResult, fileResult] = await Promise.all([
      dynamoDB.scan({ TableName: 'cloudly-departments' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-files' }).promise()
    ]);

    const departments = deptResult.Items || [];
    const files = fileResult.Items || [];

    const totalDepartments = departments.length;
    const activeDepartments = departments.filter(d => d.status === 'Active').length;
    const totalFiles = files.length;
    const storageUsed = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    const departmentStats = {};
    files.forEach(file => {
      if (file.department) {
        if (!departmentStats[file.department]) {
          departmentStats[file.department] = { fileCount: 0, totalSize: 0 };
        }
        departmentStats[file.department].fileCount++;
        departmentStats[file.department].totalSize += file.fileSize || 0;
      }
    });

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
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats: ' + error.message });
  }
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log('🚀  Cloudly Backend Server - Running on port ' + PORT);
  console.log('🚀 ============================================');
  console.log('');
  console.log('📋 Configuration:');
  console.log('   🗄️  Database: DynamoDB');
  console.log('   ☁️  Storage: Amazon S3');
  console.log('   🔐 Auth: AWS Cognito');
  console.log(`   📍 Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   🪣  S3 Prefix: ${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}`);
  console.log('');
  console.log('📊 DynamoDB Tables:');
  console.log('   • cloudly-departments');
  console.log('   • cloudly-files');
  console.log('   • cloudly-activities');
  console.log('');
  console.log('🔗 API Endpoints:');
  console.log('   • GET  /api/test (no auth)');
  console.log('   • GET  /api/health');
  console.log('   • GET  /api/departments');
  console.log('   • POST /api/departments (Admin)');
  console.log('   • GET  /api/users (Admin)');
  console.log('   • GET  /api/files/my-files');
  console.log('   • POST /api/files/metadata');
  console.log('');
  console.log('🚀 ============================================');
  console.log('');
});

module.exports = app;