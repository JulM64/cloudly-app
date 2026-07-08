// server-dynamodb.js - AWS Cognito + DynamoDB Backend - FULL ROLE MANAGEMENT
require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3       = new AWS.S3();
const cognito  = new AWS.CognitoIdentityServiceProvider({ region: process.env.AWS_REGION || 'us-east-1' });

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

// ── TOKEN VERIFICATION ────────────────────────────────────────────────────────
function verifyCognitoToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.payload) throw new Error('Invalid token');
    req.user = {
      userId:     decoded.payload.sub,
      email:      decoded.payload.email,
      groups:     decoded.payload['cognito:groups'] || [],
      department: decoded.payload['custom:department'],
      role:       decoded.payload['custom:role'],
      firstName:  decoded.payload.given_name || 'User'
    };
    if (req.user.groups.includes('Administrators')) {
      req.user.role = 'SUPER_ADMIN'; req.user.isAdmin = true;
    } else if (req.user.role === 'DEPT_HEAD') {
      req.user.isAdmin = false;
    } else if (req.user.role === 'UNIT_HEAD') {
      req.user.isAdmin = false;
    } else {
      req.user.role = req.user.role || 'MEMBER'; req.user.isAdmin = false;
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', details: err.message });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Admin privileges required' });
  next();
}

function requireHeadOrAdmin(req, res, next) {
  if (!['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Head or Admin privileges required' });
  }
  next();
}

// ── ACTIVITY LOGGING ──────────────────────────────────────────────────────────
async function logActivity(userId, email, action, target, details = {}) {
  try {
    await dynamoDB.put({
      TableName: 'cloudly-activities',
      Item: { userId, timestamp: Date.now(), email, action, target, details: JSON.stringify(details), createdAt: new Date().toISOString() }
    }).promise();
  } catch (err) { console.error('❌ Activity log error:', err); }
}

// ── HEALTH / TEST ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.get('/api/test',   (req, res) => res.json({ success: true, message: '✅ Backend working!', timestamp: new Date().toISOString() }));

// ══════════════════════════════════════════════════════════════════════════════
// USERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Get all Cognito users
app.get('/api/users', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const result = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 }).promise();
    const users = (result.Users || []).map(u => {
      const attr = n => (u.Attributes || []).find(a => a.Name === n)?.Value || '';
      return {
        email:      attr('email'),
        name:       `${attr('given_name')} ${attr('family_name')}`.trim() || attr('email'),
        department: attr('custom:department'),
        role:       attr('custom:role') || 'MEMBER',
        status:     u.UserStatus,
        username:   u.Username
      };
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

// Update user department in Cognito
app.put('/api/users/:email/department', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { department } = req.body;
    const listResult = await cognito.listUsers({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Filter: `email = "${email}"`, Limit: 1
    }).promise();
    if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found' });
    await cognito.adminUpdateUserAttributes({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: listResult.Users[0].Username,
      UserAttributes: [{ Name: 'custom:department', Value: department }]
    }).promise();

    // Remove this user from every OTHER department's membersList (they moved away)
    try {
      const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
      const allDepts = deptResult.Items || [];
      const targetDeptLower = (department || '').toLowerCase().trim();

      const otherDeptsWithUser = allDepts.filter(d =>
        (d.name || '').toLowerCase().trim() !== targetDeptLower &&
        Array.isArray(d.membersList) &&
        d.membersList.some(m => m.email === email)
      );

      for (const otherDept of otherDeptsWithUser) {
        const cleanedMembers = otherDept.membersList.filter(m => m.email !== email);
        await dynamoDB.update({
          TableName: 'cloudly-departments',
          Key: { id: otherDept.id },
          UpdateExpression: 'set membersList = :ml, members = :mc, updatedAt = :ua',
          ExpressionAttributeValues: { ':ml': cleanedMembers, ':mc': cleanedMembers.length, ':ua': new Date().toISOString() }
        }).promise();
        console.log(`🗑️ Removed ${email} from old dept/unit "${otherDept.name}" membersList`);

        // Also clear manager field if they were the manager there
        if (otherDept.managerEmail === email) {
          await dynamoDB.update({
            TableName: 'cloudly-departments',
            Key: { id: otherDept.id },
            UpdateExpression: 'set manager = :m, managerEmail = :me, updatedAt = :ua',
            ExpressionAttributeValues: { ':m': 'Not assigned', ':me': null, ':ua': new Date().toISOString() }
          }).promise();
        }
      }
    } catch (cleanupErr) { console.warn('Could not clean up old dept memberships:', cleanupErr.message); }

    await logActivity(req.user.userId, req.user.email, 'UPDATE_USER_DEPARTMENT', email, { department });
    res.json({ message: 'User department updated', email, department });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department: ' + err.message });
  }
});


