import React from 'react';
import { useUser } from '../contexts/UserContext';

const Navbar = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useUser();
  
  const navigationItems = [
    { id: 1, label: 'Dashboard', page: 'dashboard', icon: '📊' },
    { id: 2, label: 'Files', page: 'files', icon: '📁' },
    { id: 3, label: 'Team', page: 'team', icon: '👥' },
    { id: 4, label: 'Departments', page: 'departments', icon: '🏢' },
    { id: 5, label: 'Admin', page: 'admin', icon: '⚙️' }
  ];

  const getRoleColor = () => {
    if (!user) return '#666';
    const colors = {
      'SUPER_ADMIN': '#9c27b0',
      'DEPARTMENT_ADMIN': '#2196f3',
      'TEAM_MANAGER': '#4caf50',
      'USER': '#ff9800'
    };
    return colors[user.role] || '#666';
  };

  const getUserInitials = () => {
    if (!user) return '??';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (!user) return null; // Don't show navbar if not logged in

  return (
    <header className="cloudly-header">
      <div className="header-container">
        <div className="logo">
          <img src="/cloudly-logo-simplified01.png" width="32" alt="Cloudly" />
          <span className="logo-text">Cloudly</span>
        </div>

        <nav className="nav-links">
          {navigationItems.map(item => {
            // Hide Admin tab for non-admin users
            if (item.page === 'admin' && user?.role !== 'SUPER_ADMIN') {
              return null;
            }
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.page)}
                className={currentPage === item.page ? 'active' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>{item.icon}</span>
                {item.label}
                {currentPage === item.page && (
                  <span className="nav-indicator"></span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="user-info">
          {/* User Role Badge */}
          <div 
            className="role-badge"
            style={{
              backgroundColor: `${getRoleColor()}15`,
              borderColor: `${getRoleColor()}30`,
              color: getRoleColor()
            }}
          >
            <div 
              className="role-badge-dot"
              style={{ backgroundColor: getRoleColor() }}
            ></div>
            {user.role}
          </div>

          {/* User Avatar */}
          <div 
            className="user-avatar"
            style={{ backgroundColor: getRoleColor() }}
            title={`${user.firstName} ${user.lastName}\n${user.email}\nRole: ${user.role}`}
          >
            {getUserInitials()}
            <div className="online-indicator"></div>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to logout?')) {
                logout();
                window.location.reload();
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 68, 68, 0.1)',
              color: '#ff4444',
              border: '1px solid rgba(255, 68, 68, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;