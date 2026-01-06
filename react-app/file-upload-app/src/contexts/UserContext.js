import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchAuthSession, signOut as cognitoSignOut } from 'aws-amplify/auth';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('cloudly_token');
      
      if (!savedToken) {
        setLoading(false);
        return;
      }
      
      // Verify token with backend
      const response = await fetch('http://localhost:5001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setToken(savedToken);
      } else {
        localStorage.removeItem('cloudly_token');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('cloudly_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Verify Cognito tokens with backend
  const verifyCognitoTokens = async (accessToken, idToken) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/verify-cognito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken, idToken })
      });
      
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Get current Cognito session
  const getCognitoSession = async () => {
    try {
      const session = await fetchAuthSession();
      return {
        accessToken: session.tokens?.accessToken?.toString(),
        idToken: session.tokens?.idToken?.toString(),
        isValid: !!session.tokens?.accessToken
      };
    } catch (error) {
      return { accessToken: null, idToken: null, isValid: false };
    }
  };

  const login = async (email, password) => {
    // For Cognito, login happens through Authenticator component
    // This function is kept for compatibility
    return { success: false, error: 'Use Cognito UI for authentication' };
  };

  const logout = async () => {
    try {
      // Sign out from Cognito
      await cognitoSignOut();
    } catch (error) {
      console.error('Cognito sign out error:', error);
    }
    
    // Clear local storage
    localStorage.removeItem('cloudly_token');
    
    // Reset state
    setUser(null);
    setToken(null);
    setError('');
    
    // Reload the page
    window.location.reload();
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    verifyCognitoTokens,
    getCognitoSession,
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};