// Create a new Cognito user (Admin only)
app.post('/api/users/create', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, department, role } = req.body;
    if (!email || !firstName) return res.status(400).json({ error: 'email and firstName required' });
    console.log('👤 Creating Cognito user:', email);
    const tempPassword = `Cloudly${Math.floor(100000 + Math.random() * 900000)}!`;
    await cognito.adminCreateUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: tempPassword,
      MessageAction: 'SUPPRESS',
      UserAttributes: [
        { Name: 'email',             Value: email },
        { Name: 'email_verified',    Value: 'true' },
        { Name: 'given_name',        Value: firstName },
        { Name: 'family_name',       Value: lastName || '' },
        { Name: 'custom:department', Value: department || '' },
        { Name: 'custom:role',       Value: role || 'MEMBER' },
      ]
    }).promise();
    await logActivity(req.user.userId, req.user.email, 'CREATE_USER', email, { department, role });
    console.log('✅ Cognito user created:', email, '| Temp password:', tempPassword);
    res.status(201).json({ message: 'User created successfully', email, tempPassword, firstName, lastName, department, role: role || 'MEMBER' });
  } catch (err) {
    if (err.code === 'UsernameExistsException') return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(500).json({ error: 'Failed to create user: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROLE REQUEST ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// Propose a role change (Admin or DEPT_HEAD can propose)
app.post('/api/role-requests', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { targetEmail, targetName, newRole, department, reason } = req.body;
    if (!targetEmail || !newRole) return res.status(400).json({ error: 'targetEmail and newRole required' });

    const validRoles = ['MEMBER', 'UNIT_HEAD', 'DEPT_HEAD'];
    if (!validRoles.includes(newRole)) return res.status(400).json({ error: 'Invalid role. Must be MEMBER, UNIT_HEAD, or DEPT_HEAD' });

    // DEPT_HEAD can only propose roles within their own department
    if (req.user.role === 'DEPT_HEAD' && newRole === 'DEPT_HEAD') {
      return res.status(403).json({ error: 'DEPT_HEAD cannot promote others to DEPT_HEAD. Only SUPER_ADMIN can.' });
    }

    // ── SUPER_ADMIN: auto-approve immediately, no pending step ──────────────
    if (req.user.role === 'SUPER_ADMIN') {
      // Find user in Cognito and update role directly
      const listResult = await cognito.listUsers({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Filter: `email = "${targetEmail}"`, Limit: 1
      }).promise();

      if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found in Cognito' });

      await cognito.adminUpdateUserAttributes({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: listResult.Users[0].Username,
        UserAttributes: [{ Name: 'custom:role', Value: newRole }]
      }).promise();

      // Also update membersList role in department if applicable + remove from old depts + clear stale manager fields
      try {
        const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
        const allDepts = deptResult.Items || [];
        const targetDeptLower = (department || '').toLowerCase().trim();

        // 1) Update role inside the target department's membersList + set as manager if head role
        const dept = allDepts.find(d => d.name === (department || ''));
        if (dept) {
          const updatedMembers = Array.isArray(dept.membersList)
            ? dept.membersList.map(m => m.email === targetEmail ? { ...m, role: newRole } : m)
            : [];

          const requiredRoleForTarget = (dept.type === 'unit') ? 'UNIT_HEAD' : 'DEPT_HEAD';
          const isBecomingManager = newRole === requiredRoleForTarget;

          if (isBecomingManager) {
            // Set this user as the new manager of the target dept
            await dynamoDB.update({
              TableName: 'cloudly-departments',
              Key: { id: dept.id },
              UpdateExpression: 'set membersList = :ml, manager = :mgr, managerEmail = :me, updatedAt = :ua',
              ExpressionAttributeValues: {
                ':ml': updatedMembers,
                ':mgr': targetName || targetEmail,
                ':me': targetEmail,
                ':ua': new Date().toISOString()
              }
            }).promise();
            console.log(`✅ Set ${targetEmail} as manager of "${dept.name}"`);
          } else {
            await dynamoDB.update({
              TableName: 'cloudly-departments',
              Key: { id: dept.id },
              UpdateExpression: 'set membersList = :ml, updatedAt = :ua',
              ExpressionAttributeValues: { ':ml': updatedMembers, ':ua': new Date().toISOString() }
            }).promise();
          }
        }

        // 2) Remove this user from EVERY OTHER department's membersList (they moved to a new dept/unit)
        const otherDeptsWithUser = allDepts.filter(d =>
          (d.name || '').toLowerCase().trim() !== targetDeptLower &&
          Array.isArray(d.membersList) &&
          d.membersList.some(m => m.email === targetEmail)
        );

        for (const otherDept of otherDeptsWithUser) {
          const cleanedMembers = otherDept.membersList.filter(m => m.email !== targetEmail);
          await dynamoDB.update({
            TableName: 'cloudly-departments',
            Key: { id: otherDept.id },
            UpdateExpression: 'set membersList = :ml, members = :mc, updatedAt = :ua',
            ExpressionAttributeValues: { ':ml': cleanedMembers, ':mc': cleanedMembers.length, ':ua': new Date().toISOString() }
          }).promise();
          console.log(`🗑️ Removed ${targetEmail} from old dept/unit "${otherDept.name}" membersList`);
        }

        // 3) Clear manager field on any dept where this user is manager but no longer qualifies
        const staleManagerDepts = allDepts.filter(d => {
          // Match by email (reliable) OR name as fallback for old records
          const emailMatch = d.managerEmail && d.managerEmail === targetEmail;
          const nameMatch = !d.managerEmail && (d.manager||'').toLowerCase().trim() === (targetName||'').toLowerCase().trim();
          if (!emailMatch && !nameMatch) return false;
          const movedAway = (d.name || '').toLowerCase().trim() !== targetDeptLower;
          const requiredRoleForThisRecord = (d.type === 'unit') ? 'UNIT_HEAD' : 'DEPT_HEAD';
          const wrongRoleNow = newRole !== requiredRoleForThisRecord;
          return movedAway || wrongRoleNow;
        });

        for (const staleDept of staleManagerDepts) {
          await dynamoDB.update({
            TableName: 'cloudly-departments',
            Key: { id: staleDept.id },
            UpdateExpression: 'set manager = :m, managerEmail = :me, updatedAt = :ua',
            ExpressionAttributeValues: { ':m': 'Not assigned', ':me': null, ':ua': new Date().toISOString() }
          }).promise();
          console.log(`🔄 Cleared stale manager on ${staleDept.type || 'department'} "${staleDept.name}" (was ${targetEmail})`);
        }
      } catch (deptErr) { console.warn('Could not update dept membersList:', deptErr.message); }

      // Save as already approved in history
      const requestId = `role_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await dynamoDB.put({
        TableName: 'cloudly-role-requests',
        Item: {
          requestId, targetEmail, targetName: targetName || targetEmail,
          newRole, department: department || '', reason: reason || '',
          proposedBy: req.user.email, proposedByRole: 'SUPER_ADMIN',
          status: 'APPROVED', approvedBy: req.user.email,
          approvedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        }
      }).promise();

      await logActivity(req.user.userId, req.user.email, 'AUTO_APPROVE_ROLE_CHANGE', targetEmail, { newRole, department });
      console.log(`✅ SUPER_ADMIN auto-approved role: ${targetEmail} → ${newRole}`);
      return res.status(201).json({ message: `Role changed to ${newRole} immediately`, autoApproved: true, newRole });
    }

    // ── DEPT_HEAD / UNIT_HEAD: goes through pending approval ────────────────
    const requestId = `role_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const roleRequest = {
      requestId,
      targetEmail,
      targetName:    targetName || targetEmail,
      newRole,
      department:    department || req.user.department,
      reason:        reason || '',
      proposedBy:    req.user.email,
      proposedByRole: req.user.role,
      status:        'PENDING',
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString()
    };

    await dynamoDB.put({ TableName: 'cloudly-role-requests', Item: roleRequest }).promise();
    await logActivity(req.user.userId, req.user.email, 'PROPOSE_ROLE_CHANGE', targetEmail, { newRole, department });

    console.log(`📋 Role request created: ${targetEmail} → ${newRole} by ${req.user.email}`);
    res.status(201).json({ message: 'Role change request submitted for approval', roleRequest });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create role request: ' + err.message });
  }
});

// Get all role requests (SUPER_ADMIN sees all, DEPT_HEAD sees their dept)
app.get('/api/role-requests', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise();
    let requests = result.Items || [];

    // DEPT_HEAD only sees requests in their department
    if (req.user.role === 'DEPT_HEAD') {
      requests = requests.filter(r => r.department === req.user.department);
    }

    // Sort by newest first
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const pending = requests.filter(r => r.status === 'PENDING').length;

    res.json({ requests, pendingCount: pending });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role requests: ' + err.message });
  }
});

