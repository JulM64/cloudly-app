import React, { useState } from 'react';
import { uploadData } from '@aws-amplify/storage';

function Appupload({ userData }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleUpload = async (e) => {
    const chosenFile = e.target.files[0];
    if (!chosenFile || !userData) return;

    // Check file size (100MB max)
    if (chosenFile.size > 104857600) {
      setUploadStatus('File too large. Maximum size is 100MB ❌');
      return;
    }

    setUploading(true);
    setUploadStatus('Uploading...');

    try {
      const timestamp = Date.now();
      const fileKey = `companies/${userData.companyId}/users/${userData.username}/${timestamp}-${chosenFile.name}`;
      
      // Upload to S3
      await uploadData({
        key: fileKey,
        data: chosenFile,
        options: { 
          contentType: chosenFile.type,
          accessLevel: 'private'
        },
      }).result;

      setUploadStatus('File uploaded successfully! 🎉');
      
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('Upload failed ❌');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-wrapper">
      <h2>Scan & Upload PDF</h2>
      
      {userData && (
        <div className="storage-indicator" style={{marginBottom: '20px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
            <span>Storage: {(userData.storageUsed / 1024 / 1024).toFixed(2)} MB used</span>
          </div>
          <div className="storage-bar">
            <div 
              className="storage-fill" 
              style={{ 
                width: '0%', // Will update when real storage tracking is implemented
                backgroundColor: '#0066ff'
              }}
            ></div>
          </div>
        </div>
      )}
      
      <label className="btn-3d upload-label">
        {uploading ? 'Uploading...' : '📁 Scan or Upload PDF'}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.png"
          onChange={handleUpload}
          disabled={uploading || !userData}
          style={{ display: 'none' }}
        />
      </label>

      {uploadStatus && (
        <div className="upload-status">
          {uploadStatus}
        </div>
      )}
    </div>
  );
}

export default Appupload;