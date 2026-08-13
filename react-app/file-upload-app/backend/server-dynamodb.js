// server-dynamodb.js - AWS Cognito + DynamoDB Backend - COMPLETE FIXED VERSION
require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Fail fast if required config is missing, instead of silently misbehaving in prod
const REQUIRED_ENV = ['AWS_REGION', 'COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length) {
  console.error('❌ Missing required environment variables:', missingEnv.join(', '));
  process.exit(1);
}

AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const cognito = new AWS.CognitoIdentityServiceProvider({ region: process.env.AWS_REGION || 'us-east-1' });

// ── SECURITY HEADERS ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"], // 'data:' needed for base64 avatars
      connectSrc: ["'self'"],
    },
  },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Only allow your real frontend origin(s) — set FRONTEND_URL in .env for production
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '8mb' }));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,                 // generous default for normal browsing/API use
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', generalLimiter);

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // tighter limit for account-mutating / admin actions
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please slow down and try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // avatar/file-metadata writes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads, please slow down.' },
});

// Public, unauthenticated endpoint — needs its own strict limit to prevent
// mass fake-organization creation / signup abuse.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts from this network. Please try again later.' },
});

// ── TOKEN VERIFICATION (real JWKS-based verification, not just decode) ────────
const jwksClientInstance = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours
  rateLimit: true,
});

function getSigningKey(header, callback) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyCognitoToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice('Bearer '.length);

  jwt.verify(
    token,
    getSigningKey,
    {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    },
    (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
      }
      const groups = decoded['cognito:groups'] || [];
      const customRole = decoded['custom:role'];
      let role = 'MEMBER';
      if (groups.includes('Administrators')) role = 'SUPER_ADMIN';
      else if (['DEPT_HEAD', 'UNIT_HEAD', 'MEMBER'].includes(customRole)) role = customRole;
      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        groups,
        department: decoded['custom:department'] || '',
        orgId: decoded['custom:orgId'] || '',
        role,
        isAdmin: role === 'SUPER_ADMIN',
        firstName: decoded.given_name || 'User'
      };
      next();
    }
  );
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