// Get pending count only (for notification badge)
app.get('/api/role-requests/pending-count', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise();
    let pending = (result.Items || []).filter(r => r.status === 'PENDING');
    if (req.user.role === 'DEPT_HEAD') {
      pending = pending.filter(r => r.department === req.user.department);
    }
    res.json({ pendingCount: pending.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending count: ' + err.message });
  }
});

// Approve role request (SUPER_ADMIN only)
app.put('/api/role-requests/:requestId/approve', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Get the request
    const result = await dynamoDB.get({ TableName: 'cloudly-role-requests', Key: { requestId } }).promise();
    if (!result.Item) return res.status(404).json({ error: 'Role request not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    const roleRequest = result.Item;

    // Find user in Cognito
    const listResult = await cognito.listUsers({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Filter: `email = "${roleRequest.targetEmail}"`, Limit: 1
    }).promise();
    if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found in Cognito' });

    // Update custom:role in Cognito
    await cognito.adminUpdateUserAttributes({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: listResult.Users[0].Username,
      UserAttributes: [{ Name: 'custom:role', Value: roleRequest.newRole }]
    }).promise();

    // Mark request as approved
    await dynamoDB.update({
      TableName: 'cloudly-role-requests',
      Key: { requestId },
      UpdateExpression: 'set #s = :s, approvedBy = :ab, approvedAt = :aa, updatedAt = :ua',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s': 'APPROVED', ':ab': req.user.email,
        ':aa': new Date().toISOString(), ':ua': new Date().toISOString()
      }
    }).promise();

    // Also update membersList role in department
    try {
      const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
      const dept = (deptResult.Items || []).find(d => d.name === roleRequest.department);
      if (dept && Array.isArray(dept.membersList)) {
        const updatedMembers = dept.membersList.map(m =>
          m.email === roleRequest.targetEmail ? { ...m, role: roleRequest.newRole } : m
        );
        await dynamoDB.update({
          TableName: 'cloudly-departments',
          Key: { id: dept.id },
          UpdateExpression: 'set membersList = :ml, updatedAt = :ua',
          ExpressionAttributeValues: { ':ml': updatedMembers, ':ua': new Date().toISOString() }
        }).promise();
      }
    } catch (deptErr) { console.warn('Could not update dept membersList:', deptErr.message); }

    await logActivity(req.user.userId, req.user.email, 'APPROVE_ROLE_CHANGE', roleRequest.targetEmail, { newRole: roleRequest.newRole });

    console.log(`✅ Role approved: ${roleRequest.targetEmail} → ${roleRequest.newRole}`);
    res.json({ message: 'Role change approved and applied', roleRequest: { ...roleRequest, status: 'APPROVED' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve role request: ' + err.message });
  }
});

// Reject role request (SUPER_ADMIN only)
app.put('/api/role-requests/:requestId/reject', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const result = await dynamoDB.get({ TableName: 'cloudly-role-requests', Key: { requestId } }).promise();
    if (!result.Item) return res.status(404).json({ error: 'Role request not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Request already processed' });

    await dynamoDB.update({
      TableName: 'cloudly-role-requests',
      Key: { requestId },
      UpdateExpression: 'set #s = :s, rejectedBy = :rb, rejectedAt = :ra, rejectReason = :rr, updatedAt = :ua',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':s': 'REJECTED', ':rb': req.user.email,
        ':ra': new Date().toISOString(), ':rr': reason || '',
        ':ua': new Date().toISOString()
      }
    }).promise();

    await logActivity(req.user.userId, req.user.email, 'REJECT_ROLE_CHANGE', result.Item.targetEmail, { reason });

    res.json({ message: 'Role change request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject role request: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/departments', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    let departments = result.Items || [];

    // DEPT_HEAD: only their dept + its units
    if (req.user.role === 'DEPT_HEAD') {
      const userDept = (req.user.department || '').toLowerCase().trim();

      // Find their department (case-insensitive, top-level only)
      const myDept = departments.find(d =>
        (d.name || '').toLowerCase().trim() === userDept &&
        (!d.type || d.type === 'department')
      );

      if (myDept) {
        // Return their dept + all units whose parentId matches
        departments = departments.filter(d =>
          d.id === myDept.id || d.parentId === myDept.id
        );
      } else {
        // Fallback: match by name only (case-insensitive)
        departments = departments.filter(d =>
          (d.name || '').toLowerCase().trim() === userDept
        );
      }

      console.log(`🏢 DEPT_HEAD ${req.user.email} (dept: ${req.user.department}) → ${departments.length} dept/units`);
    }
    // UNIT_HEAD: only their unit
    else if (req.user.role === 'UNIT_HEAD') {
      const userDept = (req.user.department || '').toLowerCase().trim();
      departments = departments.filter(d =>
        (d.name || '').toLowerCase().trim() === userDept
      );
      console.log(`🔷 UNIT_HEAD ${req.user.email} (unit: ${req.user.department}) → ${departments.length} units`);
    }

    departments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ departments });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments: ' + err.message });
  }
});

