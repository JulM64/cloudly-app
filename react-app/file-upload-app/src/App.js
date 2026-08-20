// src/App.js — same routes, auth flow, and role guards as before.
// Only the layout shell changed: top navbar + floating clouds -> fixed
// sidebar + topbar (see components/Navigation.js and styles/App.css).
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './styles/App.css';

import cognitoService from './services/cognitoService';
import s3Service from './services/s3Service';
import apiService from './services/apiService';

import Navigation from './components/Navigation';
import { IconCheckCircle, IconAlertCircle, IconXCircle, IconClose } from './components/icons';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import AdminPanel from './pages/AdminPanel';
import DepartmentPage from './pages/DepartmentPage';
import RoleRequestsPage from './pages/RoleRequestsPage';
import HeadPanel from './pages/HeadPanel';
import ScanPage from './pages/ScanPage';
import OrgSignupPage from './pages/OrgSignupPage';

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
          if (!userData.role || !['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD','MEMBER'].includes(userData.role)) {
            userData.role = 'MEMBER';
            localStorage.setItem('cloudly_user', JSON.stringify(userData));
          }
          await cognitoService.getCurrentUser();
          if (userData.idToken) await s3Service.initialize(userData.idToken);
          setCurrentUser(userData);
          fetchAndApplyAvatar();
        } catch {
          localStorage.removeItem('cloudly_user');
          setCurrentUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Single source of truth for the avatar: fetched once here (same reliable
  // call SettingsPage already uses successfully), then carried on
  // currentUser like any other field (department, role, etc.) so every
  // consumer — Navigation included — just reads a prop instead of running
  // its own independent fetch that can fail silently.
  const fetchAndApplyAvatar = async () => {
    try {
      const res = await apiService.getMyAvatar();
      if (res.avatarBase64) {
        setCurrentUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, avatar: res.avatarBase64 };
          try {
            const stored = JSON.parse(localStorage.getItem('cloudly_user') || '{}');
            localStorage.setItem('cloudly_user', JSON.stringify({ ...stored, avatar: res.avatarBase64 }));
          } catch (e) { console.warn('Could not persist avatar to localStorage', e); }
          return updated;
        });
      }
    } catch (err) {
      console.warn('Could not fetch avatar:', err.message);
    }
  };

  // SettingsPage dispatches this the instant a photo is uploaded/removed —
  // update currentUser immediately so every consumer re-renders with the
  // new photo, without needing a reload.
  useEffect(() => {
    const onAvatarUpdated = (e) => {
      setCurrentUser((prev) => (prev ? { ...prev, avatar: e.detail?.avatar || null } : prev));
    };
    window.addEventListener('cloudly-avatar-updated', onAvatarUpdated);
    return () => window.removeEventListener('cloudly-avatar-updated', onAvatarUpdated);
  }, []);

  const handleSignOut = () => {
    cognitoService.signOut();
    setCurrentUser(null);
    setMessage('Signed out successfully.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLoginSuccess = async (userData) => {
    try {
      await s3Service.initialize(userData.idToken);
      setCurrentUser(userData);
      fetchAndApplyAvatar();
      setMessage('Login successful.');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setCurrentUser(userData);
      fetchAndApplyAvatar();
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
      fetchAndApplyAvatar();
      setNewPasswordRequired(false);
      setPendingCognitoUser(null);
      setMessage('Password changed successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const Spinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid var(--c-brand-tint)', borderTop: '3px solid var(--c-brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>Loading…</p>
    </div>
  );

  const ProtectedRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    return children;
  };

  const AdminRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (currentUser.role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;
    return children;
  };

  const HeadRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD'].includes(currentUser.role)) return <Navigate to="/" replace />;
    return children;
  };

  const RoleRequestsRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!['SUPER_ADMIN','DEPT_HEAD'].includes(currentUser.role)) return <Navigate to="/" replace />;
    return children;
  };

  const TeamRoute = ({ children }) => {
    if (loading) return <Spinner />;
    if (!currentUser) return <Navigate to="/login" replace />;
    if (!['DEPT_HEAD','UNIT_HEAD'].includes(currentUser.role)) return <Navigate to="/" replace />;
    return children;
  };

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }
  }, [message]);

  const bannerTone = message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')
    ? 'danger'
    : message.toLowerCase().includes('warn')
      ? 'warning'
      : 'success';
  const BannerIcon = bannerTone === 'danger' ? IconXCircle : bannerTone === 'warning' ? IconAlertCircle : IconCheckCircle;

  return (
    <Router>
      <div className="App">
        {currentUser && <Navigation currentUser={currentUser} signOut={handleSignOut} />}

        <main className={currentUser ? 'cl-app-content' : ''}>
          <div className={currentUser ? 'cl-page-container' : ''} style={{ maxWidth: '1280px', margin: '0 auto' }}>
            {message && (
              <div className={`ui-banner ui-banner--${bannerTone}`} style={{ marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BannerIcon size={16} />
                  {message}
                </span>
                <button className="ui-banner-close" onClick={() => setMessage('')} aria-label="Dismiss"><IconClose size={14} /></button>
              </div>
            )}

            {newPasswordRequired && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div className="ui-card ui-card--padded" style={{ maxWidth: '440px', width: '90%' }}>
                  <h2 style={{ marginBottom: '8px', fontSize: 'var(--fs-lg)', color: 'var(--c-text)' }}>Set a new password</h2>
                  <p style={{ marginBottom: '24px', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>For security reasons, please set a new password before continuing.</p>
                  <form onSubmit={e => { e.preventDefault(); handleCompleteNewPassword(e.target.newPassword.value); }}>
                    <div className="ui-field">
                      <label className="ui-label">New password</label>
                      <input className="ui-input" type="password" name="newPassword" placeholder="Min 8 characters, include uppercase, number & symbol" required minLength={8} />
                    </div>
                    <button type="submit" disabled={loading} className="ui-btn ui-btn--primary ui-btn--md" style={{ width: '100%' }}>
                      {loading ? 'Updating…' : 'Set new password'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <Routes>
              <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} onNewPasswordRequired={handleNewPasswordRequired} setMessage={setMessage} />} />
              <Route path="/signup" element={currentUser ? <Navigate to="/" replace /> : <OrgSignupPage onSignupComplete={() => window.location.assign('/login')} />} />

              <Route path="/" element={<ProtectedRoute><HomePage user={currentUser} setMessage={setMessage} /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage user={currentUser} /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage user={currentUser} setMessage={setMessage} /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanPage user={currentUser} /></ProtectedRoute>} />

              <Route path="/departments" element={<HeadRoute><DepartmentPage user={currentUser} setMessage={setMessage} /></HeadRoute>} />
              <Route path="/role-requests" element={<RoleRequestsRoute><RoleRequestsPage user={currentUser} /></RoleRequestsRoute>} />
              <Route path="/team" element={<TeamRoute><HeadPanel user={currentUser} /></TeamRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminPanel user={currentUser} /></AdminRoute>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;