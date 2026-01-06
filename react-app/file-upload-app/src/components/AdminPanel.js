import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import UserManagement from './admin/UserManagement';

const AdminPanel = () => {
  const { userRole, hasPermission } = useCompany();
  const [activeTab, setActiveTab] = useState('users');

  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="upload-wrapper">
        <h1 className="section-title" style={{ color: '#333' }}>Admin Panel</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need Super Admin permissions to access the admin panel.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'departments', label: 'Departments', icon: '🏢' },
    { id: 'system', label: 'System Settings', icon: '⚙️' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'logs', label: 'Audit Logs', icon: '📝' }
  ];

  return (
    <div className="upload-wrapper">
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <h1 className="section-title" style={{ color: '#333', marginBottom: '5px' }}>
          ⚙️ Admin Panel
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Manage system settings, users, departments, and monitor activity
        </p>
      </div>

      {/* Admin Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        padding: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        overflowX: 'auto'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === tab.id ? '#0066ff' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UserManagement />}
        
        {activeTab === 'departments' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{color: '#333', marginBottom: '20px'}}>🏢 Department Management</h2>
            <p style={{color: '#666', marginBottom: '20px'}}>
              Configure departments, storage limits, and managers.
            </p>
            {/* Department management content will go here */}
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: '10px',
              border: '2px dashed rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>🏗️</div>
              <p style={{color: '#666', margin: 0}}>Department management coming soon...</p>
            </div>
          </div>
        )}
        
        {activeTab === 'system' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{color: '#333', marginBottom: '20px'}}>⚙️ System Settings</h2>
            <p style={{color: '#666', marginBottom: '20px'}}>
              Configure system-wide settings and preferences.
            </p>
            {/* System settings content will go here */}
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: '10px',
              border: '2px dashed rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>⚙️</div>
              <p style={{color: '#666', margin: 0}}>System settings coming soon...</p>
            </div>
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{color: '#333', marginBottom: '20px'}}>📊 System Analytics</h2>
            <p style={{color: '#666', marginBottom: '20px'}}>
              View usage statistics, storage trends, and activity reports.
            </p>
            {/* Analytics content will go here */}
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: '10px',
              border: '2px dashed rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>📊</div>
              <p style={{color: '#666', margin: 0}}>Analytics dashboard coming soon...</p>
            </div>
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{color: '#333', marginBottom: '20px'}}>📝 Audit Logs</h2>
            <p style={{color: '#666', marginBottom: '20px'}}>
              View system activity, user actions, and security events.
            </p>
            {/* Audit logs content will go here */}
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              borderRadius: '10px',
              border: '2px dashed rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{fontSize: '48px', marginBottom: '15px'}}>📝</div>
              <p style={{color: '#666', margin: 0}}>Audit logs coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;