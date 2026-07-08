// src/App.js - WITH ROLE-BASED ROUTING
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import cognitoService from './services/cognitoService';
import s3Service from './services/s3Service';

import Navigation from './components/Navigation';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import AdminPanel from './pages/AdminPanel';
import DepartmentPage from './pages/DepartmentPage';
import RoleRequestsPage from './pages/RoleRequestsPage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [message, setMessage]         = useState('');
  const [newPasswordRequired, setNewPasswordRequired] = useState(false);
  const [pendingCognitoUser, setPendingCognitoUser]   = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('cloudly_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          // Ensure role always defaults to MEMBER if missing (never undefined)
          if (!userData.role || !['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD','MEMBER'].includes(userData.role)) {
            userData.role = 'MEMBER';
            localStorage.setItem('cloudly_user', JSON.stringify(userData));
          }
          await cognitoService.getCurrentUser();
          if (userData.idToken) await s3Service.initialize(userData.idToken);
          setCurrentUser(userData);
        } catch {
          localStorage.removeItem('cloudly_user');
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const handleSignOut = () => {
    cognitoService.signOut();
    setCurrentUser(null);
    setMessage('✅ Signed out successfully');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLoginSuccess = async (userData) => {
    try {
      await s3Service.initialize(userData.idToken);
      setCurrentUser(userData);
      setMessage('✅ Login successful!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setCurrentUser(userData);
    }
  };

  const handleNewPasswordRequired = (cognitoUser, userAttributes) => {
    setNewPasswordRequired(true);
    setPendingCognitoUser({ cognitoUser, userAttributes });
  };

  const handleCompleteNewPassword = async (newPassword) => {
    setLoading(true);
    try {
      const userData = await cognitoService.completeNewPassword(pendingCognitoUser.cognitoUser, newPassword, pendingCognitoUser.userAttributes);
      await s3Service.initialize(userData.idToken);
      setCurrentUser(userData);
      setNewPasswordRequired(false);
      setPendingCognitoUser(null);
      setMessage('✅ Password changed successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`❌ ${err.message || 'Failed to change password'}`);
    } finally {
      setLoading(false);
    }
  };

  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
      <div style={{ width: '50px', height: '50px', border: '4px solid rgba(0,102,255,0.1)', borderTop: '4px solid #0066ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#666' }}>Loading…</p>
    </div>
  );

  // Protected route — any logged in user
  const ProtectedRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    return children;
  };

  // Admin-only route
  const AdminRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (currentUser.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;
    return children;
  };

  // Head or Admin route (DEPT_HEAD, UNIT_HEAD, SUPER_ADMIN)
  const HeadRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD'].includes(currentUser.role)) return <Navigate to="/" replace />;
    return children;
  };

  // Role requests route (SUPER_ADMIN and DEPT_HEAD)
  const RoleRequestsRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!['SUPER_ADMIN','DEPT_HEAD'].includes(currentUser.role)) return <Navigate to="/" replace />;
    return children;
  };

  useEffect(() => {
    const createClouds = () => {
      if (document.querySelectorAll('.cloud').length > 0) return;
      const container = document.createElement('div');
      container.id = 'cloud-container';
      Object.assign(container.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '1' });
      for (let i = 0; i < 4; i++) { const cloud = document.createElement('div'); cloud.className = 'cloud'; container.appendChild(cloud); }
      document.body.appendChild(container);
    };
    createClouds();
  }, []);

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }
  }, [message]);

  return (
    <Router>
      <div className="App">
        <Navigation currentUser={currentUser} signOut={handleSignOut} />

        <main className="cloudly-main">
          {message && (
            <div style={{
              padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', fontWeight: '500',
              maxWidth: '1200px', margin: '0 auto 20px auto', animation: 'fadeIn 0.5s ease-out',
              backgroundColor: message.includes('✅') ? 'rgba(76,175,80,0.1)' : message.includes('⚠️') ? 'rgba(255,152,0,0.1)' : 'rgba(244,67,54,0.1)',
              border: `1px solid ${message.includes('✅') ? '#4CAF50' : message.includes('⚠️') ? '#ff9800' : '#f44336'}`,
              color: message.includes('✅') ? '#4CAF50' : message.includes('⚠️') ? '#ff9800' : '#f44336',
            }}>{message}</div>
          )}

          {/* New Password Modal */}
          {newPasswordRequired && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
              <div className="page-card" style={{ maxWidth: '500px', padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>🔑 Set New Password</h2>
                <p style={{ marginBottom: '30px', color: '#666' }}>For security reasons, please set a new password before continuing.</p>
                <form onSubmit={e => { e.preventDefault(); handleCompleteNewPassword(e.target.newPassword.value); }}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>New Password</label>
                    <input type="password" name="newPassword" placeholder="Min 8 characters, include uppercase, number & symbol" required minLength={8}
                      style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px' }} />
                  </div>
                  <button type="submit" disabled={loading} className="btn-3d" style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
                    {loading ? '⏳ Updating...' : '🔑 Set New Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} onNewPasswordRequired={handleNewPasswordRequired} setMessage={setMessage} />} />

            <Route path="/" element={<ProtectedRoute><HomePage user={currentUser} setMessage={setMessage} /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage user={currentUser} /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage user={currentUser} setMessage={setMessage} /></ProtectedRoute>} />

            {/* Departments — Heads + Admin */}
            <Route path="/departments" element={<HeadRoute><DepartmentPage user={currentUser} setMessage={setMessage} /></HeadRoute>} />

            {/* Role Requests — Admin + DEPT_HEAD */}
            <Route path="/role-requests" element={<RoleRequestsRoute><RoleRequestsPage user={currentUser} /></RoleRequestsRoute>} />

            {/* Admin only */}
            <Route path="/admin" element={<AdminRoute><AdminPanel user={currentUser} /></AdminRoute>} />
          </Routes>
        </main>

        <footer style={{ padding: '0px', backgroundColor: '#f8f9fa', borderTop: '1px solid #e0e0e0', textAlign: 'center', color: '#666', marginTop: '40px', position: 'relative', zIndex: '100' }}>
          <p>© 2026 Cloudly. All rights reserved.</p>
          <p style={{ fontSize: '14px', opacity: 0.7 }}>AWS Cognito Authentication • S3 Cloud Storage • Department-based Access Control</p>
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