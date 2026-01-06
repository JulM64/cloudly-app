// src/pages/AdminPanel.js
import React, { useState } from 'react';

const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users');
  
  const stats = {
    totalUsers: 156,
    activeSessions: 42,
    storageUsed: '2.4 TB',
    totalDepartments: 8,
    pendingInvites: 3,
    systemHealth: 'excellent'
  };

  return (
    <div className="upload-wrapper">
      <h1 className="section-title">👑 Admin Panel</h1>
      <p className="page-description">
        System administration and management dashboard.
      </p>
      
      <div className="page-card">
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button 
            className={`tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ System
          </button>
          <button 
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📊 Logs
          </button>
          <button 
            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security
          </button>
        </div>
        
        {activeTab === 'users' && (
          <div>
            <h3 style={{ marginTop: '20px' }}>User Management</h3>
            <p>Manage system users and permissions</p>
          </div>
        )}
        
        {activeTab === 'system' && (
          <div>
            <h3 style={{ marginTop: '20px' }}>System Configuration</h3>
            <p>Configure system settings and preferences</p>
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div>
            <h3 style={{ marginTop: '20px' }}>System Logs</h3>
            <p>View system activity and audit logs</p>
          </div>
        )}
        
        {activeTab === 'security' && (
          <div>
            <h3 style={{ marginTop: '20px' }}>Security Settings</h3>
            <p>Configure security policies and access controls</p>
          </div>
        )}
      </div>
      
      {/* System Stats */}
      <div className="page-card" style={{ marginTop: '30px' }}>
        <h3>📈 System Statistics</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="hover-card" style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ 
                fontSize: '28px', 
                fontWeight: 'bold', 
                color: '#0066ff',
                marginBottom: '10px'
              }}>
                {value}
              </div>
              <div style={{ 
                fontSize: '14px', 
                color: '#666',
                textTransform: 'capitalize'
              }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="page-card" style={{ marginTop: '30px' }}>
        <h3>⚡ Quick Actions</h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          marginTop: '20px'
        }}>
          <button className="btn-3d" style={{ padding: '12px 24px', fontSize: '14px' }}>
            🔄 Run System Backup
          </button>
          <button className="btn-3d" style={{ padding: '12px 24px', fontSize: '14px' }}>
            📧 Send System Announcement
          </button>
          <button className="btn-3d" style={{ padding: '12px 24px', fontSize: '14px' }}>
            🔍 Audit User Activity
          </button>
          <button className="btn-3d" style={{ padding: '12px 24px', fontSize: '14px' }}>
            ⚠️ View System Alerts
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;