app.get('/api/departments/hierarchy', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const all = result.Items || [];
    const topLevel = all.filter(d => !d.parentId);
    const buildTree = pid => all.filter(d => d.parentId === pid).map(d => ({ ...d, children: buildTree(d.id) }));
    res.json({ hierarchy: topLevel.map(d => ({ ...d, children: buildTree(d.id) })), allDepartments: all });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hierarchy: ' + err.message });
  }
});

app.post('/api/departments', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { name, manager, managerEmail, description, type, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const itemType = type || 'department';
    if (itemType === 'unit' && !parentId) return res.status(400).json({ error: 'Units must have a parent department' });

    if (parentId) {
      const p = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id: parentId } }).promise();
      if (!p.Item) return res.status(404).json({ error: 'Parent department not found' });
    }

    const departmentId = `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bucketName   = `${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
    } catch (e) {
      if (e.code === 'NotFound' || e.code === 'NoSuchBucket') {
        await s3.createBucket({ Bucket: bucketName, ACL: 'private' }).promise();
        await s3.putBucketCors({
          Bucket: bucketName,
          CORSConfiguration: { CORSRules: [{ AllowedHeaders: ['*'], AllowedMethods: ['GET','PUT','POST','DELETE','HEAD'], AllowedOrigins: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3000 }] }
        }).promise();
      } else throw e;
    }

    const department = {
      id: departmentId, name, s3Bucket: bucketName,
      manager: manager || 'Not assigned', managerEmail: managerEmail || null,
      description: description || '',
      type: itemType, parentId: parentId || null,
      status: 'Active', members: 0, membersList: [], projects: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    await dynamoDB.put({ TableName: 'cloudly-departments', Item: department }).promise();
    await logActivity(req.user.userId, req.user.email, 'CREATE_' + itemType.toUpperCase(), name, { bucketName });
    res.status(201).json({ message: `${itemType} created`, department });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create', details: err.code });
  }
});