// ── Helper: escape values dropped into Cognito Filter strings ────────────────
function escapeCognitoFilter(value) {
  return String(value || '').replace(/"/g, '\\"');
}

// ── ACTIVITY LOGGING ──────────────────────────────────────────────────────────
async function logActivity(userId, email, orgId, action, target, details = {}) {
  try {
    await dynamoDB.put({
      TableName: 'cloudly-activities',
      Item: { userId, timestamp: Date.now(), email, orgId, action, target, details: JSON.stringify(details), createdAt: new Date().toISOString() }
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

// ── Helper: cascade a department rename to Cognito users + file records ──────
// Department membership (Cognito custom:department) and file tagging
// (cloudly-files.department) are both stored as plain name strings, not by
// department ID. Renaming a department therefore has to be pushed out to
// every place that stored the old name, or those places go stale.
async function cascadeDepartmentRename(orgId, oldName, newName) {
  const oldLower = (oldName || '').toLowerCase().trim();
  if (!oldLower || oldLower === (newName || '').toLowerCase().trim()) return { usersUpdated: 0, filesUpdated: 0 };

  // ---- 1. Update every Cognito user whose custom:department matches ----
  let allUsers = [];
  let paginationToken = null;
  let pages = 0;
  do {
    const params = { UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 };
    if (paginationToken) params.PaginationToken = paginationToken;
    const result = await cognito.listUsers(params).promise();
    allUsers = allUsers.concat(result.Users || []);
    paginationToken = result.PaginationToken || null;
    pages++;
  } while (paginationToken && pages < 20);

  const usersToUpdate = allUsers.filter((u) => {
    const attr = (n) => (u.Attributes || []).find((a) => a.Name === n)?.Value || '';
    return attr('custom:orgId') === orgId && attr('custom:department').toLowerCase().trim() === oldLower;
  });

  for (const u of usersToUpdate) {
    try {
      await cognito.adminUpdateUserAttributes({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: u.Username,
        UserAttributes: [{ Name: 'custom:department', Value: newName }],
      }).promise();
    } catch (err) {
      console.error(`Failed to update department on user ${u.Username}:`, err.message);
    }
  }

  // ---- 2. Update every file record tagged with the old department name ----
  let filesUpdated = 0;
  let lastKey;
  do {
    const scanParams = {
      TableName: 'cloudly-files',
      FilterExpression: '#dept = :old AND orgId = :orgId',
      ExpressionAttributeNames: { '#dept': 'department' },
      ExpressionAttributeValues: { ':old': oldName, ':orgId': orgId },
    };
    if (lastKey) scanParams.ExclusiveStartKey = lastKey;
    const scanResult = await dynamoDB.scan(scanParams).promise();
    for (const file of scanResult.Items || []) {
      try {
        await dynamoDB.update({
          TableName: 'cloudly-files',
          Key: { userId: file.userId, fileId: file.fileId },
          UpdateExpression: 'set #dept = :new',
          ExpressionAttributeNames: { '#dept': 'department' },
          ExpressionAttributeValues: { ':new': newName },
        }).promise();
        filesUpdated++;
      } catch (err) {
        console.error(`Failed to update department on file ${file.fileId}:`, err.message);
      }
    }
    lastKey = scanResult.LastEvaluatedKey;
  } while (lastKey);

  return { usersUpdated: usersToUpdate.length, filesUpdated };
}

// ── HEALTH / TEST ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'healthy', timestamp: new Date().toISOString() }));
app.get('/api/test', (req, res) => res.json({ success: true, message: '✅ Backend working!', timestamp: new Date().toISOString() }));

// ══════════════════════════════════════════════════════════════════════════════
// ORGANIZATIONS (multi-tenant signup) — public, unauthenticated endpoint.
// ══════════════════════════════════════════════════════════════════════════════
app.post('/api/organizations/signup', signupLimiter, async (req, res) => {
  const { orgName, adminEmail, adminPassword, firstName, lastName } = req.body;

  if (!orgName?.trim() || !adminEmail?.trim() || !adminPassword || !firstName?.trim() || !lastName?.trim()) {
    return res.status(400).json({ error: 'orgName, adminEmail, adminPassword, firstName, and lastName are all required' });
  }
  if (adminPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await dynamoDB.scan({ TableName: 'cloudly-organizations' }).promise();
    const nameTaken = (existing.Items || []).some(
      (o) => (o.name || '').toLowerCase().trim() === orgName.toLowerCase().trim()
    );
    if (nameTaken) {
      return res.status(409).json({ error: 'An organization with this name already exists. Please choose another name.' });
    }

    const orgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const orgItem = {
      orgId,
      name: orgName.trim(),
      ownerEmail: adminEmail.trim().toLowerCase(),
      plan: 'free',
      createdAt: new Date().toISOString(),
    };
    await dynamoDB.put({ TableName: 'cloudly-organizations', Item: orgItem }).promise();

    try {
      await cognito.signUp({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: adminEmail.trim(),
        Password: adminPassword,
        UserAttributes: [
          { Name: 'email', Value: adminEmail.trim() },
          { Name: 'given_name', Value: firstName.trim() },
          { Name: 'family_name', Value: lastName.trim() },
          { Name: 'custom:orgId', Value: orgId },
          { Name: 'custom:role', Value: 'SUPER_ADMIN' },
        ],
      }).promise();
    } catch (cognitoErr) {
      await dynamoDB.delete({ TableName: 'cloudly-organizations', Key: { orgId } }).promise().catch(() => {});
      const msg = cognitoErr.code === 'UsernameExistsException'
        ? 'An account with this email already exists.'
        : (cognitoErr.message || 'Failed to create admin account');
      return res.status(400).json({ error: msg });
    }

    res.json({
      message: 'Organization created! Please check your email for a verification code.',
      orgId,
      orgName: orgItem.name,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create organization: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/users', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 60);
    const listParams = { UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: limit };
    if (req.query.lastKey) listParams.PaginationToken = decodeURIComponent(req.query.lastKey);
    const result = await cognito.listUsers(listParams).promise();

    let avatarMap = {};
    try {
      const profilesResult = await dynamoDB.scan({ TableName: 'cloudly-user-profiles' }).promise();
      (profilesResult.Items || []).forEach(p => {
        if (p.userId) avatarMap[p.userId] = p.avatarBase64;
      });
    } catch (e) {
      console.warn('Could not fetch avatar profiles:', e.message);
    }

    const users = (result.Users || [])
      .map(u => {
        const attr = n => (u.Attributes || []).find(a => a.Name === n)?.Value || '';
        const userId = attr('sub');
        return {
          userId,
          email: attr('email'),
          name: `${attr('given_name')} ${attr('family_name')}`.trim() || attr('email'),
          department: attr('custom:department'),
          orgId: attr('custom:orgId'),
          role: attr('custom:role') || 'MEMBER',
          status: u.UserStatus,
          username: u.Username,
          avatarBase64: avatarMap[userId] || null
        };
      })
      .filter(u => u.orgId === req.user.orgId);
    res.json({
      users,
      lastKey: result.PaginationToken ? encodeURIComponent(result.PaginationToken) : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

app.get('/api/users/team', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
    const scopedDepts = await getScopedDepts(req.user, allDepts);
    const scopedDeptNames = new Set(scopedDepts.map(d => (d.name || '').toLowerCase().trim()));

    let allUsers = [];
    let paginationToken = null;
    let pages = 0;
    do {
      const params = { UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 };
      if (paginationToken) params.PaginationToken = paginationToken;
      const result = await cognito.listUsers(params).promise();
      allUsers = allUsers.concat(result.Users || []);
      paginationToken = result.PaginationToken || null;
      pages++;
    } while (paginationToken && pages < 10);

    let avatarMap = {};
    try {
      const profilesResult = await dynamoDB.scan({ TableName: 'cloudly-user-profiles' }).promise();
      (profilesResult.Items || []).forEach(p => { if (p.userId) avatarMap[p.userId] = p.avatarBase64; });
    } catch (e) { /* non-fatal */ }

    const users = allUsers
      .map(u => {
        const attr = n => (u.Attributes || []).find(a => a.Name === n)?.Value || '';
        const userId = attr('sub');
        return {
          userId,
          email: attr('email'),
          name: `${attr('given_name')} ${attr('family_name')}`.trim() || attr('email'),
          department: attr('custom:department'),
          orgId: attr('custom:orgId'),
          role: attr('custom:role') || 'MEMBER',
          status: u.UserStatus,
          username: u.Username,
          avatarBase64: avatarMap[userId] || null
        };
      })
      .filter(u => u.orgId === req.user.orgId)
      .filter(u => req.user.role === 'SUPER_ADMIN' || scopedDeptNames.has((u.department || '').toLowerCase().trim()));

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team users: ' + err.message });
  }
});

app.put('/api/users/:email/department', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { department } = req.body;
    const listResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${escapeCognitoFilter(email)}"`, Limit: 1 }).promise();
    if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found' });
    const targetUser = listResult.Users[0];
    const targetOrgId = (targetUser.Attributes || []).find(a => a.Name === 'custom:orgId')?.Value;
    if (targetOrgId !== req.user.orgId) return res.status(404).json({ error: 'User not found' });
    await cognito.adminUpdateUserAttributes({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: targetUser.Username,
      UserAttributes: [{ Name: 'custom:department', Value: department }]
    }).promise();

    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
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
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'UPDATE_USER_DEPARTMENT', email, { department });
    res.json({ message: 'User department updated', email, department });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department: ' + err.message });
  }
});

app.post('/api/users/create', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
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
        { Name: 'custom:orgId', Value: req.user.orgId },
      ]
    }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'CREATE_USER', email, { department, role });
    res.status(201).json({ message: 'User created successfully', email, tempPassword, firstName, lastName, department, role: role || 'MEMBER' });
  } catch (err) {
    if (err.code === 'UsernameExistsException') return res.status(409).json({ error: 'A user with this email already exists' });
    res.status(500).json({ error: 'Failed to create user: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AVATAR ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/users/avatar', uploadLimiter, verifyCognitoToken, async (req, res) => {
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
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'UPDATE_AVATAR', req.user.email, {});
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

app.delete('/api/users/avatar', uploadLimiter, verifyCognitoToken, async (req, res) => {
  try {
    await dynamoDB.delete({
      TableName: 'cloudly-user-profiles',
      Key: { userId: req.user.userId }
    }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'REMOVE_AVATAR', req.user.email, {});
    res.json({ message: 'Avatar removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove avatar: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ROLE REQUEST ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/role-requests', sensitiveLimiter, verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { targetEmail, targetName, newRole, department, reason } = req.body;
    if (!targetEmail || !newRole) return res.status(400).json({ error: 'targetEmail and newRole required' });
    if (!['MEMBER', 'UNIT_HEAD', 'DEPT_HEAD'].includes(newRole)) return res.status(400).json({ error: 'Invalid role' });
    if (req.user.role === 'DEPT_HEAD' && newRole === 'DEPT_HEAD') return res.status(403).json({ error: 'Only SUPER_ADMIN can assign DEPT_HEAD' });

    if (req.user.role === 'SUPER_ADMIN') {
      const listResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${escapeCognitoFilter(targetEmail)}"`, Limit: 1 }).promise();
      if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found in Cognito' });
      const targetOrgId = (listResult.Users[0].Attributes || []).find(a => a.Name === 'custom:orgId')?.Value;
      if (targetOrgId !== req.user.orgId) return res.status(404).json({ error: 'User not found in Cognito' });

      await cognito.adminUpdateUserAttributes({
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: listResult.Users[0].Username,
        UserAttributes: [{ Name: 'custom:role', Value: newRole }]
      }).promise();

      if (department) {
        await cognito.adminUpdateUserAttributes({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: listResult.Users[0].Username,
          UserAttributes: [{ Name: 'custom:department', Value: department }]
        }).promise();
      }

      const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
      const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
      const targetDeptLower = (department || '').toLowerCase().trim();

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

      const requestId = `role_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await dynamoDB.put({
        TableName: 'cloudly-role-requests',
        Item: { requestId, orgId: req.user.orgId, targetEmail, targetName: targetName || targetEmail, newRole, department: department || '', reason: reason || '', proposedBy: req.user.email, proposedByRole: 'SUPER_ADMIN', status: 'APPROVED', approvedBy: req.user.email, approvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      }).promise();

      await logActivity(req.user.userId, req.user.email, req.user.orgId, 'AUTO_APPROVE_ROLE_CHANGE', targetEmail, { newRole, department });
      console.log(`✅ SUPER_ADMIN auto-approved: ${targetEmail} → ${newRole} in ${department}`);
      return res.status(201).json({ message: `Role changed to ${newRole}`, autoApproved: true, newRole });
    }

    const targetListResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${escapeCognitoFilter(targetEmail)}"`, Limit: 1 }).promise();
    if (!targetListResult.Users?.length) return res.status(404).json({ error: 'User not found in Cognito' });
    const pendingTargetOrgId = (targetListResult.Users[0].Attributes || []).find(a => a.Name === 'custom:orgId')?.Value;
    if (pendingTargetOrgId !== req.user.orgId) return res.status(404).json({ error: 'User not found in Cognito' });

    const requestId = `role_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await dynamoDB.put({
      TableName: 'cloudly-role-requests',
      Item: { requestId, orgId: req.user.orgId, targetEmail, targetName: targetName || targetEmail, newRole, department: department || req.user.department, reason: reason || '', proposedBy: req.user.email, proposedByRole: req.user.role, status: 'PENDING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'PROPOSE_ROLE_CHANGE', targetEmail, { newRole, department });
    res.status(201).json({ message: 'Role change request submitted for approval', roleRequest: { requestId } });
  } catch (err) {
    console.error('Role request error:', err);
    res.status(500).json({ error: 'Failed to process role request: ' + err.message });
  }
});

app.get('/api/role-requests', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise();
    let requests = (result.Items || []).filter((r) => r.orgId === req.user.orgId);
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
    let pending = (result.Items || []).filter(r => r.status === 'PENDING' && r.orgId === req.user.orgId);
    if (req.user.role === 'DEPT_HEAD') pending = pending.filter(r => r.department === req.user.department);
    res.json({ pendingCount: pending.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get pending count: ' + err.message });
  }
});

app.put('/api/role-requests/:requestId/approve', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await dynamoDB.get({ TableName: 'cloudly-role-requests', Key: { requestId } }).promise();
    if (!result.Item || result.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
    const rr = result.Item;
    const listResult = await cognito.listUsers({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Filter: `email = "${escapeCognitoFilter(rr.targetEmail)}"`, Limit: 1 }).promise();
    if (!listResult.Users?.length) return res.status(404).json({ error: 'User not found' });
    await cognito.adminUpdateUserAttributes({ UserPoolId: process.env.COGNITO_USER_POOL_ID, Username: listResult.Users[0].Username, UserAttributes: [{ Name: 'custom:role', Value: rr.newRole }] }).promise();
    await dynamoDB.update({ TableName: 'cloudly-role-requests', Key: { requestId }, UpdateExpression: 'set #s = :s, approvedBy = :ab, approvedAt = :aa, updatedAt = :ua', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'APPROVED', ':ab': req.user.email, ':aa': new Date().toISOString(), ':ua': new Date().toISOString() } }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'APPROVE_ROLE_CHANGE', rr.targetEmail, { newRole: rr.newRole });
    res.json({ message: 'Role approved', roleRequest: { ...rr, status: 'APPROVED' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve: ' + err.message });
  }
});

app.put('/api/role-requests/:requestId/reject', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const result = await dynamoDB.get({ TableName: 'cloudly-role-requests', Key: { requestId } }).promise();
    if (!result.Item || result.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
    await dynamoDB.update({ TableName: 'cloudly-role-requests', Key: { requestId }, UpdateExpression: 'set #s = :s, rejectedBy = :rb, rejectedAt = :ra, rejectReason = :rr, updatedAt = :ua', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'REJECTED', ':rb': req.user.email, ':ra': new Date().toISOString(), ':rr': reason || '', ':ua': new Date().toISOString() } }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'REJECT_ROLE_CHANGE', result.Item.targetEmail, { reason });
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
    let departments = (result.Items || []).filter((d) => d.orgId === req.user.orgId);
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
    const all = (result.Items || []).filter((d) => d.orgId === req.user.orgId);
    const topLevel = all.filter(d => !d.parentId);
    const buildTree = pid => all.filter(d => d.parentId === pid).map(d => ({ ...d, children: buildTree(d.id) }));
    res.json({ hierarchy: topLevel.map(d => ({ ...d, children: buildTree(d.id) })), allDepartments: all });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hierarchy: ' + err.message });
  }
});

app.post('/api/departments', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { name, manager, managerEmail, description, type, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const itemType = type || 'department';
    if (itemType === 'unit' && !parentId) return res.status(400).json({ error: 'Units must have a parent department' });
    if (parentId) {
      const p = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id: parentId } }).promise();
      if (!p.Item || p.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Parent not found' });
    }
    const departmentId = `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const orgSlug = (req.user.orgId || 'org').replace(/[^a-z0-9-]/gi, '').toLowerCase().slice(-12);
    const bucketName = `${process.env.S3_BUCKET_PREFIX || 'cloudly-dept'}-${orgSlug}-${name.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`.slice(0, 63);
    try {
      await s3.headBucket({ Bucket: bucketName }).promise();
    } catch (e) {
      if (e.code === 'NotFound' || e.code === 'NoSuchBucket') {
        await s3.createBucket({ Bucket: bucketName, ACL: 'private' }).promise();
        await s3.putPublicAccessBlock({
          Bucket: bucketName,
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
            BlockPublicPolicy: true,
            RestrictPublicBuckets: true,
          },
        }).promise();
        await s3.putBucketEncryption({
          Bucket: bucketName,
          ServerSideEncryptionConfiguration: {
            Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
          },
        }).promise();
        await s3.putBucketCors({ Bucket: bucketName, CORSConfiguration: { CORSRules: [{ AllowedHeaders: ['*'], AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'], AllowedOrigins: allowedOrigins, ExposeHeaders: ['ETag'], MaxAgeSeconds: 3000 }] } }).promise();
      } else throw e;
    }
    const department = { id: departmentId, orgId: req.user.orgId, name, s3Bucket: bucketName, manager: manager || 'Not assigned', managerEmail: managerEmail || null, description: description || '', type: itemType, parentId: parentId || null, status: 'Active', members: 0, membersList: [], projects: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await dynamoDB.put({ TableName: 'cloudly-departments', Item: department }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'CREATE_' + itemType.toUpperCase(), name, { bucketName });
    res.status(201).json({ message: `${itemType} created`, department });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create', details: err.code });
  }
});

// Updates a department/unit. If `name` changes, cascades the rename to every
// Cognito user's custom:department and every file record that referenced
// the old name (see cascadeDepartmentRename above) so the Admin Panel and
// any affected user's own department field don't go stale.
app.put('/api/departments/:id', sensitiveLimiter, verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, manager, managerEmail, description, status, members, membersList, projects, type, parentId } = req.body;
    const existing = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id } }).promise();
    if (!existing.Item || existing.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
    if (req.user.role === 'UNIT_HEAD') {
      if ((existing.Item?.name || '').toLowerCase() !== (req.user.department || '').toLowerCase()) return res.status(403).json({ error: 'You can only update your own unit' });
    }

    const oldName = existing.Item.name;

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

    // Cascade the rename to Cognito users + file records if the name changed
    let cascade = { usersUpdated: 0, filesUpdated: 0 };
    if (name && name !== oldName) {
      cascade = await cascadeDepartmentRename(req.user.orgId, oldName, name);
      await logActivity(req.user.userId, req.user.email, req.user.orgId, 'RENAME_DEPARTMENT', name, { oldName, ...cascade });
    }

    res.json({ message: 'Department updated', department: result.Attributes, cascade });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update: ' + err.message });
  }
});

app.delete('/api/departments/:id', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const existing = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id: req.params.id } }).promise();
    if (!existing.Item || existing.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
    await dynamoDB.delete({ TableName: 'cloudly-departments', Key: { id: req.params.id } }).promise();
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete: ' + err.message });
  }
});

// Force-resyncs every member of a department + every one of their files to
// the department's CURRENT name. Unlike cascadeDepartmentRename above (which
// only migrates users from one specific old name to a new one), this doesn't
// diff anything — it just asserts "these people belong to this department,
// their records should say so," which fixes drift no matter how it happened
// (multiple renames before the cascade fix existed, members added without
// ever calling updateUserDepartment, etc.). Safe to call repeatedly — it
// skips anyone/anything already correct.
app.post('/api/departments/:id/resync-members', sensitiveLimiter, verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await dynamoDB.get({ TableName: 'cloudly-departments', Key: { id } }).promise();
    if (!dept.Item || dept.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
    if (req.user.role === 'UNIT_HEAD' && (dept.Item.name || '').toLowerCase() !== (req.user.department || '').toLowerCase()) {
      return res.status(403).json({ error: 'You can only resync your own unit' });
    }

    const currentName = dept.Item.name;
    const memberEmails = (Array.isArray(dept.Item.membersList) ? dept.Item.membersList : []).map((m) => m.email).filter(Boolean);

    if (memberEmails.length === 0) {
      return res.json({ message: 'No members on this department to resync.', usersUpdated: 0, filesUpdated: 0 });
    }

    // ---- 1. Force-set custom:department for every listed member ----
    let usersUpdated = 0;
    for (const email of memberEmails) {
      try {
        const listResult = await cognito.listUsers({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Filter: `email = "${escapeCognitoFilter(email)}"`,
          Limit: 1,
        }).promise();
        const cognitoUser = listResult.Users?.[0];
        if (!cognitoUser) continue;
        const currentAttr = (cognitoUser.Attributes || []).find((a) => a.Name === 'custom:department')?.Value || '';
        if (currentAttr === currentName) continue; // already correct, skip the write
        await cognito.adminUpdateUserAttributes({
          UserPoolId: process.env.COGNITO_USER_POOL_ID,
          Username: cognitoUser.Username,
          UserAttributes: [{ Name: 'custom:department', Value: currentName }],
        }).promise();
        usersUpdated++;
      } catch (err) {
        console.error(`Resync: failed to update ${email}:`, err.message);
      }
    }

    // ---- 2. Force-set department on every file owned by those members ----
    let filesUpdated = 0;
    const emailSet = new Set(memberEmails);
    let lastKey;
    do {
      const scanParams = {
        TableName: 'cloudly-files',
        FilterExpression: 'orgId = :orgId',
        ExpressionAttributeValues: { ':orgId': req.user.orgId },
      };
      if (lastKey) scanParams.ExclusiveStartKey = lastKey;
      const scanResult = await dynamoDB.scan(scanParams).promise();
      for (const file of scanResult.Items || []) {
        if (!emailSet.has(file.userEmail) || file.department === currentName) continue;
        try {
          await dynamoDB.update({
            TableName: 'cloudly-files',
            Key: { userId: file.userId, fileId: file.fileId },
            UpdateExpression: 'set #dept = :new',
            ExpressionAttributeNames: { '#dept': 'department' },
            ExpressionAttributeValues: { ':new': currentName },
          }).promise();
          filesUpdated++;
        } catch (err) {
          console.error(`Resync: failed to update file ${file.fileId}:`, err.message);
        }
      }
      lastKey = scanResult.LastEvaluatedKey;
    } while (lastKey);

    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'RESYNC_DEPARTMENT_MEMBERS', currentName, { usersUpdated, filesUpdated });

    res.json({ message: `Resynced ${usersUpdated} user(s) and ${filesUpdated} file(s) to "${currentName}".`, usersUpdated, filesUpdated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resync department: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FILE ROUTES
// ══════════════════════════════════════════════════════════════════════════════

const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip',
];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

app.post('/api/files/upload-url', uploadLimiter, verifyCognitoToken, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) return res.status(400).json({ error: 'fileName and fileType required' });
    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(fileType)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
    const myDept = allDepts.find(d => (d.name || '').toLowerCase().trim() === (req.user.department || '').toLowerCase().trim());
    if (!myDept?.s3Bucket) return res.status(400).json({ error: 'No department bucket found for your account' });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${req.user.userId}/${Date.now()}_${safeName}`;

    const presigned = await new Promise((resolve, reject) => {
      s3.createPresignedPost({
        Bucket: myDept.s3Bucket,
        Fields: { key, 'Content-Type': fileType },
        Conditions: [
          ['content-length-range', 0, MAX_UPLOAD_BYTES],
          ['eq', '$Content-Type', fileType],
          ['eq', '$key', key],
        ],
        Expires: 300,
      }, (err, data) => err ? reject(err) : resolve(data));
    });

    res.json({ ...presigned, bucket: myDept.s3Bucket, key });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate upload URL: ' + err.message });
  }
});

app.post('/api/files/metadata', verifyCognitoToken, async (req, res) => {
  try {
    const { fileName, originalName, s3Key, s3Bucket, fileSize, fileType } = req.body;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata = { userId: req.user.userId, fileId, fileName, originalName, s3Key, s3Bucket, department: req.user.department, orgId: req.user.orgId, userEmail: req.user.email, fileSize: fileSize || 0, fileType: fileType || 'unknown', uploadDate: new Date().toISOString() };
    await dynamoDB.put({ TableName: 'cloudly-files', Item: metadata }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'UPLOAD_FILE', fileName, { s3Key, fileSize });
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

app.get('/api/files/open/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    const result = await dynamoDB.query({
      TableName: 'cloudly-files',
      KeyConditionExpression: 'userId = :uid AND fileId = :fid',
      ExpressionAttributeValues: { ':uid': userId, ':fid': fileId }
    }).promise();
    if (!result.Items?.length) return res.status(404).json({ error: 'File not found' });
    const file = result.Items[0];
    if (file.orgId !== req.user.orgId) return res.status(404).json({ error: 'File not found' });
    const canAccess = req.user.userId === userId ||
      req.user.role === 'SUPER_ADMIN' ||
      req.user.role === 'DEPT_HEAD' ||
      req.user.department === file.department;
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });
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

app.get('/api/files/team', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
    const scopedDepts = req.user.role === 'SUPER_ADMIN' ? allDepts : await getScopedDepts(req.user, allDepts);
    const scopedEmails = getScopedEmails(req.user, scopedDepts);

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const params = { TableName: 'cloudly-files', Limit: limit };
    if (req.query.lastKey) {
      try { params.ExclusiveStartKey = JSON.parse(decodeURIComponent(req.query.lastKey)); }
      catch { return res.status(400).json({ error: 'Invalid lastKey' }); }
    }
    const result = await dynamoDB.scan(params).promise();
    const orgFiles = (result.Items || []).filter((f) => f.orgId === req.user.orgId);
    const scopedFiles = req.user.role === 'SUPER_ADMIN'
      ? orgFiles
      : filterFilesByScope(orgFiles, scopedDepts, scopedEmails);

    res.json({
      files: scopedFiles,
      lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch team files: ' + err.message });
  }
});

app.get('/api/files/department/:department', verifyCognitoToken, async (req, res) => {
  try {
    const { department } = req.params;
    const canAccess = req.user.role === 'SUPER_ADMIN' || req.user.department === department || req.user.role === 'DEPT_HEAD';
    if (!canAccess) return res.status(403).json({ error: 'Access denied' });
    const result = await dynamoDB.scan({
      TableName: 'cloudly-files',
      FilterExpression: 'department = :dept AND orgId = :orgId',
      ExpressionAttributeValues: { ':dept': department, ':orgId': req.user.orgId }
    }).promise();
    res.json({ files: result.Items || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch department files: ' + err.message });
  }
});

app.get('/api/files/all', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const params = {
      TableName: 'cloudly-files',
      Limit: limit,
      FilterExpression: 'orgId = :orgId',
      ExpressionAttributeValues: { ':orgId': req.user.orgId },
    };
    if (req.query.lastKey) {
      try { params.ExclusiveStartKey = JSON.parse(decodeURIComponent(req.query.lastKey)); }
      catch { return res.status(400).json({ error: 'Invalid lastKey' }); }
    }
    const result = await dynamoDB.scan(params).promise();
    res.json({
      files: result.Items || [],
      lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all files: ' + err.message });
  }
});

app.delete('/api/files/metadata/:userId/:fileId', verifyCognitoToken, async (req, res) => {
  try {
    const { userId, fileId } = req.params;
    if (userId !== req.user.userId && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized' });
    const existing = await dynamoDB.get({ TableName: 'cloudly-files', Key: { userId, fileId } }).promise();
    if (!existing.Item || existing.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'File not found' });
    await dynamoDB.delete({ TableName: 'cloudly-files', Key: { userId, fileId } }).promise();
    res.json({ message: 'File metadata deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// FILE DELETE REQUESTS (Dept/Unit Heads submit with a reason; Super Admin approves)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/api/file-delete-requests', sensitiveLimiter, verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const { userId, fileId, reason } = req.body;
    if (!userId || !fileId) return res.status(400).json({ error: 'userId and fileId required' });
    if (!reason || !reason.trim()) return res.status(400).json({ error: 'A reason (motif) is required to request removal' });

    const fileResult = await dynamoDB.get({ TableName: 'cloudly-files', Key: { userId, fileId } }).promise();
    if (!fileResult.Item || fileResult.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'File not found' });
    const file = fileResult.Item;

    if (req.user.role !== 'SUPER_ADMIN') {
      const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
      const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
      const scopedDepts = await getScopedDepts(req.user, allDepts);
      const scopedEmails = getScopedEmails(req.user, scopedDepts);
      const inScope = filterFilesByScope([file], scopedDepts, scopedEmails).length > 0;
      if (!inScope) return res.status(403).json({ error: 'This file is outside your department/unit scope' });
    }

    const requestId = `delreq_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const item = {
      requestId,
      orgId: req.user.orgId,
      fileId,
      fileUserId: userId,
      fileName: file.originalName || file.fileName,
      fileOwnerEmail: file.userEmail || '',
      department: file.department || req.user.department || '',
      reason: reason.trim(),
      requestedBy: req.user.email,
      requestedByRole: req.user.role,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    await dynamoDB.put({ TableName: 'cloudly-file-delete-requests', Item: item }).promise();
    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'REQUEST_FILE_DELETE', item.fileName, { reason: item.reason });
    res.json({ message: 'Removal request submitted for admin approval', request: item });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit removal request: ' + err.message });
  }
});

app.get('/api/file-delete-requests/mine', verifyCognitoToken, requireHeadOrAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-file-delete-requests' }).promise();
    const mine = (result.Items || [])
      .filter(r => r.orgId === req.user.orgId && r.requestedBy === req.user.email)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ requests: mine });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your removal requests: ' + err.message });
  }
});

