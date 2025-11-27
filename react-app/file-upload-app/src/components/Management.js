import React, { useState } from 'react';

const Management = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="management-container">
      <h1 className="section-title">
        {userRole === 'admin' ? 'System Management' : 'File Management'}
      </h1>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          Files
        </button>
        {userRole === 'admin' && (
          <>
            <button 
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button 
              className={`tab ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              System
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'files' && (
          <div className="files-management">
            <h2>Manage Your Files</h2>
            <div className="search-bar">
              <input type="text" placeholder="Search files..." />
              <button className="btn-3d">Search</button>
            </div>
            {/* File list would go here */}
          </div>
        )}

        {activeTab === 'users' && userRole === 'admin' && (
          <div className="users-management">
            <h2>User Management</h2>
            <div className="admin-actions">
              <button className="btn-3d">Add New User</button>
              <button className="btn-3d">Export User List</button>
              <button className="btn-3d">Manage Permissions</button>
            </div>
            {/* User list would go here */}
          </div>
        )}

        {activeTab === 'system' && userRole === 'admin' && (
          <div className="system-management">
            <h2>System Settings</h2>
            <div className="system-actions">
              <button className="btn-3d">Storage Settings</button>
              <button className="btn-3d">Backup Configuration</button>
              <button className="btn-3d">Security Settings</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Management;