app.put('/api/departments/:id', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, manager, managerEmail, description, status, members, membersList, projects, type, parentId } = req.body;

    // UNIT_HEAD can only update their own unit
    if (req.user.role === 'UNIT_HEAD') {
      const dept = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id } }).promise();
      if (dept.Item?.name !== req.user.department) return res.status(403).json({ error: 'You can only update your own unit' });
    }

    const expr = []; const names = {}; const vals = {};
    if (name)                  { expr.push('#name = :name');       names['#name'] = 'name';     vals[':name'] = name; }
    if (manager !== undefined) { expr.push('manager = :manager');  vals[':manager'] = manager; }
    if (managerEmail !== undefined) { expr.push('managerEmail = :managerEmail'); vals[':managerEmail'] = managerEmail; }
    if (description !== undefined) { expr.push('description = :description'); vals[':description'] = description; }
    if (status)                { expr.push('#status = :status');   names['#status'] = 'status'; vals[':status'] = status; }
    if (members !== undefined) { expr.push('members = :members');  vals[':members'] = members; }
    if (membersList !== undefined) { expr.push('membersList = :membersList'); vals[':membersList'] = membersList; }
    if (projects !== undefined){ expr.push('projects = :projects');vals[':projects'] = projects; }
    if (type !== undefined)    { expr.push('#type = :type');       names['#type'] = 'type';     vals[':type'] = type; }
    if (parentId !== undefined){ expr.push('parentId = :parentId');vals[':parentId'] = parentId; }
    expr.push('updatedAt = :updatedAt'); vals[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: 'cloudly-departments', Key: { id },
      UpdateExpression: 'set ' + expr.join(', '),
      ExpressionAttributeValues: vals, ReturnValues: 'ALL_NEW'
    };
    if (Object.keys(names).length > 0) params.ExpressionAttributeNames = names;

    const result = await dynamoDB.update(params).promise();
    res.json({ message: 'Department updated', department: result.Attributes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update: ' + err.message });
  }
});

