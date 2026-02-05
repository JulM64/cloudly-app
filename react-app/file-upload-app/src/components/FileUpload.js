// src/components/FileUpload.js - WITH S3 UPLOAD INTEGRATION
import React, { useState } from 'react';
import s3Service from '../services/s3Service';

const FileUpload = ({ user, onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      progress: 0,
      uploaded: false,
      error: null
    }))]);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadError(null);
    
    try {
      // Check if user has department
      if (!user.department) {
        throw new Error('User department not found. Please update your profile.');
      }

      const filesToUpload = files.map(item => item.file);
      
      // Upload all files to S3
      const uploadedFiles = await s3Service.uploadMultipleFiles(
        filesToUpload,
        user.department,
        user.userId,
        (progress) => {
          // Update progress for all files
          setFiles(prev => prev.map(item => ({
            ...item,
            progress: Math.floor(progress)
          })));
        }
      );
      
      // Mark all as uploaded
      setFiles(prev => prev.map(item => ({
        ...item,
        progress: 100,
        uploaded: true
      })));
      
      console.log('✅ Files uploaded to S3:', uploadedFiles);
      
      // Save metadata to backend
      for (const uploadedFile of uploadedFiles) {
        try {
          await saveFileMetadata(uploadedFile);
        } catch (error) {
          console.error('Failed to save metadata:', error);
        }
      }
      
      // Show success message
      if (onUploadSuccess) {
        onUploadSuccess(`✅ ${files.length} file${files.length !== 1 ? 's' : ''} uploaded to S3!`);
      }
      
      // Clear files after short delay
      setTimeout(() => {
        setFiles([]);
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Upload failed. Please try again.');
      
      // Mark all as error
      setFiles(prev => prev.map(item => ({
        ...item,
        error: error.message,
        progress: 0
      })));
    } finally {
      setUploading(false);
    }
  };

  // Save file metadata to backend
  const saveFileMetadata = async (uploadedFile) => {
    const user = JSON.parse(localStorage.getItem('cloudly_user'));
    if (!user || !user.idToken) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/files/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.idToken}`
        },
        body: JSON.stringify({
          fileName: uploadedFile.fileName,
          originalName: uploadedFile.fileName,
          s3Key: uploadedFile.key,
          s3Bucket: uploadedFile.bucket,
          fileSize: uploadedFile.fileSize,
          fileType: uploadedFile.fileType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save file metadata');
      }

      console.log('✅ File metadata saved to backend');
    } catch (error) {
      console.error('Error saving metadata:', error);
      throw error;
    }
  };

  const removeFile = (id) => {
    setFiles(files.filter(item => item.id !== id));
    setUploadError(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      progress: 0,
      uploaded: false,
      error: null
    }))]);
    setUploadError(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    return '📁';
  };

  return (
    <div>
      {/* Info Banner */}
      {user && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(0, 102, 255, 0.1)',
          border: '1px solid rgba(0, 102, 255, 0.3)',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#0066ff'
        }}>
          ☁️ Files will be uploaded to: <strong>cloudly-dept-{user.department?.toLowerCase()}</strong>
        </div>
      )}

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#0066ff' : uploadError ? '#ff4444' : '#ddd'}`,
          borderRadius: '12px',
          padding: '50px 20px',
          textAlign: 'center',
          marginBottom: '30px',
          cursor: 'pointer',
          backgroundColor: dragOver ? 'rgba(0, 102, 255, 0.05)' : uploadError ? 'rgba(255, 68, 68, 0.05)' : '#f8f9fa',
          transition: 'all 0.3s ease'
        }}
        className="hover-card"
      >
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input"
          disabled={uploading}
        />
        <label htmlFor="file-input" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>
            {uploading ? '⏳' : uploadError ? '❌' : '☁️'}
          </div>
          <p style={{ color: '#333', marginBottom: '8px', fontWeight: '600', fontSize: '18px' }}>
            {uploading ? 'Uploading to S3...' : uploadError ? 'Upload failed' : 'Drag & Drop files here'}
          </p>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            {uploading ? 'Please wait...' : 'or click to browse files'}
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Max file size: 100MB • Supports all file types
          </p>
        </label>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid #ff4444',
          borderRadius: '8px',
          color: '#ff4444',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <strong>Error:</strong> {uploadError}
        </div>
      )}

      {/* Selected Files */}
      {files.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ color: '#333', margin: 0 }}>
              Selected Files ({files.length})
            </h4>
            {!uploading && (
              <button
                onClick={() => {
                  setFiles([]);
                  setUploadError(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear All
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {files.map((fileItem, index) => (
              <div key={fileItem.id} className="table-row" style={{
                padding: '15px',
                backgroundColor: fileItem.error ? 'rgba(255, 68, 68, 0.05)' : '#f8f9fa',
                borderRadius: '8px',
                borderLeft: `4px solid ${fileItem.error ? '#ff4444' : fileItem.uploaded ? '#4caf50' : '#0066ff'}`,
                animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    <span style={{ fontSize: '24px' }}>
                      {fileItem.uploaded ? '✅' : fileItem.error ? '❌' : getFileIcon(fileItem.file.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {fileItem.file.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {formatFileSize(fileItem.file.size)}
                        {fileItem.error && (
                          <span style={{ color: '#ff4444', marginLeft: '10px' }}>
                            • {fileItem.error}
                          </span>
                        )}
                        {fileItem.uploaded && (
                          <span style={{ color: '#4caf50', marginLeft: '10px' }}>
                            • Uploaded to S3
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Progress Bar */}
                    {!fileItem.error && (
                      <div style={{ width: '100px' }}>
                        <div style={{
                          height: '6px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${fileItem.progress}%`,
                            height: '100%',
                            backgroundColor: fileItem.uploaded ? '#4caf50' : '#0066ff',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
                          {fileItem.uploaded ? 'Complete' : `${fileItem.progress}%`}
                        </div>
                      </div>
                    )}
                    
                    {!uploading && !fileItem.uploaded && (
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#ff4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="btn-3d"
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          opacity: files.length > 0 && !uploading ? 1 : 0.6,
          cursor: files.length > 0 && !uploading ? 'pointer' : 'not-allowed'
        }}
      >
        {uploading ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '10px' }}>
              ⏳
            </span>
            Uploading to S3... {files.length} file{files.length !== 1 ? 's' : ''}
          </>
        ) : files.some(f => f.uploaded) ? (
          '✅ Upload Complete!'
        ) : (
          `☁️ Upload ${files.length} File${files.length !== 1 ? 's' : ''} to S3`
        )}
      </button>
    </div>
  );
};

export default FileUpload;