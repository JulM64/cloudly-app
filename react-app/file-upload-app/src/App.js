// src/App.js - COMPLETE VERSION WITH AWS COGNITO INTEGRATION
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import Cognito and S3 services
import cognitoService from './services/cognitoService';
import s3Service from './services/s3Service';

// Import components
import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import DepartmentPage from './pages/DepartmentPage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [pendingCognitoUser, setPendingCognitoUser] = useState(null);

  // Check localStorage for saved user and validate session
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('cloudly_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          
          // Verify session is still valid
          const currentUser = await cognitoService.getCurrentUser();
          
          // Initialize S3 with user's token
          if (userData.idToken) {
            await s3Service.initialize(userData.idToken);
          }
          
          setCurrentUser(userData);
          console.log('✅ User session restored:', userData.email);
        } catch (error) {
          console.error('Session validation failed:', error);
          localStorage.removeItem('cloudly_user');
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Handle Sign Out
  const handleSignOut = () => {
    cognitoService.signOut();
    setCurrentUser(null);
    setMessage('✅ Signed out successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  // Handle Login Success
  const handleLoginSuccess = async (userData) => {
    try {
      // Initialize S3 service with user's ID token
      await s3Service.initialize(userData.idToken);
      
      setCurrentUser(userData);
      setMessage('✅ Login successful!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error initializing S3:', error);
      setMessage('⚠️ Login successful but S3 initialization failed');
      setCurrentUser(userData);
    }
  };

  // Handle New Password Required
  const handleNewPasswordRequired = (cognitoUser, userAttributes) => {
    setNewPasswordRequired(true);
    setPendingCognitoUser({ cognitoUser, userAttributes });
    setMessage('⚠️ Please set a new password to continue');
  };

  // Complete New Password Challenge
  const handleCompleteNewPassword = async (newPassword) => {
    if (!pendingCognitoUser) {
      setMessage('❌ No pending password change');
      return;
    }

    setLoading(true);
    try {
      const userData = await cognitoService.completeNewPassword(
        pendingCognitoUser.cognitoUser,
        newPassword,
        pendingCognitoUser.userAttributes
      );

      // Initialize S3
      await s3Service.initialize(userData.idToken);

      setCurrentUser(userData);
      setNewPasswordRequired(false);
      setPendingCognitoUser(null);
      setMessage('✅ Password changed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Password change error:', error);
      setMessage(`❌ ${error.message || 'Failed to change password'}`);
    } finally {
      setLoading(false);
    }
  };

  // Protected route component for regular users
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="loading" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(0, 102, 255, 0.1)',
            borderTop: '4px solid #0066ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666' }}>Loading...</p>
        </div>
      );
    }
    
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    
    return children;
  };

  // Admin-only protected route
  const AdminProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="loading" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(0, 102, 255, 0.1)',
            borderTop: '4px solid #0066ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#666' }}>Loading...</p>
        </div>
      );
    }
    
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    
    // Check if user is SUPER_ADMIN
    if (currentUser.role !== 'SUPER_ADMIN') {
      setMessage('❌ Access denied. Admin privileges required.');
      setTimeout(() => setMessage(''), 5000);
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  // Add cloud animations
  useEffect(() => {
    const createClouds = () => {
      const existingClouds = document.querySelectorAll('.cloud');
      if (existingClouds.length > 0) return;

      const cloudContainer = document.createElement('div');
      cloudContainer.id = 'cloud-container';
      cloudContainer.style.position = 'fixed';
      cloudContainer.style.top = '0';
      cloudContainer.style.left = '0';
      cloudContainer.style.width = '100%';
      cloudContainer.style.height = '100%';
      cloudContainer.style.pointerEvents = 'none';
      cloudContainer.style.zIndex = '1';
      
      for (let i = 0; i < 4; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloudContainer.appendChild(cloud);
      }
      
      document.body.appendChild(cloudContainer);
    };

    createClouds();
  }, []);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Router>
      <div className="App">
        <Navigation currentUser={currentUser} signOut={handleSignOut} />
        
        <main className="cloudly-main">
          {message && (
            <div className="message-banner" style={{
              padding: '15px',
              backgroundColor: message.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 
                             message.includes('⚠️') ? 'rgba(255, 152, 0, 0.1)' :
                             'rgba(244, 67, 54, 0.1)',
              border: `1px solid ${message.includes('✅') ? '#4CAF50' : 
                                  message.includes('⚠️') ? '#ff9800' :
                                  '#f44336'}`,
              borderRadius: '10px',
              marginBottom: '20px',
              color: message.includes('✅') ? '#4CAF50' : 
                     message.includes('⚠️') ? '#ff9800' :
                     '#f44336',
              maxWidth: '1200px',
              margin: '0 auto 20px auto',
              animation: 'fadeIn 0.5s ease-out',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {message}
            </div>
          )}
          
          {/* New Password Required Modal */}
          {newPasswordRequired && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div className="page-card" style={{
                maxWidth: '500px',
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>🔑 Set New Password</h2>
                <p style={{ marginBottom: '30px', color: '#666' }}>
                  For security reasons, please set a new password before continuing.
                </p>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const newPassword = e.target.newPassword.value;
                  handleCompleteNewPassword(newPassword);
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="Min 8 characters, include uppercase, number & symbol"
                      required
                      minLength={8}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '15px'
                      }}
                      className="hover-card"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-3d"
                    style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                  >
                    {loading ? '⏳ Updating...' : '🔑 Set New Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
          
          <Routes>
            <Route path="/login" element={
              currentUser ? <Navigate to="/" replace /> : 
              <LoginPage 
                onLoginSuccess={handleLoginSuccess}
                onNewPasswordRequired={handleNewPasswordRequired}
                setMessage={setMessage}
              />
            } />
            
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage user={currentUser} setMessage={setMessage} />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage user={currentUser} />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage user={currentUser} setMessage={setMessage} />
              </ProtectedRoute>
            } />
            
            {/* Departments page - ADMIN ONLY */}
            <Route path="/departments" element={
              <AdminProtectedRoute>
                <DepartmentPage setMessage={setMessage} />
              </AdminProtectedRoute>
            } />
            
            {/* Admin page - ADMIN ONLY */}
            <Route path="/admin" element={
              <AdminProtectedRoute>
                <AdminPage />
              </AdminProtectedRoute>
            } />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer style={{
          padding: '0px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center',
          color: '#666',
          marginTop: '40px',
          position: 'relative',
          zIndex: '100'
        }}>
          <p>© 2026 Cloudly. All rights reserved.</p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            AWS Cognito Authentication • S3 Cloud Storage • Department-based Access Control
          </p>
          {currentUser && (
            <p style={{ fontSize: '12px', opacity: 0.25, marginTop: '0px' }}>
              Logged in as: {currentUser.email} • Role: {currentUser.role} • Department: {currentUser.department}
            </p>
          )}
        </footer>
      </div>
    </Router>
  );
}

export default App;