app.delete('/api/departments/:id', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    await dynamoDB.delete({ TableName: 'cloudly-departments', Key: { id: req.params.id } }).promise();
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FILE ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/files/metadata', verifyCognitoToken, async (req, res) => {
  try {
    const { fileName, originalName, s3Key, s3Bucket, fileSize, fileType } = req.body;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata = {
      userId: req.user.userId, fileId, fileName, originalName,
      s3Key, s3Bucket, department: req.user.department,
      userEmail: req.user.email, fileSize: fileSize || 0,
      fileType: fileType || 'unknown', uploadDate: new Date().toISOString()
    };
    await dynamoDB.put({ TableName: 'cloudly-files', Item: metadata }).promise();
    await logActivity(req.user.userId, req.user.email, 'UPLOAD_FILE', fileName, { s3Key, fileSize });
    res.status(201).json({ message: 'File metadata saved', file: metadata });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save file metadata: ' + err.message });
  }
});

// Open file — presigned URL (inline view)
app.get('/api/files/open/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const result = await dynamoDB.get({ TableName: 'cloudly-files', Key: { userId, fileId } }).promise();
    if (!result.Item) return res.status(404).json({ error: 'File not found' });
    const file = result.Item;
    const canAccess = file.userId === req.user.userId || ['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD'].includes(req.user.role);
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: file.s3Bucket, Key: file.s3Key, Expires: 900,
      ResponseContentDisposition: `inline; filename="${file.originalName || file.fileName}"`
    });
    await logActivity(req.user.userId, req.user.email, 'OPEN_FILE', file.originalName || file.fileName, { fileId });
    res.json({ url, fileName: file.originalName || file.fileName, fileType: file.fileType });
  } catch (err) {
    res.status(500).json({ error: 'Failed to open file: ' + err.message });
  }
});

// Download file — presigned URL (force download)
app.get('/api/files/download/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const result = await dynamoDB.get({ TableName: 'cloudly-files', Key: { userId, fileId } }).promise();
    if (!result.Item) return res.status(404).json({ error: 'File not found' });
    const file = result.Item;
    const url = await s3.getSignedUrlPromise('getObject', {
      Bucket: file.s3Bucket, Key: file.s3Key, Expires: 900,
      ResponseContentDisposition: `attachment; filename="${file.originalName || file.fileName}"`
    });
    res.json({ url, fileName: file.originalName || file.fileName });
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file: ' + err.message });
  }
});

app.get('/api/files/my-files', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.query({
      TableName: 'cloudly-files',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': req.user.userId },
      ScanIndexForward: false
    }).promise();
    res.json({ files: result.Items || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files: ' + err.message });
  }
});

// DEPT_HEAD can see all files in their dept + units
app.get('/api/files/department/:department', verifyCognitoToken, async (req, res) => {
  try {
    const { department } = req.params;
    const canAccess = req.user.role === 'SUPER_ADMIN' ||
      req.user.department === department ||
      (req.user.role === 'DEPT_HEAD');
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });

    const result = await dynamoDB.scan({
      TableName: 'cloudly-files',
      FilterExpression: 'department = :dept',
      ExpressionAttributeValues: { ':dept': department }
    }).promise();
    res.json({ files: result.Items || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch department files: ' + err.message });
  }
});

app.get('/api/files/all', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-files' }).promise();
    res.json({ files: result.Items || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all files: ' + err.message });
  }
});

