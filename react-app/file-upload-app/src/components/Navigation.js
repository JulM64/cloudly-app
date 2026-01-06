// src/components/Navigation.js - WITH ROLE-BASED NAVIGATION
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navigation = ({ currentUser, signOut }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navLinkStyle = (path) => ({
    textDecoration: 'none',
    color: location.pathname === path ? '#0066ff' : '#333',
    fontWeight: location.pathname === path ? '600' : '400',
    padding: '8px 12px',
    borderRadius: '5px',
    transition: 'all 0.2s',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  });

  // Get role color
  const getRoleColor = (role) => {
    switch(role) {
      case 'SUPER_ADMIN': return '#9c27b0';
      case 'TEAM_MANAGER': return '#4caf50';
      case 'USER': return '#ff9800';
      default: return '#0066ff';
    }
  };

  return (
    <header className="cloudly-header">
      <div className="logo">
        <span style={{ fontSize: '24px' }}>☁️</span>
        Cloudly
      </div>
      
      <nav>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Home link for all users */}
            <Link to="/" style={navLinkStyle('/')}>
              🏠 Home
            </Link>
            
            {/* Dashboard link for all users */}
            <Link to="/dashboard" style={navLinkStyle('/dashboard')}>
              📊 Dashboard
            </Link>
            
            {/* Admin and Department links - ONLY FOR SUPER_ADMIN */}
            {currentUser.role === 'SUPER_ADMIN' && (
              <>
                <Link to="/departments" style={navLinkStyle('/departments')}>
                  🏢 Departments
                </Link>
                <Link to="/admin" style={navLinkStyle('/admin')}>
                  👑 Admin
                </Link>
              </>
            )}
            
            {/* Settings link for all users */}
            <Link to="/settings" style={navLinkStyle('/settings')}>
              ⚙️ Settings
            </Link>
            
            <div className="user-menu">
              <div className="user-avatar" style={{
                backgroundColor: currentUser.color || getRoleColor(currentUser.role)
              }}>
                {currentUser.initials || 'UU'}
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#333' 
                }}>
                  {currentUser.firstName}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  textTransform: 'capitalize'
                }}>
                  {currentUser.role?.toLowerCase().replace('_', ' ') || 'user'}
                </div>
              </div>
              
              <button 
                onClick={handleSignOut}
                className="btn-3d sign-out-btn"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <Link 
            to="/login" 
            style={navLinkStyle('/login')}
          >
            🔐 Login
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Navigation;