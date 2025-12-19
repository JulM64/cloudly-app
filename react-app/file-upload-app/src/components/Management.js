import React from 'react';

const Management = ({ userData }) => {
  return (
    <div className="upload-wrapper">
      <h1 className="section-title">File Management</h1>
      <div className="page-card">
        <h3>📁 Your Files</h3>
        {userData && (
          <>
            <p>Storage Used: <strong>{(userData.storageUsed / 1024 / 1024).toFixed(2)} MB</strong></p>
            <p>Your Role: <strong>{userData.role || 'USER'}</strong></p>
          </>
        )}
      </div>
    </div>
  );
};

export default Management;