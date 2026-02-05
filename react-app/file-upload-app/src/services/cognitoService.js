// src/services/cognitoService.js - AWS Cognito Authentication Service

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import { awsConfig } from '../config/awsConfig';

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: awsConfig.cognito.userPoolId,
  ClientId: awsConfig.cognito.userPoolWebClientId
});

class CognitoAuthService {
  
  // Sign Up New User
  signUp(email, password, firstName, lastName, department) {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'given_name', Value: firstName }),
        new CognitoUserAttribute({ Name: 'family_name', Value: lastName }),
        new CognitoUserAttribute({ Name: 'custom:department', Value: department })
      ];

      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) {
          console.error('SignUp Error:', err);
          reject(err);
          return;
        }
        
        console.log('User registered successfully:', result.user.getUsername());
        resolve({
          user: result.user,
          userConfirmed: result.userConfirmed,
          userSub: result.userSub
        });
      });
    });
  }

  // Confirm Sign Up (Email Verification)
  confirmSignUp(email, code) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          console.error('Confirmation Error:', err);
          reject(err);
          return;
        }
        console.log('User confirmed:', result);
        resolve(result);
      });
    });
  }

  // Sign In
  signIn(email, password) {
    return new Promise((resolve, reject) => {
      const authenticationData = {
        Username: email,
        Password: password
      };

      const authenticationDetails = new AuthenticationDetails(authenticationData);

      const userData = {
        Username: email,
        Pool: userPool
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session) => {
          console.log('Authentication successful');
          
          // Get user attributes
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              reject(err);
              return;
            }

            // Parse attributes
            const userAttributes = {};
            attributes.forEach(attr => {
              userAttributes[attr.Name] = attr.Value;
            });

            // Get user groups
            this.getUserGroups(session.getIdToken().getJwtToken())
              .then(groups => {
                const userData = {
                  email: userAttributes.email,
                  firstName: userAttributes.given_name,
                  lastName: userAttributes.family_name,
                  department: userAttributes['custom:department'],
                  userId: userAttributes.sub,
                  groups: groups,
                  role: this.determineRole(groups),
                  initials: this.getInitials(userAttributes.given_name, userAttributes.family_name),
                  color: this.getRandomColor(),
                  idToken: session.getIdToken().getJwtToken(),
                  accessToken: session.getAccessToken().getJwtToken(),
                  refreshToken: session.getRefreshToken().getToken()
                };

                // Save to localStorage
                localStorage.setItem('cloudly_user', JSON.stringify(userData));
                resolve(userData);
              })
              .catch(err => {
                console.error('Error getting groups:', err);
                // Continue without groups
                const userData = {
                  email: userAttributes.email,
                  firstName: userAttributes.given_name,
                  lastName: userAttributes.family_name,
                  department: userAttributes['custom:department'],
                  userId: userAttributes.sub,
                  groups: [],
                  role: 'USER',
                  initials: this.getInitials(userAttributes.given_name, userAttributes.family_name),
                  color: this.getRandomColor(),
                  idToken: session.getIdToken().getJwtToken(),
                  accessToken: session.getAccessToken().getJwtToken(),
                  refreshToken: session.getRefreshToken().getToken()
                };
                localStorage.setItem('cloudly_user', JSON.stringify(userData));
                resolve(userData);
              });
          });
        },
        onFailure: (err) => {
          console.error('Authentication failed:', err);
          reject(err);
        },
        newPasswordRequired: (userAttributes, requiredAttributes) => {
          // Handle new password required
          reject({ 
            code: 'NewPasswordRequired', 
            userAttributes, 
            requiredAttributes,
            cognitoUser: cognitoUser 
          });
        }
      });
    });
  }

  // Complete New Password Challenge
  completeNewPassword(cognitoUser, newPassword, userAttributes) {
    return new Promise((resolve, reject) => {
      // Remove attributes that shouldn't be updated
      delete userAttributes.email_verified;
      delete userAttributes.email;
      
      cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
        onSuccess: (session) => {
          console.log('Password changed successfully');
          
          // Get user attributes
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) {
              reject(err);
              return;
            }

            // Parse attributes
            const parsedAttributes = {};
            attributes.forEach(attr => {
              parsedAttributes[attr.Name] = attr.Value;
            });

            // Get groups and build user data
            this.getUserGroups(session.getIdToken().getJwtToken())
              .then(groups => {
                const userData = {
                  email: parsedAttributes.email,
                  firstName: parsedAttributes.given_name,
                  lastName: parsedAttributes.family_name,
                  department: parsedAttributes['custom:department'],
                  userId: parsedAttributes.sub,
                  groups: groups,
                  role: this.determineRole(groups),
                  initials: this.getInitials(parsedAttributes.given_name, parsedAttributes.family_name),
                  color: this.getRandomColor(),
                  idToken: session.getIdToken().getJwtToken(),
                  accessToken: session.getAccessToken().getJwtToken(),
                  refreshToken: session.getRefreshToken().getToken()
                };

                localStorage.setItem('cloudly_user', JSON.stringify(userData));
                resolve(userData);
              });
          });
        },
        onFailure: (err) => {
          console.error('Password change failed:', err);
          reject(err);
        }
      });
    });
  }

  // Get Current User
  getCurrentUser() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();

      if (!cognitoUser) {
        reject(new Error('No user logged in'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        if (!session.isValid()) {
          reject(new Error('Session expired'));
          return;
        }

        // Get user attributes
        cognitoUser.getUserAttributes((err, attributes) => {
          if (err) {
            reject(err);
            return;
          }

          const userAttributes = {};
          attributes.forEach(attr => {
            userAttributes[attr.Name] = attr.Value;
          });

          resolve({
            email: userAttributes.email,
            firstName: userAttributes.given_name,
            lastName: userAttributes.family_name,
            department: userAttributes['custom:department'],
            userId: userAttributes.sub,
            session: session
          });
        });
      });
    });
  }

  // Sign Out
  signOut() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    localStorage.removeItem('cloudly_user');
  }

  // Get User Groups from ID Token
  getUserGroups(idToken) {
    return new Promise((resolve) => {
      try {
        // Decode JWT token
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        const groups = payload['cognito:groups'] || [];
        resolve(groups);
      } catch (err) {
        console.error('Error decoding token:', err);
        resolve([]);
      }
    });
  }

  // Determine User Role from Groups
  determineRole(groups) {
    if (groups.includes(awsConfig.groups.SUPER_ADMIN)) {
      return 'SUPER_ADMIN';
    } else if (groups.includes(awsConfig.groups.DEPARTMENT_ADMIN)) {
      return 'DEPARTMENT_ADMIN';
    } else {
      return 'USER';
    }
  }

  // Get User Initials
  getInitials(firstName, lastName) {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  }

  // Get Random Color for Avatar
  getRandomColor() {
    const colors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Change Password
  changePassword(oldPassword, newPassword) {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();

      if (!cognitoUser) {
        reject(new Error('No user logged in'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(result);
        });
      });
    });
  }

  // Forgot Password
  forgotPassword(email) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.forgotPassword({
        onSuccess: (data) => {
          resolve(data);
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  // Confirm Forgot Password
  confirmPassword(email, code, newPassword) {
    return new Promise((resolve, reject) => {
      const userData = {
        Username: email,
        Pool: userPool
      };

      const cognitoUser = new CognitoUser(userData);

      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => {
          resolve('Password reset successful');
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  // Get Session Token
  getSessionToken() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();

      if (!cognitoUser) {
        reject(new Error('No user logged in'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken()
        });
      });
    });
  }

  // Refresh Session
  refreshSession() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();

      if (!cognitoUser) {
        reject(new Error('No user logged in'));
        return;
      }

      cognitoUser.getSession((err, session) => {
        if (err) {
          reject(err);
          return;
        }

        const refreshToken = session.getRefreshToken();
        
        cognitoUser.refreshSession(refreshToken, (err, newSession) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            idToken: newSession.getIdToken().getJwtToken(),
            accessToken: newSession.getAccessToken().getJwtToken()
          });
        });
      });
    });
  }
}

export default new CognitoAuthService();