app.delete('/api/files/metadata/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    if (userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized' });
    await dynamoDB.delete({ TableName: 'cloudly-files', Key: { userId, fileId } }).promise();
    res.json({ message: 'File metadata deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/activities', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-activities', Limit: 200 }).promise();
    let activities = result.Items || [];
    activities.sort((a, b) => b.timestamp - a.timestamp);

    const role = req.user.role || 'MEMBER';

    if (role === 'SUPER_ADMIN') {
      // Admin sees everything
      return res.json({ activities: activities.slice(0, 50) });
    }

    // Get all departments to build email scope
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = deptResult.Items || [];
    const userDeptLower = (req.user.department || '').toLowerCase().trim();

    if (role === 'DEPT_HEAD') {
      // Sees own activities + all members of their dept AND its units
      const myDept = allDepts.find(d =>
        (d.name||'').toLowerCase().trim() === userDeptLower && (!d.type || d.type === 'department')
      );
      const scopedDepts = myDept
        ? allDepts.filter(d => d.id === myDept.id || d.parentId === myDept.id)
        : allDepts.filter(d => (d.name||'').toLowerCase().trim() === userDeptLower);

      const memberEmails = new Set([
        req.user.email,
        ...scopedDepts.flatMap(d => (d.membersList || []).map(m => m.email))
      ]);
      activities = activities.filter(a => memberEmails.has(a.email));

    } else if (role === 'UNIT_HEAD') {
      // Sees own activities + members of their unit only
      const myUnit = allDepts.find(d =>
        (d.name||'').toLowerCase().trim() === userDeptLower && d.type === 'unit'
      );
      const memberEmails = new Set([
        req.user.email,
        ...(myUnit?.membersList || []).map(m => m.email)
      ]);
      activities = activities.filter(a => memberEmails.has(a.email));

    } else {
      // MEMBER sees only their own activities
      activities = activities.filter(a =>
        a.userId === req.user.userId || a.email === req.user.email
      );
    }

    res.json({ activities: activities.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STATS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/stats/dashboard', verifyCognitoToken, async (req, res) => {
  try {
    const role = req.user.role || 'MEMBER';

    // Fetch all departments once
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = deptResult.Items || [];

    // ── Build scoped dept list based on role ────────────────────────────────
    let scopedDepts = [];
    let scopeLabel  = 'MEMBER';

    if (role === 'SUPER_ADMIN') {
      scopedDepts = allDepts;
      scopeLabel  = 'GLOBAL';
    } else if (role === 'DEPT_HEAD') {
      const ud = (req.user.department || '').toLowerCase().trim();
      const myDept = allDepts.find(d =>
        (d.name||'').toLowerCase().trim() === ud && (!d.type || d.type === 'department')
      );
      scopedDepts = myDept
        ? allDepts.filter(d => d.id === myDept.id || d.parentId === myDept.id)
        : allDepts.filter(d => (d.name||'').toLowerCase().trim() === ud);
      scopeLabel = 'DEPARTMENT';
    } else if (role === 'UNIT_HEAD') {
      const ud = (req.user.department || '').toLowerCase().trim();
      scopedDepts = allDepts.filter(d => (d.name||'').toLowerCase().trim() === ud);
      scopeLabel = 'UNIT';
    }

    // ── Build scoped member email set ───────────────────────────────────────
    // Always include the logged-in user themselves
    const scopedMemberEmails = new Set([req.user.email]);
    const scopedDeptNames    = new Set();

    if (scopeLabel === 'MEMBER') {
      // Only their own dept
      const myDeptName = (req.user.department || '').toLowerCase().trim();
      if (myDeptName) scopedDeptNames.add(myDeptName);
    } else if (scopeLabel === 'GLOBAL') {
      allDepts.forEach(d => {
        scopedDeptNames.add((d.name||'').toLowerCase().trim());
        (d.membersList || []).forEach(m => scopedMemberEmails.add(m.email));
      });
    } else {
      // DEPARTMENT or UNIT scope
      scopedDepts.forEach(d => {
        scopedDeptNames.add((d.name||'').toLowerCase().trim());
        (d.membersList || []).forEach(m => scopedMemberEmails.add(m.email));
      });
    }

    // Also add Cognito users whose custom:department matches scoped depts (fallback for users not in membersList)
    if (scopeLabel !== 'GLOBAL') {
      try {
        const cognitoResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 }).promise();
        (cognitoResult.Users || []).forEach(u => {
          const attr = n => (u.Attributes||[]).find(a=>a.Name===n)?.Value||'';
          const email = attr('email');
          const dept  = (attr('custom:department')||'').toLowerCase().trim();
          if (email && scopedDeptNames.has(dept)) scopedMemberEmails.add(email);
        });
      } catch {}
    }

    // ── Fetch files ─────────────────────────────────────────────────────────
    let scopedFiles = [];
    if (scopeLabel === 'MEMBER') {
      // Only own files
      const fileResult = await dynamoDB.query({
        TableName: 'cloudly-files',
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': req.user.userId }
      }).promise();
      scopedFiles = fileResult.Items || [];
    } else {
      const fileResult = await dynamoDB.scan({ TableName: 'cloudly-files' }).promise();
      const allFiles = fileResult.Items || [];
      scopedFiles = (scopeLabel === 'GLOBAL')
        ? allFiles
        : allFiles.filter(f =>
            scopedDeptNames.has((f.department||'').toLowerCase().trim()) ||
            scopedMemberEmails.has(f.userEmail)
          );
    }

    // ── Fetch activities ────────────────────────────────────────────────────
    let scopedActivity = [];
    if (scopeLabel === 'MEMBER') {
      // MEMBER: strictly only their own activities
      const actResult = await dynamoDB.scan({
        TableName: 'cloudly-activities',
        FilterExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': req.user.userId }
      }).promise();
      scopedActivity = (actResult.Items || []).sort((a,b) => b.timestamp - a.timestamp).slice(0, 8);
    } else {
      const actResult = await dynamoDB.scan({ TableName: 'cloudly-activities' }).promise();
      const allActivities = (actResult.Items || []).sort((a,b) => b.timestamp - a.timestamp);
      // DEPT_HEAD/UNIT_HEAD: only see their scoped member emails (includes Cognito dept fallback)
      // SUPER_ADMIN: sees everything
      scopedActivity = (scopeLabel === 'GLOBAL')
        ? allActivities.slice(0, 8)
        : allActivities.filter(a => scopedMemberEmails.has(a.email)).slice(0, 8);
    }

    const teamMembers = scopedDepts.reduce((sum, d) => sum + (d.members || 0), 0);

    res.json({
      stats: {
        scope: scopeLabel,
        totalFiles: scopedFiles.length,
        storageUsed: scopedFiles.reduce((s, f) => s + (f.fileSize || 0), 0),
        department: req.user.department || 'N/A',
        teamMembers,
        totalDepartments: scopedDepts.filter(d => !d.type || d.type === 'department').length,
        totalUnits: scopedDepts.filter(d => d.type === 'unit').length,
        recentUploads: scopedFiles.sort((a,b) => new Date(b.uploadDate)-new Date(a.uploadDate)).slice(0, 5),
        recentActivity: scopedActivity
      }
    });
  } catch (err) {
    console.error('❌ Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats: ' + err.message });
  }
});

