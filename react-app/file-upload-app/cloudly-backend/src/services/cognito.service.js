const { CognitoIdentityProviderClient, 
        AdminInitiateAuthCommand,
        AdminGetUserCommand,
        AdminCreateUserCommand,
        AdminSetUserPasswordCommand,
        AdminAddUserToGroupCommand,
        ListUsersCommand,
        ListGroupsCommand } = require('@aws-sdk/client-cognito-identity-provider');

class CognitoService {
  constructor() {
    this.client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.clientId = process.env.COGNITO_CLIENT_ID;
  }

  // Login user - UPDATED for no client secret
  async login(email, password) {
    try {
      const command = new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
          // No SECRET_HASH needed since no client secret
        }
      });

      const response = await this.client.send(command);
      
      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn
      };
    } catch (error) {
      console.error('Cognito login error:', error);
      
      // User-friendly error messages
      let errorMessage = 'Login failed';
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Incorrect email or password';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'User not found';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please confirm your email first';
      }
      
      return {
        success: false,
        error: errorMessage,
        code: error.name
      };
    }
  }

  // Get user info - NO CHANGES needed
  async getUser(email) {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      });

      const response = await this.client.send(command);
      
      // Extract user attributes
      const user = {
        username: response.Username,
        email: response.UserAttributes.find(attr => attr.Name === 'email')?.Value,
        emailVerified: response.UserAttributes.find(attr => attr.Name === 'email_verified')?.Value === 'true',
        status: response.UserStatus,
        enabled: response.Enabled,
        createdAt: response.UserCreateDate,
        lastModified: response.UserLastModifiedDate
      };

      return { success: true, user };
    } catch (error) {
      console.error('Cognito get user error:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.name
      };
    }
  }

  // Create user - UPDATED for no client secret
  async createUser(email, password, userAttributes = {}) {
    try {
      // Prepare attributes
      const attributes = [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' }
      ];
      
      // Add custom attributes if provided
      if (userAttributes.firstName) {
        attributes.push({ Name: 'given_name', Value: userAttributes.firstName });
      }
      if (userAttributes.lastName) {
        attributes.push({ Name: 'family_name', Value: userAttributes.lastName });
      }

      // Create user
      const createCommand = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        TemporaryPassword: password,
        MessageAction: 'SUPPRESS', // Don't send welcome email
        UserAttributes: attributes,
        DesiredDeliveryMediums: ['EMAIL']
      });

      const createResponse = await this.client.send(createCommand);

      // Set permanent password
      const passwordCommand = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: true
      });

      await this.client.send(passwordCommand);

      return {
        success: true,
        message: 'User created successfully',
        user: {
          username: createResponse.User.Username,
          email: email
        }
      };
    } catch (error) {
      console.error('Cognito create user error:', error);
      
      let errorMessage = 'Failed to create user';
      if (error.name === 'UsernameExistsException') {
        errorMessage = 'User already exists';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password does not meet requirements';
      }
      
      return {
        success: false,
        error: errorMessage,
        code: error.name,
        details: error.message
      };
    }
  }

  // Add user to group - NO CHANGES needed
  async addUserToGroup(email, groupName) {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: groupName
      });

      await this.client.send(command);
      return { 
        success: true,
        message: `User added to ${groupName} group`
      };
    } catch (error) {
      console.error('Cognito add user to group error:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.name
      };
    }
  }

  // List all users - NO CHANGES needed
  async listUsers() {
    try {
      const command = new ListUsersCommand({
        UserPoolId: this.userPoolId
      });

      const response = await this.client.send(command);
      
      const users = response.Users.map(user => ({
        username: user.Username,
        email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
        status: user.UserStatus,
        enabled: user.Enabled,
        createdAt: user.UserCreateDate,
        lastModified: user.UserLastModifiedDate
      }));

      return { success: true, users };
    } catch (error) {
      console.error('Cognito list users error:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.name
      };
    }
  }

  // List groups - NO CHANGES needed
  async listGroups() {
    try {
      const command = new ListGroupsCommand({
        UserPoolId: this.userPoolId
      });

      const response = await this.client.send(command);
      return { 
        success: true, 
        groups: response.Groups.map(g => ({
          name: g.GroupName,
          description: g.Description,
          createdAt: g.CreationDate,
          lastModified: g.LastModifiedDate
        }))
      };
    } catch (error) {
      console.error('Cognito list groups error:', error);
      return { 
        success: false, 
        error: error.message,
        code: error.name
      };
    }
  }
}

module.exports = new CognitoService();