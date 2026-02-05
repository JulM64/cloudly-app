// server-dynamodb.js - AWS Cognito + DynamoDB Backend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

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

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://*.gitpod.io',
  'https://*.amazonaws.com'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.match(allowed.replace('*', '.*')))) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ============ COGNITO TOKEN VERIFICATION ============
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;

// Initialize JWKS client
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      console.error('❌ Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Verify Cognito Token Middleware
function verifyCognitoToken(req, res, next) {
  console.log('');
  console.log('🔐 ============================================');
  console.log('🔐 TOKEN VERIFICATION START');
  console.log('🔐 ============================================');

  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  console.log('📝 Token received (first 50 chars):', token.substring(0, 50) + '...');

  // Try to verify as JWT
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('❌ JWT verification failed:', err.message);
      console.log('🔍 Trying to verify via Cognito API...');
      
      // Try Cognito API verification
      cognito.getUser({ AccessToken: token }).promise()
        .then(userData => {
          console.log('✅ Token verified via Cognito API');
          req.user = {
            userId: userData.Username,
            email: userData.UserAttributes.find(attr => attr.Name === 'email')?.Value,
            groups: []
          };
          
          // Check admin status
          const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
          if (adminEmails.includes(req.user.email)) {
            req.user.isAdmin = true;
            console.log('👑 User is admin:', req.user.email);
          }
          
          console.log('🔐 ============================================');
          console.log('✅ VERIFICATION SUCCESSFUL');
          console.log('   User:', req.user.email);
          console.log('   Admin:', req.user.isAdmin ? 'Yes' : 'No');
          console.log('🔐 ============================================');
          console.log('');
          
          next();
        })
        .catch(cognitoErr => {
          console.error('❌ Cognito API verification failed:', cognitoErr.message);
          console.log('🔐 ============================================');
          console.log('❌ VERIFICATION FAILED');
          console.log('🔐 ============================================');
          console.log('');
          res.status(401).json({ 
            error: 'Invalid token',
            details: err?.message || cognitoErr?.message 
          });
        });
    } else {
      console.log('✅ JWT verification successful');
      console.log('📋 Decoded token payload:');
      console.log('   sub:', decoded.sub);
      console.log('   email:', decoded.email);
      console.log('   cognito:groups:', decoded['cognito:groups']);
      
      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        groups: decoded['cognito:groups'] || []
      };
      
      // Check admin status
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
      if (adminEmails.includes(req.user.email)) {
        req.user.isAdmin = true;
        console.log('👑 User is admin (via email)');
      } else if (req.user.groups.includes('admin') || req.user.groups.includes('Admin')) {
        req.user.isAdmin = true;
        console.log('👑 User is admin (via group)');
      }
      
      console.log('🔐 ============================================');
      console.log('✅ VERIFICATION SUCCESSFUL');
      console.log('   User:', req.user.email);
      console.log('   Admin:', req.user.isAdmin ? 'Yes' : 'No');
      console.log('   Groups:', req.user.groups);
      console.log('🔐 ============================================');
      console.log('');
      
      next();
    }
  });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    console.log('⛔ Non-admin attempted admin action:', req.user.email);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ============ ACTIVITY LOGGING ============
async function logActivity(userId, email, action, target, details = {}) {
  try {
    const activity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      email,
      action,
      target,
      details: JSON.stringify(details),
      timestamp: new Date().toISOString(),
      ip: 'server'
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
    message: 'Backend is working!',
    timestamp: new Date().toISOString(),
    env: {
      region: process.env.AWS_REGION,
      hasCognitoConfig: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
      hasAwsKeys: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    }
  });
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
    const { name, manager, description, status, members, projects } = req.body;

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
    const { userId, fileName, fileSize, fileType, s3Key, department } = req.body;
    
    console.log('💾 Saving file metadata for:', fileName);

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata = {
      id: fileId,
      userId,
      fileName,
      fileSize,
      fileType,
      s3Key,
      department,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };

    const params = {
      TableName: 'cloudly-files',
      Item: metadata
    };

    await dynamoDB.put(params).promise();
    console.log('✅ File metadata saved');
    
    await logActivity(userId, req.user.email, 'UPLOAD_FILE', fileName, { department, fileSize });

    res.status(201).json({ message: 'File metadata saved', fileId });
  } catch (error) {
    console.error('❌ Error saving file metadata:', error);
    res.status(500).json({ error: 'Failed to save file metadata: ' + error.message });
  }
});