app.get('/api/stats/admin', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const [deptResult, fileResult, roleReqResult, cognitoResult] = await Promise.all([
      dynamoDB.scan({ TableName: 'cloudly-departments' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-files' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise().catch(() => ({ Items: [] })),
      cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 }).promise().catch(() => ({ Users: [] }))
    ]);
    const departments = deptResult.Items || [];
    const files       = fileResult.Items || [];
    const roleRequests = roleReqResult.Items || [];
    const cognitoUsers = cognitoResult.Users || [];

    const departmentStats = {};
    files.forEach(f => {
      if (f.department) {
        if (!departmentStats[f.department]) departmentStats[f.department] = { fileCount: 0, totalSize: 0 };
        departmentStats[f.department].fileCount++;
        departmentStats[f.department].totalSize += f.fileSize || 0;
      }
    });

    // Count users by role from Cognito attributes
    const roleCounts = { SUPER_ADMIN: 0, DEPT_HEAD: 0, UNIT_HEAD: 0, MEMBER: 0 };
    cognitoUsers.forEach(u => {
      const groups = []; // groups not fetched here, rely on custom:role + Administrators heuristic
      const role = (u.Attributes || []).find(a => a.Name === 'custom:role')?.Value || 'MEMBER';
      if (roleCounts[role] !== undefined) roleCounts[role]++;
      else roleCounts.MEMBER++;
    });

    res.json({
      stats: {
        totalDepartments: departments.filter(d => !d.type || d.type === 'department').length,
        totalUnits: departments.filter(d => d.type === 'unit').length,
        activeDepartments: departments.filter(d => d.status === 'Active').length,
        totalFiles: files.length,
        storageUsed: files.reduce((sum, f) => sum + (f.fileSize || 0), 0),
        totalUsers: cognitoUsers.length,
        roleCounts,
        pendingRoleRequests: roleRequests.filter(r => r.status === 'PENDING').length,
        departmentStats
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats: ' + err.message });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🚀 ============================================');
  console.log('🚀  Cloudly Backend - Running on port ' + PORT);
  console.log('🚀 ============================================');
  console.log('🔐 Roles: SUPER_ADMIN | DEPT_HEAD | UNIT_HEAD | MEMBER');
  console.log('📋 Role requests: propose → approve/reject flow');
  console.log('🚀 ============================================\n');
});

module.exports = app;