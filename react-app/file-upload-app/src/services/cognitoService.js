// src/services/cognitoService.js
import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY
  }
});

const USER_POOL_CLIENT_ID = '1aoubtc0kgdelh63dk17ha4pp8';

export const cognitoService = {
  async signIn(email, password) {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: USER_POOL_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const response = await client.send(command);
      
      if (response.AuthenticationResult) {
        // Get user details
        const userCommand = new GetUserCommand({
          AccessToken: response.AuthenticationResult.AccessToken
        });
        
        const userResponse = await client.send(userCommand);
        return {
          success: true,
          user: userResponse,
          tokens: response.AuthenticationResult
        };
      }
      
      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }
};