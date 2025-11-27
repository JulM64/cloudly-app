import React, { useState } from 'react';
import Appupload from '../Appupload';

const UserDashboard = () => {
  const [userStats, setUserStats] = useState({
    myFiles: 15,
    storageUsed: '2.1 GB',
    recentUploads: 3
  });

  const myFiles = [
    { name: 'project_document.pdf', size: '2.4 MB', uploaded: '2 days ago' },
    { name: 'meeting_notes.pdf', size: '1.1 MB', uploaded: '1 week ago' },
    { name: 'invoice_2024.pdf', size: '3.2 MB', uploaded: '2 weeks ago' }
  ];

  return (
    <div className="dashboard-container">
      <h1 className="section-title">My Dashboard</h1>
      
      {/* User Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>My Files</h3>
          <div className="stat-number">{userStats.myFiles}</div>
        </div>
        <div className="stat-card">
          <h3>Storage Used</h3>
          <div className="stat-number">{userStats.storageUsed}</div>
        </div>
        <div className="stat-card">
          <h3>Recent Uploads</h3>
          <div className="stat-number">{userStats.recentUploads}</div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="upload-section">
        <h2>Upload New PDF</h2>
        <Appupload />
      </div>

      {/* My Files */}
      <div className="files-section">
        <h2>My Files</h2>
        <div className="files-list">
          {myFiles.map((file, index) => (
            <div key={index} className="file-item">
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{file.size}</span>
              </div>
              <div className="file-actions">
                <button className="btn-secondary">Download</button>
                <button className="btn-secondary">Share</button>
                <button className="btn-danger">Delete</button>
              </div>
              <span className="upload-time">{file.uploaded}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;