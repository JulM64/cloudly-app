// src/contexts/CognitoAuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Auth } from 'aws-amplify';

const CognitoAuthContext = createContext(null);

export const useCognitoAuth = () => {
  const context = useContext(CognitoAuthContext);
  if (!context) {
    throw new Error('useCognitoAuth must be used within a CognitoAuthProvider');
  }
  return context;
};

export const CognitoAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await fetchUserDetails(user);
    } catch (error) {
      console.log('No authenticated user');
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (cognitoUser) => {
    try {
      // Get user attributes
      const attributes = await Auth.userAttributes(cognitoUser);
      const userInfo = await Auth.currentUserInfo();
      
      // Extract user data
      const userData = {
        id: cognitoUser.username,
        email: getAttributeValue(attributes, 'email'),
        firstName: getAttributeValue(attributes, 'given_name') || 'User',
        lastName: getAttributeValue(attributes, 'family_name') || '',
        role: getAttributeValue(attributes, 'custom:role') || 'USER',
        department: getAttributeValue(attributes, 'custom:department') || 'General',
        roleColor: getRoleColor(getAttributeValue(attributes, 'custom:role') || 'USER'),
        initials: getInitials(
          getAttributeValue(attributes, 'given_name') || 'U',
          getAttributeValue(attributes, 'family_name') || ''
        ),
        cognitoUser: cognitoUser
      };

      setCurrentUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const getAttributeValue = (attributes, name) => {
    const attr = attributes.find(attr => attr.Name === name);
    return attr ? attr.Value : '';
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'SUPER_ADMIN': return '#9c27b0';
      case 'TEAM_MANAGER': return '#4caf50';
      case 'USER': return '#ff9800';
      default: return '#0066ff';
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName[0]}${lastName[0] || ''}`.toUpperCase();
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    setLoading(true);
    setMessage('');
    
    try {
      const user = await Auth.signIn(email, password);
      await fetchUserDetails(user);
      setMessage('✅ Login successful!');
      return { success: true, user };
    } catch (error) {
      console.error('Sign in error:', error);
      let errorMessage = 'Sign in failed';
      
      switch (error.code) {
        case 'UserNotFoundException':
          errorMessage = 'User not found';
          break;
        case 'NotAuthorizedException':
          errorMessage = 'Incorrect email or password';
          break;
        case 'UserNotConfirmedException':
          errorMessage = 'Please confirm your email first';
          break;
        default:
          errorMessage = error.message || 'Sign in failed';
      }
      
      setMessage(`❌ ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Sign up new user
  const signUp = async (userData) => {
    setLoading(true);
    setMessage('');
    
    try {
      const { firstName, lastName, email, password, department } = userData;
      
      const result = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          given_name: firstName,
          family_name: lastName,
          'custom:department': department,
          'custom:role': 'USER' // Default role for new users
        }
      });
      
      setMessage('✅ Registration successful! Please check your email to confirm your account.');
      return { 
        success: true, 
        user: result.user,
        userId: result.userSub 
      };
    } catch (error) {
      console.error('Sign up error:', error);
      let errorMessage = 'Registration failed';
      
      if (error.code === 'UsernameExistsException') {
        errorMessage = 'Email already registered';
      } else if (error.code === 'InvalidPasswordException') {
        errorMessage = 'Password does not meet requirements';
      }
      
      setMessage(`❌ ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Confirm sign up with code
  const confirmSignUp = async (email, code) => {
    try {
      await Auth.confirmSignUp(email, code);
      setMessage('✅ Account confirmed successfully! You can now sign in.');
      return { success: true };
    } catch (error) {
      setMessage(`❌ ${error.message || 'Confirmation failed'}`);
      return { success: false, error: error.message };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await Auth.signOut();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setMessage('✅ Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
      setMessage(`❌ ${error.message || 'Sign out failed'}`);
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      await Auth.forgotPassword(email);
      setMessage('✅ Password reset code sent to your email');
      return { success: true, email };
    } catch (error) {
      setMessage(`❌ ${error.message || 'Password reset failed'}`);
      return { success: false, error: error.message };
    }
  };

  // Reset password
  const resetPassword = async (email, code, newPassword) => {
    try {
      await Auth.forgotPasswordSubmit(email, code, newPassword);
      setMessage('✅ Password reset successful! You can now sign in with your new password.');
      return { success: true };
    } catch (error) {
      setMessage(`❌ ${error.message || 'Password reset failed'}`);
      return { success: false, error: error.message };
    }
  };

  // Resend confirmation code
  const resendConfirmationCode = async (email) => {
    try {
      await Auth.resendSignUp(email);
      setMessage('✅ Confirmation code resent to your email');
      return { success: true };
    } catch (error) {
      setMessage(`❌ ${error.message || 'Failed to resend code'}`);
      return { success: false, error: error.message };
    }
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return currentUser?.role === role;
  };

  // Check if user has permission (based on role)
  const checkPermission = (permission) => {
    if (!currentUser) return false;
    
    // Define permissions for each role
    const rolePermissions = {
      'SUPER_ADMIN': ['all'],
      'TEAM_MANAGER': ['manage.team', 'manage.department', 'upload.file', 'view.file'],
      'USER': ['upload.file', 'view.file']
    };
    
    const permissions = rolePermissions[currentUser.role] || [];
    return permissions.includes('all') || permissions.includes(permission);
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    message,
    setMessage,
    signIn,
    signUp,
    confirmSignUp,
    signOut,
    forgotPassword,
    resetPassword,
    resendConfirmationCode,
    checkPermission,
    hasRole,
    isAdmin: currentUser?.role === 'SUPER_ADMIN',
    isManager: currentUser?.role === 'TEAM_MANAGER',
    isRegularUser: currentUser?.role === 'USER'
  };

  return (
    <CognitoAuthContext.Provider value={value}>
      {children}
    </CognitoAuthContext.Provider>
  );
};