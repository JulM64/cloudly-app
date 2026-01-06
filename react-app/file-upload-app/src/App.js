// src/App.js - COMPLETE VERSION WITH PROPER ADMIN ACCESS
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check localStorage for saved user
  useEffect(() => {
    const savedUser = localStorage.getItem('cloudly_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('cloudly_user');
    setCurrentUser(null);
    setMessage('✅ Signed out successfully');
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    setMessage('');

    // Mock authentication with DIFFERENT ROLES
    const mockUsers = {
      'admin@cloudly.com': {
        password: 'Admin123!',
        firstName: 'Admin',
        role: 'SUPER_ADMIN', // Only this user is admin
        initials: 'AU',
        color: '#9c27b0'
      },
      'user@cloudly.com': {
        password: 'User123!',
        firstName: 'Regular',
        role: 'USER', // Regular user
        initials: 'RU',
        color: '#4caf50'
      },
      'demo@cloudly.com': {
        password: 'Demo123!',
        firstName: 'Demo',
        role: 'USER', // Regular user
        initials: 'DU',
        color: '#ff9800'
      },
      'manager@cloudly.com': {
        password: 'Manager123!',
        firstName: 'Manager',
        role: 'TEAM_MANAGER', // Manager but not admin
        initials: 'MU',
        color: '#2196f3'
      }
    };

    const user = mockUsers[email];
    
    if (user && user.password === password) {
      const userData = {
        email: email,
        firstName: user.firstName,
        role: user.role,
        initials: user.initials,
        color: user.color
      };
      
      localStorage.setItem('cloudly_user', JSON.stringify(userData));
      setCurrentUser(userData);
      setMessage('✅ Login successful!');
      setLoading(false);
      return { success: true };
    } else {
      setMessage('❌ Invalid email or password');
      setLoading(false);
      return { success: false, error: 'Invalid credentials' };
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

  return (
    <Router>
      <div className="App">
        <Navigation currentUser={currentUser} signOut={handleSignOut} />
        
        <main className="cloudly-main">
          {message && (
            <div className="message-banner" style={{
              padding: '15px',
              backgroundColor: message.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              border: `1px solid ${message.includes('✅') ? '#4CAF50' : '#f44336'}`,
              borderRadius: '10px',
              marginBottom: '20px',
              color: message.includes('✅') ? '#4CAF50' : '#f44336',
              maxWidth: '1200px',
              margin: '0 auto 20px auto',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              {message}
            </div>
          )}
          
          <Routes>
            <Route path="/login" element={
              currentUser ? <Navigate to="/" replace /> : 
              <LoginPage login={handleLogin} loading={loading} />
            } />
            
            <Route path="/" element={
              <ProtectedRoute>
                <HomePage user={currentUser} />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage user={currentUser} />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage user={currentUser} />
              </ProtectedRoute>
            } />
            
            {/* Departments page - ADMIN ONLY */}
            <Route path="/departments" element={
              <AdminProtectedRoute>
                <DepartmentPage />
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
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderTop: '1px solid #e0e0e0',
          textAlign: 'center',
          color: '#666',
          marginTop: '40px',
          position: 'relative',
          zIndex: '100'
        }}>
          <p>© 2024 Cloudly. All rights reserved.</p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>
            Department Management System • Role-based access control enabled
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;