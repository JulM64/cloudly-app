// src/pages/AdminPage.js - COMPLETE VERSION
import React, { useState } from 'react';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'departments', label: '🏢 Departments', icon: '🏢' },
    { id: 'users', label: '👥 Users', icon: '👥' },
    { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
  ];

  // Mock data
  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
  ]);

  const [departments, setDepartments] = useState([
    { id: 1, name: 'Engineering', manager: 'John Doe', members: 12, projects: 8, status: 'Active' },
    { id: 2, name: 'Marketing', manager: 'Jane Smith', members: 8, projects: 5, status: 'Active' },
    { id: 3, name: 'Sales', manager: 'Bob Johnson', members: 15, projects: 10, status: 'Active' },
  ]);

  const renderTabContent = () => {
    switch(activeTab) {
      case 'departments':
        return (
          <div className="page-card">
            <h3>🏢 Department Management</h3>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Department</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Manager</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Members</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Projects</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(dept => (
                    <tr key={dept.id} className="table-row" style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{dept.name}</td>
                      <td style={{ padding: '12px' }}>{dept.manager}</td>
                      <td style={{ padding: '12px' }}>{dept.members}</td>
                      <td style={{ padding: '12px' }}>{dept.projects}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          backgroundColor: dept.status === 'Active' ? '#e7f7ef' : '#ffeaea',
                          color: dept.status === 'Active' ? '#4caf50' : '#ff4444',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'inline-block'
                        }}>
                          {dept.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn-3d" style={{ padding: '10px 20px' }}>
                ➕ Add Department
              </button>
              <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#4caf50' }}>
                📊 View Analytics
              </button>
            </div>
          </div>
        );
        
      case 'users':
        return (
          <div className="page-card">
            <h3>👥 User Management</h3>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Role</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="table-row" style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px' }}>{user.name}</td>
                      <td style={{ padding: '12px' }}>{user.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          backgroundColor: user.role === 'Admin' ? '#9c27b0' : '#4caf50',
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          backgroundColor: user.status === 'Active' ? '#4caf50' : '#ff9800',
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button className="btn-3d" style={{ padding: '10px 20px' }}>
                ➕ Add User
              </button>
              <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#4caf50' }}>
                📧 Invite Users
              </button>
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <div className="page-card">
            <h3>⚙️ System Settings</h3>
            <div style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px'
                  }}
                  className="hover-card"
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  placeholder="100"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px'
                  }}
                  className="hover-card"
                />
              </div>
              <button className="btn-3d" style={{ padding: '12px 24px' }}>
                💾 Save Settings
              </button>
            </div>
          </div>
        );
        
      default: // overview
        return (
          <>
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>🚀 Welcome to Admin Panel</h3>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Manage your organization's departments, users, and system settings from this centralized dashboard.
              </p>
            </div>
            
            <div className="stats-grid" style={{ marginBottom: '30px', marginTop: '30px' }}>
              <div className="hover-card" style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #0066ff',
                cursor: 'pointer'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>🏢 Departments</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>Manage departments and teams</p>
              </div>
              
              <div className="hover-card" style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #4caf50',
                cursor: 'pointer'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>👥 User Management</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>Manage user accounts and permissions</p>
              </div>
              
              <div className="hover-card" style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #ff9800',
                cursor: 'pointer'
              }}>
                <h3 style={{ color: '#333', marginBottom: '10px' }}>⚙️ System Settings</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>Configure application settings</p>
              </div>
            </div>
            
            <div style={{ padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>Quick Actions</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-3d" style={{ padding: '10px 20px' }}>
                  📥 Import Data
                </button>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#4caf50' }}>
                  📊 View Analytics
                </button>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#ff9800' }}>
                  🔄 Clear Cache
                </button>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#9c27b0' }}>
                  📋 Generate Report
                </button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '10px' }}>👑 Admin Panel</h1>
      <p className="page-description" style={{ textAlign: 'left', marginBottom: '20px' }}>
        Manage your organization's departments, users, and system settings
      </p>
      
      {/* Admin Tabs */}
      <div className="admin-tabs" style={{ 
        display: 'flex', 
        gap: '10px', 
        margin: '30px 0',
        borderBottom: '1px solid #e0e0e0',
        paddingBottom: '10px',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? '#0066ff' : '#666',
              cursor: 'pointer',
              borderBottom: `3px solid ${activeTab === tab.id ? '#0066ff' : 'transparent'}`,
              fontSize: '15px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminPage;