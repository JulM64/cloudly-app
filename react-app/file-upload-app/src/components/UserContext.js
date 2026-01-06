import React, { createContext, useState, useContext, useEffect } from 'react';

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
      
      const response = await fetch('http://localhost:5001/api/auth/me', {
        headers: { 'Authorization': `Bearer ${savedToken}` }
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

  // ADD THIS FUNCTION for Cognito token verification
  const verifyCognitoTokens = async (accessToken, idToken) => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/verify-cognito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessToken, idToken })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('cloudly_token', data.token);
        setUser(data.user);
        setToken(data.token);
      }
      
      return data;
    } catch (error) {
      console.error('Cognito verification error:', error);
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    // Not used for Cognito
    return { success: false, error: 'Use Cognito authentication' };
  };

  const logout = () => {
    localStorage.removeItem('cloudly_token');
    setUser(null);
    setToken(null);
    setError('');
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    verifyCognitoTokens, // Make sure this is included
    isAuthenticated: !!user
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};