app.get('/api/file-delete-requests', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-file-delete-requests' }).promise();
    const requests = (result.Items || []).filter((r) => r.orgId === req.user.orgId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch removal requests: ' + err.message });
  }
});

app.get('/api/file-delete-requests/pending-count', verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-file-delete-requests' }).promise();
    const pendingCount = (result.Items || []).filter(r => r.status === 'PENDING' && r.orgId === req.user.orgId).length;
    res.json({ pendingCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending count: ' + err.message });
  }
});

app.put('/api/file-delete-requests/:requestId/approve', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const result = await dynamoDB.get({ TableName: 'cloudly-file-delete-requests', Key: { requestId } }).promise();
    if (!result.Item || result.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Request not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });
    const reqItem = result.Item;

    await dynamoDB.delete({ TableName: 'cloudly-files', Key: { userId: reqItem.fileUserId, fileId: reqItem.fileId } }).promise();

    await dynamoDB.update({
      TableName: 'cloudly-file-delete-requests',
      Key: { requestId },
      UpdateExpression: 'set #s = :s, resolvedBy = :rb, resolvedAt = :ra',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'APPROVED', ':rb': req.user.email, ':ra': new Date().toISOString() }
    }).promise();

    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'APPROVE_FILE_DELETE', reqItem.fileName, { requestedBy: reqItem.requestedBy, reason: reqItem.reason });
    res.json({ message: 'Removal approved — file deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve removal: ' + err.message });
  }
});

