// src/components/Navigation.js - WITH ROLE BADGES & PENDING NOTIFICATION
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#9c27b0', icon: '👑' },
  DEPT_HEAD:   { label: 'Dept Head',   color: '#0066ff', icon: '🏢' },
  UNIT_HEAD:   { label: 'Unit Head',   color: '#4caf50', icon: '🔷' },
  MEMBER:      { label: 'Member',      color: '#ff9800', icon: '👤' },
};

const Navigation = ({ currentUser, signOut }) => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin    = currentUser?.role === 'SUPER_ADMIN';
  const isDeptHead = currentUser?.role === 'DEPT_HEAD';
  const isUnitHead = currentUser?.role === 'UNIT_HEAD';
  const canSeeDepts = isAdmin || isDeptHead || isUnitHead;
  const canSeeRoleRequests = isAdmin || isDeptHead;

  // Poll pending role requests count
  useEffect(() => {
    if (!currentUser || !canSeeRoleRequests) return;
    const fetchCount = async () => {
      try {
        const res = await apiService.getPendingRoleCount();
        setPendingCount(res.pendingCount || 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // every 30s
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const roleCfg = ROLE_CONFIG[currentUser?.role] || ROLE_CONFIG.MEMBER;

  const navLink = (path, label) => (
    <Link to={path} style={{
      textDecoration: 'none',
      color: location.pathname === path ? '#0066ff' : '#333',
      fontWeight: location.pathname === path ? '600' : '400',
      padding: '8px 12px', borderRadius: '5px', fontSize: '15px',
      display: 'flex', alignItems: 'center', gap: '6px',
      backgroundColor: location.pathname === path ? '#f0f7ff' : 'transparent',
      transition: 'all 0.2s',
    }}>{label}</Link>
  );

  return (
    <header className="cloudly-header">
      <div className="logo">
        <span style={{ fontSize: '24px' }}>☁️</span>
        Cloudly
      </div>

      <nav>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {navLink('/', '🏠 Home')}
            {navLink('/dashboard', '📊 Dashboard')}

            {/* Departments — visible to SUPER_ADMIN, DEPT_HEAD, UNIT_HEAD */}
            {canSeeDepts && navLink('/departments', '🏢 Departments')}

            {/* Role Requests — visible to SUPER_ADMIN and DEPT_HEAD */}
            {canSeeRoleRequests && (
              <Link to="/role-requests" style={{
                textDecoration: 'none',
                color: location.pathname === '/role-requests' ? '#0066ff' : '#333',
                fontWeight: location.pathname === '/role-requests' ? '600' : '400',
                padding: '8px 12px', borderRadius: '5px', fontSize: '15px',
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: location.pathname === '/role-requests' ? '#f0f7ff' : 'transparent',
                position: 'relative',
              }}>
                🔐 Roles
                {pendingCount > 0 && (
                  <span style={{
                    backgroundColor: '#ef5350', color: 'white',
                    borderRadius: '10px', padding: '1px 7px',
                    fontSize: '11px', fontWeight: '800', minWidth: '18px', textAlign: 'center',
                  }}>{pendingCount}</span>
                )}
              </Link>
            )}

            {/* Admin — SUPER_ADMIN only */}
            {isAdmin && navLink('/admin', '👑 Admin')}

            {navLink('/settings', '⚙️ Settings')}

            {/* User info */}
            <div className="user-menu" style={{ marginLeft: '8px' }}>
              <div className="user-avatar" style={{ backgroundColor: roleCfg.color }}>
                {currentUser.initials || currentUser.firstName?.[0] || 'U'}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  {currentUser.firstName}
                </div>
                <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: roleCfg.color, fontWeight: '700' }}>{roleCfg.icon} {roleCfg.label}</span>
                </div>
                {currentUser.department && (
                  <div style={{ fontSize: '11px', color: '#aaa' }}>📂 {currentUser.department}</div>
                )}
              </div>
              <button onClick={handleSignOut} className="btn-3d sign-out-btn" style={{ padding: '8px 16px', fontSize: '14px' }}>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <Link to="/login" style={{ textDecoration: 'none', color: '#333', padding: '8px 12px' }}>🔐 Login</Link>
        )}
      </nav>
    </header>
  );
};

export default Navigation;