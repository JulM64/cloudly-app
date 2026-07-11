// server-dynamodb.js - AWS Cognito + DynamoDB Backend - COMPLETE FIXED VERSION
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
const s3 = new AWS.S3();
const cognito = new AWS.CognitoIdentityServiceProvider({ region: process.env.AWS_REGION || 'us-east-1' });

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: '8mb' }));

// ── TOKEN VERIFICATION ────────────────────────────────────────────────────────
function verifyCognitoToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.payload) throw new Error('Invalid token');
    const groups = decoded.payload['cognito:groups'] || [];
    const customRole = decoded.payload['custom:role'];
    let role = 'MEMBER';
    if (groups.includes('Administrators')) role = 'SUPER_ADMIN';
    else if (['DEPT_HEAD', 'UNIT_HEAD', 'MEMBER'].includes(customRole)) role = customRole;
    req.user = {
      userId: decoded.payload.sub,
      email: decoded.payload.email,
      groups,
      department: decoded.payload['custom:department'] || '',
      role,
      isAdmin: role === 'SUPER_ADMIN',
      firstName: decoded.payload.given_name || 'User'
    };
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
  if (!['SUPER_ADMIN', 'DEPT_HEAD', 'UNIT_HEAD'].includes(req.user.role))
    return res.status(403).json({ error: 'Head or Admin privileges required' });
  next();
}

// ── ACTIVITY LOGGING ──────────────────────────────────────────────────────────
async function logActivity(userId, email, action, target, details = {}) {
  try {
    await dynamoDB.put({
      TableName: 'cloudly-activities',
      Item: { userId, timestamp: Date.now(), email, action, target, details: JSON.stringify(details), createdAt: new Date().toISOString() }
    }).promise();
  } catch (err) { console.error('Activity log error:', err.message); }
}

// ── Helper: get scoped depts for a user ───────────────────────────────────────
async function getScopedDepts(user, allDepts) {
  const ud = (user.department || '').toLowerCase().trim();
  if (user.role === 'DEPT_HEAD') {
    const myDept = allDepts.find(d => (d.name || '').toLowerCase().trim() === ud && (!d.type || d.type === 'department'));
    return myDept ? allDepts.filter(d => d.id === myDept.id || d.parentId === myDept.id) : allDepts.filter(d => (d.name || '').toLowerCase().trim() === ud);
  }
  if (user.role === 'UNIT_HEAD') {
    return allDepts.filter(d => (d.name || '').toLowerCase().trim() === ud);
  }
  return allDepts; // SUPER_ADMIN
}

// ── Helper: get scoped member emails for a user ───────────────────────────────
function getScopedEmails(user, scopedDepts) {
  return new Set([
    user.email,
    ...scopedDepts.flatMap(d => (d.membersList || []).map(m => m.email))
  ]);
}

// ── Helper: filter files by scoped depts ─────────────────────────────────────
function filterFilesByScope(allFiles, scopedDepts, scopedEmails) {
  const deptNames = new Set(scopedDepts.map(d => (d.name || '').toLowerCase().trim()));
  const bucketNames = new Set(scopedDepts.map(d => (d.s3Bucket || '').toLowerCase()));
  return allFiles.filter(f => {
    if (deptNames.has((f.department || '').toLowerCase().trim())) return true;
    if (bucketNames.has((f.s3Bucket || '').toLowerCase())) return true;
    if (scopedEmails.has(f.userEmail)) return true;
    return false;
  });
}

// ── HEALTH / TEST ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.get('/api/test', (req, res) => res.json({ success: true, message: '✅ Backend working!', timestamp: new Date().toISOString() }));

