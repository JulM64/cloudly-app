const jwt = require('jsonwebtoken');

// Mock users for development (fallback)
const mockUsers = [
  {
    id: '1',
    email: 'admin@cloudly.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'SUPER_ADMIN',
    department: 'Administration',
    jobTitle: 'System Administrator',
    avatar: ''
  },
  {
    id: '2',
    email: 'user@cloudly.com',
    password: 'user123',
    firstName: 'Regular',
    lastName: 'User',
    role: 'USER',
    department: 'General',
    jobTitle: 'Team Member',
    avatar: ''
  },
  {
    id: '3',
    email: 'manager@cloudly.com',
    password: 'manager123',
    firstName: 'Department',
    lastName: 'Manager',
    role: 'TEAM_MANAGER',
    department: 'Operations',
    jobTitle: 'Department Manager',
    avatar: ''
  }
];

// Get Cognito config from environment
const COGNITO_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID
};

console.log('🔧 Cognito Config:', {
  region: COGNITO_CONFIG.region,
  hasUserPoolId: !!COGNITO_CONFIG.userPoolId,
  hasClientId: !!COGNITO_CONFIG.clientId
});

const AuthController = {
  // Login user (for mock users - development only)
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      // Find user in mock users
      const user = mockUsers.find(u => u.email === email && u.password === password);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      // Create JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          department: user.department
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Prepare user response (remove password)
      const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        roleColor: getRoleColor(user.role),
        initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
      };
      
      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Verify Cognito token
  verifyCognitoToken: async (req, res) => {
    try {
      const { accessToken, idToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Access token is required'
        });
      }
      
      console.log('🔐 Verifying Cognito token...');
      
      // DEVELOPMENT MODE: For now, accept any token
      console.log('⚠️  Development mode: Accepting Cognito token without verification');
      
      // Try to parse token
      let userEmail = 'cognito-user@cloudly.com';
      let userFirstName = 'Cognito';
      let userLastName = 'User';
      let userRole = 'USER';
      let userDepartment = 'General';
      
      try {
        // Try to decode the JWT (without verification for now)
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          userEmail = payload.email || userEmail;
          userFirstName = payload.given_name || userFirstName;
          userLastName = payload.family_name || userLastName;
          userRole = payload['custom:role'] || userRole;
          userDepartment = payload['custom:department'] || userDepartment;
        }
      } catch (e) {
        console.log('Could not parse token, using default user');
      }
      
      // Create user ID from email
      const userId = 'cognito-' + Buffer.from(userEmail).toString('base64').slice(0, 10);
      
      // Create our JWT token
      const ourToken = jwt.sign(
        {
          userId: userId,
          email: userEmail,
          firstName: userFirstName,
          lastName: userLastName,
          role: userRole,
          department: userDepartment,
          isCognitoUser: true
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Prepare user response
      const userResponse = {
        id: userId,
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
        fullName: `${userFirstName} ${userLastName}`,
        role: userRole,
        department: userDepartment,
        roleColor: getRoleColor(userRole),
        initials: `${userFirstName.charAt(0)}${userLastName.charAt(0)}`.toUpperCase(),
        isCognitoUser: true
      };
      
      console.log('✅ Cognito authentication successful for:', userEmail);
      
      res.json({
        success: true,
        message: 'Cognito authentication successful',
        token: ourToken,
        user: userResponse
      });
      
    } catch (error) {
      console.error('❌ Cognito verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Get current user
  getCurrentUser: (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }
      
      // Check if it's a Cognito user
      if (req.user.isCognitoUser) {
        // Cognito user
        const userResponse = {
          id: req.user.userId,
          email: req.user.email,
          firstName: req.user.firstName || req.user.email.split('@')[0],
          lastName: req.user.lastName || 'User',
          fullName: req.user.firstName ? 
            `${req.user.firstName} ${req.user.lastName}` : 
            req.user.email.split('@')[0] + ' User',
          role: req.user.role || 'USER',
          department: req.user.department || 'General',
          roleColor: getRoleColor(req.user.role),
          initials: req.user.firstName ? 
            `${req.user.firstName.charAt(0)}${req.user.lastName.charAt(0)}`.toUpperCase() :
            req.user.email.substring(0, 2).toUpperCase(),
          isCognitoUser: true
        };
        
        return res.json({
          success: true,
          user: userResponse
        });
      } else {
        // Mock user
        const user = mockUsers.find(u => u.id === req.user.userId);
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        
        const userResponse = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role,
          department: user.department,
          jobTitle: user.jobTitle,
          avatar: user.avatar,
          roleColor: getRoleColor(user.role),
          initials: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        };
        
        return res.json({
          success: true,
          user: userResponse
        });
      }
      
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      });
    }
  },
  
  // Test endpoint
  test: (req, res) => {
    res.json({
      success: true,
      message: 'Auth API is working!',
      mode: 'Cognito + Mock Users',
      endpoints: {
        'POST /login': 'Login with mock users',
        'POST /verify-cognito': 'Verify Cognito tokens',
        'GET /me': 'Get current user',
        'GET /test': 'Test endpoint'
      },
      mockUsers: mockUsers.map(u => ({ email: u.email, role: u.role }))
    });
  }
};

// Helper function to get role color
function getRoleColor(role) {
  const colors = {
    SUPER_ADMIN: '#9c27b0',
    DEPARTMENT_ADMIN: '#2196f3',
    TEAM_MANAGER: '#4caf50',
    USER: '#ff9800'
  };
  return colors[role] || '#666';
}

module.exports = AuthController;