// Get user's files
app.get('/api/files/my-files', verifyCognitoToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('📁 Fetching files for user:', userId);

    const params = {
      TableName: 'cloudly-files',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    };

    const result = await dynamoDB.scan(params).promise();
    console.log(`✅ Found ${result.Items.length} files for user`);
    
    res.json({ files: result.Items });
  } catch (error) {
    console.error('❌ Error fetching user files:', error);
    res.status(500).json({ error: 'Failed to fetch user files: ' + error.message });
  }
});

// Get department files
app.get('/api/files/department/:department', verifyCognitoToken, async (req, res) => {
  try {
    const { department } = req.params;
    
    console.log('📁 Fetching files for department:', department);

    const params = {
      TableName: 'cloudly-files',
      FilterExpression: 'department = :department',
      ExpressionAttributeValues: { ':department': department }
    };

    const result = await dynamoDB.scan(params).promise();
    console.log(`✅ Found ${result.Items.length} files for department ${department}`);
    
    res.json({ files: result.Items });
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
    
    res.json({ files: result.Items });
  } catch (error) {
    console.error('❌ Error fetching all files:', error);
    res.status(500).json({ error: 'Failed to fetch all files: ' + error.message });
  }
});

// Delete file metadata
app.delete('/api/files/metadata/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    
    console.log('🗑️  Deleting file metadata:', fileId);

    // Check if user owns the file or is admin
    if (req.user.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    const params = {
      TableName: 'cloudly-files',
      Key: { id: fileId }
    };

    await dynamoDB.delete(params).promise();
    console.log('✅ File metadata deleted');
    
    await logActivity(req.user.userId, req.user.email, 'DELETE_FILE', fileId, { userId });

    res.json({ message: 'File metadata deleted' });
  } catch (error) {
    console.error('❌ Error deleting file metadata:', error);
    res.status(500).json({ error: 'Failed to delete file metadata: ' + error.message });
  }
});

// ============ ACTIVITY ROUTES ============

// Get activities (admin only)
app.get('/api/activities', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching activities...');

    const params = {
      TableName: 'cloudly-activities',
      Limit: 100,
      ScanIndexForward: false
    };

    const result = await dynamoDB.scan(params).promise();
    console.log(`✅ Found ${result.Items.length} activities`);
    
    const activities = result.Items.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    res.json({ activities });
  } catch (error) {
    console.error('❌ Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities: ' + error.message });
  }
});

// ============ STATS ROUTES ============

// Get dashboard stats
app.get('/api/stats/dashboard', verifyCognitoToken, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');

    // Get departments count
    const deptParams = { TableName: 'cloudly-departments' };
    const deptResult = await dynamoDB.scan(deptParams).promise();
    const totalDepartments = deptResult.Items.length;
    const activeDepartments = deptResult.Items.filter(d => d.status === 'Active').length;

    // Get files count
    const fileParams = { TableName: 'cloudly-files' };
    const fileResult = await dynamoDB.scan(fileParams).promise();
    const totalFiles = fileResult.Items.length;
    const userFiles = fileResult.Items.filter(f => f.userId === req.user.userId).length;

    // Get activities count
    const activityParams = { TableName: 'cloudly-activities' };
    const activityResult = await dynamoDB.scan(activityParams).promise();
    const totalActivities = activityResult.Items.length;
    const userActivities = activityResult.Items.filter(a => a.userId === req.user.userId).length;

    const stats = {
      departments: {
        total: totalDepartments,
        active: activeDepartments
      },
      files: {
        total: totalFiles,
        user: userFiles
      },
      activities: {
        total: totalActivities,
        user: userActivities
      }
    };

    console.log('✅ Dashboard stats calculated');
    res.json({ stats });
  } catch (error) {
    console.error('❌ Error calculating dashboard stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats: ' + error.message });
  }
});