// ══════════════════════════════════════════════════════════════════════════════
// USERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/users', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const result = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 }).promise();

    // Fetch all avatar profiles in one scan, build a lookup by userId (Cognito sub)
    let avatarMap = {};
    try {
      const profilesResult = await dynamoDB.scan({ TableName: 'cloudly-user-profiles' }).promise();
      (profilesResult.Items || []).forEach(p => {
        if (p.userId) avatarMap[p.userId] = p.avatarBase64;
      });
    } catch (e) {
      console.warn('Could not fetch avatar profiles:', e.message);
    }

    const users = (result.Users || []).map(u => {
      const attr = n => (u.Attributes || []).find(a => a.Name === n)?.Value || '';
      const userId = attr('sub');
      return {
        userId,
        email: attr('email'),
        name: `${attr('given_name')} ${attr('family_name')}`.trim() || attr('email'),
        department: attr('custom:department'),
        role: attr('custom:role') || 'MEMBER',
        status: u.UserStatus,
        username: u.Username,
        avatarBase64: avatarMap[userId] || null
      };
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

app.put('/api/users/:email/department', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { department } = req.body;
    const listResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${email}"`, Limit: 1 }).promise();
    if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found' });
    await cognito.adminUpdateUserAttributes({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: listResult.Users[0].Username,
      UserAttributes: [{ Name: 'custom:department', Value: department }]
    }).promise();

    // Remove from all OTHER depts membersList
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = deptResult.Items || [];
    const targetLower = (department || '').toLowerCase().trim();
    const others = allDepts.filter(d =>
      (d.name || '').toLowerCase().trim() !== targetLower &&
      Array.isArray(d.membersList) && d.membersList.some(m => m.email === email)
    );
    for (const d of others) {
      const cleaned = d.membersList.filter(m => m.email !== email);
      const updateExpr = ['set membersList = :ml, members = :mc, updatedAt = :ua'];
      const updateVals = { ':ml': cleaned, ':mc': cleaned.length, ':ua': new Date().toISOString() };
      if (d.managerEmail === email) {
        updateExpr[0] += ', manager = :mgr, managerEmail = :me';
        updateVals[':mgr'] = 'Not assigned';
        updateVals[':me'] = null;
      }
      await dynamoDB.update({ TableName: 'cloudly-departments', Key: { id: d.id }, UpdateExpression: updateExpr[0], ExpressionAttributeValues: updateVals }).promise();
    }
    await logActivity(req.user.userId, req.user.email, 'UPDATE_USER_DEPARTMENT', email, { department });
    res.json({ message: 'User department updated', email, department });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department: ' + err.message });
  }
});

