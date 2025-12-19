import React, { useState } from 'react';
import { uploadData } from '@aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';

const HomePage = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [recentUploads, setRecentUploads] = useState([]);
  const [storageUsed, setStorageUsed] = useState(0);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setUploading(true);
    setProgress(0);
    setUploadStatus(`Uploading ${file.name}...`);

    try {
      // Get current user
      const user = await getCurrentUser();
      const username = user.username || 'anonymous';
      
      // Create unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const fileKey = `uploads/${username}/${fileName}`;
      
      console.log('Starting upload:', { fileKey, size: file.size, type: file.type });

      // Upload to S3 with progress tracking
      const result = await uploadData({
        key: fileKey,
        data: file,
        options: {
          contentType: file.type,
          accessLevel: 'private', // or 'guest' depending on your setup
          onProgress: ({ transferredBytes, totalBytes }) => {
            const percentage = Math.round((transferredBytes / totalBytes) * 100);
            setProgress(percentage);
          }
        }
      }).result;

      console.log('✅ Upload successful:', result);
      
      // Update storage used
      const newStorageUsed = storageUsed + file.size;
      setStorageUsed(newStorageUsed);
      
      // Add to recent uploads
      const newUpload = {
        name: file.name,
        size: file.size,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'success'
      };
      
      setRecentUploads(prev => [newUpload, ...prev.slice(0, 4)]); // Keep only 5 most recent
      
      setUploadStatus(`✅ Successfully uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadStatus(`❌ Upload failed: ${error.message}`);
      
      // Add failed upload to history
      const failedUpload = {
        name: file.name,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'failed'
      };
      
      setRecentUploads(prev => [failedUpload, ...prev.slice(0, 4)]);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Cloud animations */}
      <div className="cloud"></div>
      <div className="cloud"></div>
      <div className="cloud"></div>
      
      <div className="upload-wrapper">
        <h1 className="section-title">Secure PDF Upload</h1>
        <p className="page-description">
          Upload your files securely to the cloud with real-time progress tracking
        </p>
        
        {/* Storage Overview */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
            <span>Storage Used</span>
            <span>{formatFileSize(storageUsed)}</span>
          </div>
          <div style={{
            height: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '5px',
            overflow: 'hidden',
            marginBottom: '5px'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min((storageUsed / (1024 * 1024 * 1024)) * 100, 100)}%`,
              background: 'linear-gradient(90deg, #0066ff, #00cc66)',
              borderRadius: '5px',
              transition: 'width 0.5s ease'
            }}></div>
          </div>
          <div style={{fontSize: '12px', opacity: '0.7', textAlign: 'right'}}>
            Limit: 1 GB • {Math.round((storageUsed / (1024 * 1024 * 1024)) * 100)}% used
          </div>
        </div>
        
        {/* Upload Area */}
        <div style={{textAlign: 'center', marginBottom: '30px'}}>
          <h2 style={{marginBottom: '20px'}}>Upload Your Files</h2>
          
          {/* Upload Button */}
          <label className="btn-3d" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 45px',
            fontSize: '18px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {uploading ? (
              <>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '3px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Uploading... {progress}%
              </>
            ) : (
              <>
                <span style={{fontSize: '24px'}}>📁</span>
                Choose File to Upload
              </>
            )}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
          </label>
          
          <p style={{marginTop: '15px', opacity: '0.7', fontSize: '14px'}}>
            Supports PDF, DOC, JPG, PNG, TXT files • Max 100MB
          </p>
          
          {/* Progress Bar */}
          {uploading && (
            <div style={{
              marginTop: '25px',
              maxWidth: '500px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '14px'
              }}>
                <span>Upload Progress</span>
                <span style={{fontWeight: '600'}}>{progress}%</span>
              </div>
              <div style={{
                height: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '5px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #0066ff, #00cc66)',
                  borderRadius: '5px',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Upload Status */}
        {uploadStatus && (
          <div style={{
            padding: '15px',
            marginBottom: '25px',
            backgroundColor: uploadStatus.includes('✅') 
              ? 'rgba(0, 204, 102, 0.1)' 
              : 'rgba(255, 68, 68, 0.1)',
            border: `1px solid ${uploadStatus.includes('✅') ? 'rgba(0, 204, 102, 0.3)' : 'rgba(255, 68, 68, 0.3)'}`,
            borderRadius: '10px',
            animation: 'fadeIn 0.5s'
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontSize: '20px'}}>
                {uploadStatus.includes('✅') ? '✅' : '❌'}
              </span>
              <span>{uploadStatus}</span>
            </div>
          </div>
        )}
        
        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '25px',
            borderRadius: '15px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{marginTop: 0, marginBottom: '20px'}}>Recent Uploads</h3>
            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              paddingRight: '10px'
            }}>
              {recentUploads.map((upload, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${upload.status === 'success' ? '#00cc66' : '#ff4444'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{fontWeight: '600'}}>{upload.name}</div>
                    {upload.size && (
                      <div style={{fontSize: '12px', opacity: '0.7', marginTop: '3px'}}>
                        {formatFileSize(upload.size)}
                      </div>
                    )}
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{
                      color: upload.status === 'success' ? '#00cc66' : '#ff4444',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {upload.status === 'success' ? '✅ Success' : '❌ Failed'}
                    </div>
                    <div style={{fontSize: '11px', opacity: '0.6', marginTop: '3px'}}>
                      {upload.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginTop: '30px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 102, 255, 0.1)',
            borderRadius: '12px'
          }}>
            <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '5px'}}>
              {recentUploads.filter(u => u.status === 'success').length}
            </div>
            <div style={{opacity: '0.8', fontSize: '14px'}}>Successful</div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 204, 102, 0.1)',
            borderRadius: '12px'
          }}>
            <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '5px'}}>
              {formatFileSize(storageUsed)}
            </div>
            <div style={{opacity: '0.8', fontSize: '14px'}}>Storage Used</div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'rgba(255, 153, 0, 0.1)',
            borderRadius: '12px'
          }}>
            <div style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '5px'}}>
              {recentUploads.length}
            </div>
            <div style={{opacity: '0.8', fontSize: '14px'}}>Total Files</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;