// Get admin stats
app.get('/api/stats/admin', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching admin stats...');

    // Get all counts
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const fileResult = await dynamoDB.scan({ TableName: 'cloudly-files' }).promise();
    const activityResult = await dynamoDB.scan({ TableName: 'cloudly-activities' }).promise();

    // Calculate file sizes
    const totalFileSize = fileResult.Items.reduce((sum, file) => sum + (parseInt(file.fileSize) || 0), 0);
    const avgFileSize = fileResult.Items.length > 0 ? totalFileSize / fileResult.Items.length : 0;

    // Get unique users
    const uniqueUsers = [...new Set(fileResult.Items.map(f => f.userId))];

    // Group files by department
    const filesByDepartment = {};
    fileResult.Items.forEach(file => {
      if (file.department) {
        filesByDepartment[file.department] = (filesByDepartment[file.department] || 0) + 1;
      }
    });

    // Group activities by action
    const activitiesByAction = {};
    activityResult.Items.forEach(activity => {
      activitiesByAction[activity.action] = (activitiesByAction[activity.action] || 0) + 1;
    });

    const stats = {
      overview: {
        departments: deptResult.Items.length,
        files: fileResult.Items.length,
        activities: activityResult.Items.length,
        uniqueUsers: uniqueUsers.length
      },
      fileStats: {
        totalSize: totalFileSize,
        averageSize: Math.round(avgFileSize),
        byDepartment: filesByDepartment
      },
      activityStats: {
        byAction: activitiesByAction,
        recentActivities: activityResult.Items.slice(0, 10).map(a => ({
          action: a.action,
          user: a.email,
          timestamp: a.timestamp
        }))
      }
    };

    console.log('✅ Admin stats calculated');
    res.json({ stats });
  } catch (error) {
    console.error('❌ Error calculating admin stats:', error);
    res.status(500).json({ error: 'Failed to calculate admin stats: ' + error.message });
  }
});

// ============ GENERATE PRESIGNED URL ============
app.post('/api/generate-presigned-url', verifyCognitoToken, async (req, res) => {
  try {
    const { fileName, fileType, department } = req.body;
    const userId = req.user.userId;

    console.log('🔗 Generating presigned URL for:', fileName);

    if (!fileName || !fileType || !department) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find department bucket
    const deptParams = {
      TableName: 'cloudly-departments',
      FilterExpression: 'name = :name',
      ExpressionAttributeValues: { ':name': department }
    };

    const deptResult = await dynamoDB.scan(deptParams).promise();
    if (deptResult.Items.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const bucketName = deptResult.Items[0].s3Bucket;
    console.log('   Bucket:', bucketName);

    // Generate unique S3 key
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `uploads/${userId}/${timestamp}_${safeFileName}`;

    // Generate presigned URL
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Expires: 3600,
      ContentType: fileType,
      Metadata: {
        uploadedBy: userId,
        department: department,
        originalName: fileName
      }
    };

    const presignedUrl = await s3.getSignedUrlPromise('putObject', params);
    console.log('✅ Presigned URL generated');

    res.json({
      presignedUrl,
      s3Key,
      bucketName,
      fileUrl: `https://${bucketName}.s3.amazonaws.com/${s3Key}`
    });
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL: ' + error.message });
  }
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log('🚀 CLOUDLY BACKEND SERVER STARTED');
  console.log('🚀 ============================================');
  console.log(`   Port: ${PORT}`);
  console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`   Cognito Pool: ${process.env.COGNITO_USER_POOL_ID ? 'Configured' : 'Not configured'}`);
  console.log(`   AWS Keys: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Not configured'}`);
  console.log('🚀 ============================================');
  console.log('');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;