app.put('/api/file-delete-requests/:requestId/reject', sensitiveLimiter, verifyCognitoToken, requireAdmin, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const result = await dynamoDB.get({ TableName: 'cloudly-file-delete-requests', Key: { requestId } }).promise();
    if (!result.Item || result.Item.orgId !== req.user.orgId) return res.status(404).json({ error: 'Request not found' });
    if (result.Item.status !== 'PENDING') return res.status(400).json({ error: 'Already processed' });

    await dynamoDB.update({
      TableName: 'cloudly-file-delete-requests',
      Key: { requestId },
      UpdateExpression: 'set #s = :s, resolvedBy = :rb, resolvedAt = :ra, rejectReason = :rr',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':s': 'REJECTED', ':rb': req.user.email, ':ra': new Date().toISOString(), ':rr': reason || '' }
    }).promise();

    await logActivity(req.user.userId, req.user.email, req.user.orgId, 'REJECT_FILE_DELETE', result.Item.fileName, { requestedBy: result.Item.requestedBy });
    res.json({ message: 'Removal request rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject removal: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.get('/api/activities', verifyCognitoToken, async (req, res) => {
  try {
    const result = await dynamoDB.scan({ TableName: 'cloudly-activities', Limit: 200 }).promise();
    let activities = (result.Items || []).filter((a) => a.orgId === req.user.orgId).sort((a, b) => b.timestamp - a.timestamp);
    const role = req.user.role || 'MEMBER';
    if (role === 'SUPER_ADMIN') {
      return res.json({ activities: activities.slice(0, 50) });
    }
    const deptResult = await dynamoDB.scan({ TableName: 'cloudly-departments' }).promise();
    const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
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

    if (role === 'MEMBER') {
      const [fileResult, actResult] = await Promise.all([
        dynamoDB.query({ TableName: 'cloudly-files', KeyConditionExpression: 'userId = :uid', ExpressionAttributeValues: { ':uid': req.user.userId } }).promise(),
        dynamoDB.scan({ TableName: 'cloudly-activities' }).promise()
      ]);
      const files = fileResult.Items || [];
      const acts = (actResult.Items || []).filter(a => a.orgId === req.user.orgId && (a.userId === req.user.userId || a.email === req.user.email)).sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
      return res.json({ stats: { scope: 'MEMBER', totalFiles: files.length, storageUsed: files.reduce((s, f) => s + (f.fileSize || 0), 0), department: req.user.department || 'N/A', teamMembers: 0, recentUploads: files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5), recentActivity: acts } });
    }

    const [deptResult, fileResult, actResult] = await Promise.all([
      dynamoDB.scan({ TableName: 'cloudly-departments' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-files' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-activities', Limit: 300 }).promise()
    ]);
    const allDepts = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
    const allFiles = (fileResult.Items || []).filter((f) => f.orgId === req.user.orgId);
    const allActs = (actResult.Items || []).filter((a) => a.orgId === req.user.orgId).sort((a, b) => b.timestamp - a.timestamp);

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
    let allCognitoUsers = [];
    let paginationToken = null;
    let pages = 0;
    do {
      const params = { UserPoolId: process.env.COGNITO_USER_POOL_ID, Limit: 60 };
      if (paginationToken) params.PaginationToken = paginationToken;
      const result = await cognito.listUsers(params).promise().catch(() => ({ Users: [] }));
      allCognitoUsers = allCognitoUsers.concat(result.Users || []);
      paginationToken = result.PaginationToken || null;
      pages++;
    } while (paginationToken && pages < 10);

    const [deptResult, fileResult, roleReqResult] = await Promise.all([
      dynamoDB.scan({ TableName: 'cloudly-departments' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-files' }).promise(),
      dynamoDB.scan({ TableName: 'cloudly-role-requests' }).promise().catch(() => ({ Items: [] })),
    ]);
    const departments = (deptResult.Items || []).filter((d) => d.orgId === req.user.orgId);
    const files = (fileResult.Items || []).filter((f) => f.orgId === req.user.orgId);
    const roleRequests = (roleReqResult.Items || []).filter((r) => r.orgId === req.user.orgId);
    const cognitoUsers = allCognitoUsers.filter(
      (u) => (u.Attributes || []).find((a) => a.Name === 'custom:orgId')?.Value === req.user.orgId
    );

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