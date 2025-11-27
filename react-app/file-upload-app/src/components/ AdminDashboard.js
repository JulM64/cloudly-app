import React, { useState } from 'react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 154,
    totalFiles: 892,
    storageUsed: '45.2 GB',
    recentUploads: 23
  });

  const recentActivities = [
    { user: 'john_doe', action: 'uploaded', file: 'document.pdf', time: '2 min ago' },
    { user: 'jane_smith', action: 'signed up', file: '', time: '5 min ago' },
    { user: 'mike_wilson', action: 'downloaded', file: 'report.pdf', time: '10 min ago' }
  ];

  return (
    <div className="dashboard-container">
      <h1 className="section-title">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-number">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <h3>Total Files</h3>
          <div className="stat-number">{stats.totalFiles}</div>
        </div>
        <div className="stat-card">
          <h3>Storage Used</h3>
          <div className="stat-number">{stats.storageUsed}</div>
        </div>
        <div className="stat-card">
          <h3>Recent Uploads</h3>
          <div className="stat-number">{stats.recentUploads}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          {recentActivities.map((activity, index) => (
            <div key={index} className="activity-item">
              <span className="user">{activity.user}</span>
              <span className="action">{activity.action}</span>
              {activity.file && <span className="file">{activity.file}</span>}
              <span className="time">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button className="btn-3d">Manage Users</button>
          <button className="btn-3d">View Reports</button>
          <button className="btn-3d">System Settings</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;