app.post('/api/users/create', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, department, role } = req.body;
    if (!email || !firstName) return res.status(400).json({ error: 'email and firstName required' });
    const tempPassword = `Cloudly${Math.floor(100000 + Math.random() * 900000)}!`;
    await cognito.adminCreateUser({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: tempPassword,
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: firstName },
        { Name: 'family_name', Value: lastName || '' },
        { Name: 'custom:department', Value: department || '' },
        { Name: 'custom:role', Value: role || 'MEMBER' },
      ]
    }).promise();
    await logActivity(req.user.userId, req.user.email, 'CREATE_USER', email, { department, role });
    res.status(201).json({ message: 'User created successfully', email, tempPassword, firstName, lastName, department, role: role || 'MEMBER' });
  } catch (err) {
    if (err.code === 'UsernameExistsException') return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(500).json({ error: 'Failed to create user: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AVATAR ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/users/avatar', verifyCognitoToken, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64 || !imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Valid base64 image required' });
    }
    const approxBytes = (imageBase64.length * 3) / 4;
    if (approxBytes > 400000) {
      return res.status(400).json({ error: 'Image too large. Please use a smaller image.' });
    }
    await dynamoDB.put({
      TableName: 'cloudly-user-profiles',
      Item: {
        userId: req.user.userId,
        email: req.user.email,
        avatarBase64: imageBase64,
        updatedAt: new Date().toISOString()
      }
    }).promise();
    await logActivity(req.user.userId, req.user.email, 'UPDATE_AVATAR', req.user.email, {});
    res.json({ message: 'Avatar updated successfully', avatarBase64: imageBase64 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar: ' + err.message });
  }
});

app.get('/api/users/avatar/me', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.get({
      TableName: 'cloudly-user-profiles',
      Key: { userId: req.user.userId }
    }).promise();
    res.json({ avatarBase64: result.Item?.avatarBase64 || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch avatar: ' + err.message });
  }
});

app.delete('/api/users/avatar', verifyCognitoToken, async (req, res) => {
  try {
    await dynamoDB.delete({
      TableName: 'cloudly-user-profiles',
      Key: { userId: req.user.userId }
    }).promise();
    await logActivity(req.user.userId, req.user.email, 'REMOVE_AVATAR', req.user.email, {});
    res.json({ message: 'Avatar removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove avatar: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROLE REQUEST ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/role-requests', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { targetEmail, targetName, newRole, department, reason } = req.body;
    if (!targetEmail || !newRole) return res.status(400).json({ error: 'targetEmail and newRole required' });
    if (!['MEMBER', 'UNIT_HEAD', 'DEPT_HEAD'].includes(newRole)) return res.status(400).json({ error: 'Invalid role' });
    if (req.user.role === 'DEPT_HEAD' && newRole === 'DEPT_HEAD') return res.status(403).json({ error: 'Only SUPER_ADMIN can assign DEPT_HEAD' });

    // SUPER_ADMIN: auto-approve immediately
    if (req.user.role === 'SUPER_ADMIN') {
      const listResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${targetEmail}"`, Limit: 1 }).promise();
      if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found in Cognito' });

      // Update role in Cognito
      await cognito.adminUpdateUserAttributes({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: listResult.Users[0].Username,
        UserAttributes: [{ Name: 'custom:role', Value: newRole }]
      }).promise();

      // Also update department in Cognito if provided
      if (department) {
        await cognito.adminUpdateUserAttributes({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: listResult.Users[0].Username,
          UserAttributes: [{ Name: 'custom:department', Value: department }]
        }).promise();
      }

      // Update DynamoDB departments
      const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
      const allDepts = deptResult.Items || [];
      const targetDeptLower = (department || '').toLowerCase().trim();

      // 1) Update target dept: set role in membersList + set as manager if head
      const targetDept = allDepts.find(d => (d.name || '').toLowerCase().trim() === targetDeptLower);
      if (targetDept) {
        const ml = Array.isArray(targetDept.membersList)
          ? targetDept.membersList.map(m => m.email === targetEmail ? { ...m, role: newRole } : m)
          : [];
        const requiredRole = targetDept.type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD';
        const becomingManager = newRole === requiredRole;
        if (becomingManager) {
          await dynamoDB.update({
            TableName: 'cloudly-departments', Key: { id: targetDept.id },
            UpdateExpression: 'set membersList = :ml, manager = :mgr, managerEmail = :me, updatedAt = :ua',
            ExpressionAttributeValues: { ':ml': ml, ':mgr': targetName || targetEmail, ':me': targetEmail, ':ua': new Date().toISOString() }
          }).promise();
        } else {
          await dynamoDB.update({
            TableName: 'cloudly-departments', Key: { id: targetDept.id },
            UpdateExpression: 'set membersList = :ml, updatedAt = :ua',
            ExpressionAttributeValues: { ':ml': ml, ':ua': new Date().toISOString() }
          }).promise();
        }
      }

      // 2) Remove from all OTHER depts membersList
      const otherDepts = allDepts.filter(d =>
        (d.name || '').toLowerCase().trim() !== targetDeptLower &&
        Array.isArray(d.membersList) && d.membersList.some(m => m.email === targetEmail)
      );
      for (const od of otherDepts) {
        const cleaned = od.membersList.filter(m => m.email !== targetEmail);
        await dynamoDB.update({
          TableName: 'cloudly-departments', Key: { id: od.id },
          UpdateExpression: 'set membersList = :ml, members = :mc, updatedAt = :ua',
          ExpressionAttributeValues: { ':ml': cleaned, ':mc': cleaned.length, ':ua': new Date().toISOString() }
        }).promise();
      }

      // 3) Clear manager on depts where this user is stale manager
      const staleDepts = allDepts.filter(d => {
        const emailMatch = d.managerEmail === targetEmail;
        const nameMatch = !d.managerEmail && (d.manager || '').toLowerCase().trim() === (targetName || '').toLowerCase().trim();
        if (!emailMatch && !nameMatch) return false;
        const isTargetDept = (d.name || '').toLowerCase().trim() === targetDeptLower;
        const requiredRole = d.type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD';
        return !isTargetDept || newRole !== requiredRole;
      });
      for (const sd of staleDepts) {
        await dynamoDB.update({
          TableName: 'cloudly-departments', Key: { id: sd.id },
          UpdateExpression: 'set manager = :m, managerEmail = :me, updatedAt = :ua',
          ExpressionAttributeValues: { ':m': 'Not assigned', ':me': null, ':ua': new Date().toISOString() }
        }).promise();
        console.log(`🔄 Cleared stale manager on "${sd.name}"`);
      }

      // Save as approved in history
      const requestId = `role_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await dynamoDB.put({
        TableName: 'cloudly-role-requests',
        Item: { requestId, targetEmail, targetName: targetName || targetEmail, newRole, department: department || '', reason: reason || '', proposedBy: req.user.email, proposedByRole: 'SUPER_ADMIN', status: 'APPROVED', approvedBy: req.user.email, approvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      }).promise();

      await logActivity(req.user.userId, req.user.email, 'AUTO_APPROVE_ROLE_CHANGE', targetEmail, { newRole, department });
      console.log(`✅ SUPER_ADMIN auto-approved: ${targetEmail} → ${newRole} in ${department}`);
      return res.status(201).json({ message: `Role changed to ${newRole}`, autoApproved: true, newRole });
    }

    // DEPT_HEAD / UNIT_HEAD: pending approval
    const requestId = `role_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await dynamoDB.put({
      TableName: 'cloudly-role-requests',
      Item: { requestId, targetEmail, targetName: targetName || targetEmail, newRole, department: department || req.user.department, reason: reason || '', proposedBy: req.user.email, proposedByRole: req.user.role, status: 'PENDING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    }).promise();
    await logActivity(req.user.userId, req.user.email, 'PROPOSE_ROLE_CHANGE', targetEmail, { newRole, department });
    res.status(201).json({ message: 'Role change request submitted for approval', roleRequest: { requestId } });
  } catch (err) {
    console.error('Role request error:', err);
    res.status(500).json({ error: 'Failed to process role request: ' + err.message });
  }
});

app.get('/api/role-requests', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise();
    let requests = result.Items || [];
    if (req.user.role === 'DEPT_HEAD') requests = requests.filter(r => r.department === req.user.department);
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ requests, pendingCount: requests.filter(r => r.status === 'PENDING').length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role requests: ' + err.message });
  }
});

app.get('/api/role-requests/pending-count', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise();
    let pending = (result.Items || []).filter(r => r.status === 'PENDING');
    if (req.user.role === 'DEPT_HEAD') pending = pending.filter(r => r.department === req.user.department);
    res.json({ pendingCount: pending.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending count: ' + err.message });
  }
});

app.put('/api/role-requests/:requestId/approve', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await dynamoDB.get({ TableName: 'cloudly-role-requests', Key: { requestId } }).promise();
    if (!result.Item) return res.status(404).json({ error: 'Not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
    const rr = result.Item;
    const listResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${rr.targetEmail}"`, Limit: 1 }).promise();
    if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found' });
    await cognito.adminUpdateUserAttributes({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Username: listResult.Users[0].Username, UserAttributes: [{ Name: 'custom:role', Value: rr.newRole }] }).promise();
    await dynamoDB.update({ TableName: 'cloudly-role-requests', Key: { requestId }, UpdateExpression: 'set #s = :s, approvedBy = :ab, approvedAt = :aa, updatedAt = :ua', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'APPROVED', ':ab': req.user.email, ':aa': new Date().toISOString(), ':ua': new Date().toISOString() } }).promise();
    await logActivity(req.user.userId, req.user.email, 'APPROVE_ROLE_CHANGE', rr.targetEmail, { newRole: rr.newRole });
    res.json({ message: 'Role approved', roleRequest: { ...rr, status: 'APPROVED' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve: ' + err.message });
  }
});

app.put('/api/role-requests/:requestId/reject', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const result = await dynamoDB.get({ TableName: 'cloudly-role-requests', Key: { requestId } }).promise();
    if (!result.Item) return res.status(404).json({ error: 'Not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
    await dynamoDB.update({ TableName: 'cloudly-role-requests', Key: { requestId }, UpdateExpression: 'set #s = :s, rejectedBy = :rb, rejectedAt = :ra, rejectReason = :rr, updatedAt = :ua', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'REJECTED', ':rb': req.user.email, ':ra': new Date().toISOString(), ':rr': reason || '', ':ua': new Date().toISOString() } }).promise();
    await logActivity(req.user.userId, req.user.email, 'REJECT_ROLE_CHANGE', result.Item.targetEmail, { reason });
    res.json({ message: 'Role request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DEPARTMENT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/departments', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    let departments = result.Items || [];
    if (req.user.role !== 'SUPER_ADMIN') {
      const allDepts = [...departments];
      const scoped = await getScopedDepts(req.user, allDepts);
      departments = scoped;
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
      if (!p.Item) return res.status(404).json({ error: 'Parent not found' });
    }
    const departmentId = `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bucketName = `${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
    } catch (e) {
      if (e.code === 'NotFound' || e.code === 'NoSuchBucket') {
        await s3.createBucket({ Bucket: bucketName, ACL: 'private' }).promise();
        await s3.putBucketCors({ Bucket: bucketName, CORSConfiguration: { CORSRules: [{ AllowedHeaders: ['*'], AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'], AllowedOrigins: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3000 }] } }).promise();
      } else throw e;
    }
    const department = { id: departmentId, name, s3Bucket: bucketName, manager: manager || 'Not assigned', managerEmail: managerEmail || null, description: description || '', type: itemType, parentId: parentId || null, status: 'Active', members: 0, membersList: [], projects: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
    if (req.user.role === 'UNIT_HEAD') {
      const dept = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id } }).promise();
      if ((dept.Item?.name || '').toLowerCase() !== (req.user.department || '').toLowerCase()) return res.status(403).json({ error: 'You can only update your own unit' });
    }
    const expr = []; const names = {}; const vals = {};
    if (name) { expr.push('#name = :name'); names['#name'] = 'name'; vals[':name'] = name; }
    if (manager !== undefined) { expr.push('manager = :manager'); vals[':manager'] = manager; }
    if (managerEmail !== undefined) { expr.push('managerEmail = :me'); vals[':me'] = managerEmail; }
    if (description !== undefined) { expr.push('description = :description'); vals[':description'] = description; }
    if (status) { expr.push('#status = :status'); names['#status'] = 'status'; vals[':status'] = status; }
    if (members !== undefined) { expr.push('members = :members'); vals[':members'] = members; }
    if (membersList !== undefined) { expr.push('membersList = :membersList'); vals[':membersList'] = membersList; }
    if (projects !== undefined) { expr.push('projects = :projects'); vals[':projects'] = projects; }
    if (type !== undefined) { expr.push('#type = :type'); names['#type'] = 'type'; vals[':type'] = type; }
    if (parentId !== undefined) { expr.push('parentId = :parentId'); vals[':parentId'] = parentId; }
    expr.push('updatedAt = :updatedAt'); vals[':updatedAt'] = new Date().toISOString();
    const params = { TableName: 'cloudly-departments', Key: { id }, UpdateExpression: 'set ' + expr.join(', '), ExpressionAttributeValues: vals, ReturnValues: 'ALL_NEW' };
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
    const metadata = { userId: req.user.userId, fileId, fileName, originalName, s3Key, s3Bucket, department: req.user.department, userEmail: req.user.email, fileSize: fileSize || 0, fileType: fileType || 'unknown', uploadDate: new Date().toISOString() };
    await dynamoDB.put({ TableName: 'cloudly-files', Item: metadata }).promise();
    await logActivity(req.user.userId, req.user.email, 'UPLOAD_FILE', fileName, { s3Key, fileSize });
    res.status(201).json({ message: 'File metadata saved', file: metadata });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save file metadata: ' + err.message });
  }
});

app.get('/api/files/my-files', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.query({ TableName: 'cloudly-files', KeyConditionExpression: 'userId = :userId', ExpressionAttributeValues: { ':userId': req.user.userId }, ScanIndexForward: false }).promise();
    res.json({ files: result.Items || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files: ' + err.message });
  }
});

// ── OPEN FILE: generate presigned S3 URL ─────────────────────────────────────
app.get('/api/files/open/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    // Fetch file metadata from DynamoDB
    const result = await dynamoDB.query({
      TableName: 'cloudly-files',
      KeyConditionExpression: 'userId = :uid AND fileId = :fid',
      ExpressionAttributeValues: { ':uid': userId, ':fid': fileId }
    }).promise();
    if (!result.Items?.length) return res.status(404).json({ error: 'File not found' });
    const file = result.Items[0];
    // Check access
    const canAccess = req.user.userId === userId ||
      req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'DEPT_HEAD' ||
      req.user.department === file.department;
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    // Generate presigned URL valid 15 minutes
    const url = s3.getSignedUrl('getObject', {
      Bucket: file.s3Bucket,
      Key: file.s3Key,
      Expires: 900
    });
    res.json({ url, fileName: file.originalName || file.fileName, fileType: file.fileType });
  } catch (err) {
    console.error('File open error:', err);
    res.status(500).json({ error: 'Failed to generate file URL: ' + err.message });
  }
});

app.get('/api/files/department/:department', verifyCognitoToken, async (req, res) => {
  try {
    const { department } = req.params;
    const canAccess = req.user.role === 'SUPER_ADMIN' || req.user.department === department || req.user.role === 'DEPT_HEAD';
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    const result = await dynamoDB.scan({ TableName: 'cloudly-files', FilterExpression: 'department = :dept', ExpressionAttributeValues: { ':dept': department } }).promise();
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
    let activities = (result.Items || []).sort((a, b) => b.timestamp - a.timestamp);
    const role = req.user.role || 'MEMBER';
    if (role === 'SUPER_ADMIN') {
      return res.json({ activities: activities.slice(0, 50) });
    }
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = deptResult.Items || [];
    const scopedDepts = await getScopedDepts(req.user, allDepts);
    if (role === 'MEMBER') {
      activities = activities.filter(a => a.userId === req.user.userId || a.email === req.user.email);
    } else {
      const emails = getScopedEmails(req.user, scopedDepts);
      activities = activities.filter(a => emails.has(a.email));
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

    // MEMBER: only own files + own activity
    if (role === 'MEMBER') {
      const [fileResult, actResult] = await Promise.all([
        dynamoDB.query({ TableName: 'cloudly-files', KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': req.user.userId } }).promise(),
        dynamoDB.scan({ TableName: 'cloudly-activities' }).promise()
      ]);
      const files = fileResult.Items || [];
      const acts = (actResult.Items || []).filter(a => a.userId === req.user.userId || a.email === req.user.email).sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
      return res.json({ stats: { scope: 'MEMBER', totalFiles: files.length, storageUsed: files.reduce((s, f) => s + (f.fileSize || 0), 0), department: req.user.department || 'N/A', teamMembers: 0, recentUploads: files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5), recentActivity: acts } });
    }

    // HEAD / ADMIN: scoped
    const [deptResult, fileResult, actResult] = await Promise.all([
      dynamoDB.scan({ TableName: 'cloudly-departments' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-files' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-activities', Limit: 300 }).promise()
    ]);
    const allDepts = deptResult.Items || [];
    const allFiles = fileResult.Items || [];
    const allActs = (actResult.Items || []).sort((a, b) => b.timestamp - a.timestamp);

    const scopedDepts = role === 'SUPER_ADMIN' ? allDepts : await getScopedDepts(req.user, allDepts);
    const scopedEmails = getScopedEmails(req.user, scopedDepts);
    const scopedFiles = role === 'SUPER_ADMIN' ? allFiles : filterFilesByScope(allFiles, scopedDepts, scopedEmails);
    const scopedActs = role === 'SUPER_ADMIN' ? allActs : allActs.filter(a => scopedEmails.has(a.email));

    const scope = role === 'SUPER_ADMIN' ? 'GLOBAL' : role === 'DEPT_HEAD' ? 'DEPARTMENT' : 'UNIT';

    res.json({
      stats: {
        scope,
        totalFiles: scopedFiles.length,
        storageUsed: scopedFiles.reduce((s, f) => s + (f.fileSize || 0), 0),
        department: req.user.department || 'N/A',
        teamMembers: scopedDepts.reduce((s, d) => s + (d.members || 0), 0),
        totalDepartments: scopedDepts.filter(d => !d.type || d.type === 'department').length,
        totalUnits: scopedDepts.filter(d => d.type === 'unit').length,
        recentUploads: scopedFiles.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5),
        recentActivity: scopedActs.slice(0, 8)
      }
    });
  } catch (err) {
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
    const files = fileResult.Items || [];
    const roleRequests = roleReqResult.Items || [];
    const cognitoUsers = cognitoResult.Users || [];
    const roleCounts = { SUPER_ADMIN: 0, DEPT_HEAD: 0, UNIT_HEAD: 0, MEMBER: 0 };
    cognitoUsers.forEach(u => {
      const r = (u.Attributes || []).find(a => a.Name === 'custom:role')?.Value || 'MEMBER';
      if (roleCounts[r] !== undefined) roleCounts[r]++; else roleCounts.MEMBER++;
    });
    const departmentStats = {};
    files.forEach(f => {
      if (f.department) {
        if (!departmentStats[f.department]) departmentStats[f.department] = { fileCount: 0, totalSize: 0 };
        departmentStats[f.department].fileCount++;
        departmentStats[f.department].totalSize += f.fileSize || 0;
      }
    });
    res.json({ stats: { totalDepartments: departments.filter(d => !d.type || d.type === 'department').length, totalUnits: departments.filter(d => d.type === 'unit').length, activeDepartments: departments.filter(d => d.status === 'Active').length, totalFiles: files.length, storageUsed: files.reduce((s, f) => s + (f.fileSize || 0), 0), totalUsers: cognitoUsers.length, roleCounts, pendingRoleRequests: roleRequests.filter(r => r.status === 'PENDING').length, departmentStats } });
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
  console.log('✅ File open endpoint: GET /api/files/open/:userId/:fileId');
  console.log('👤 Avatar endpoints: POST/GET/DELETE /api/users/avatar');
  console.log('🚀 ============================================\n');
});

module.exports = app;