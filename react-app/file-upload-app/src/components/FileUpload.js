// src/components/FileUpload.js - COMPLETE VERSION
import React, { useState } from 'react';

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      progress: 0
    }))]);
  };

  const handleUpload = async () => {
    setUploading(true);
    
    // Simulate upload progress
    const uploadSimulation = files.map((fileItem, index) => {
      return new Promise(resolve => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setFiles(prev => prev.map((item, i) => 
            i === index ? { ...item, progress: Math.min(progress, 100) } : item
          ));
          
          if (progress >= 100) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    });

    await Promise.all(uploadSimulation);
    
    // Wait a bit then clear
    setTimeout(() => {
      setUploading(false);
      setFiles([]);
    }, 500);
  };

  const removeFile = (id) => {
    setFiles(files.filter(item => item.id !== id));
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
      progress: 0
    }))]);
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
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? '#0066ff' : '#ddd'}`,
          borderRadius: '12px',
          padding: '50px 20px',
          textAlign: 'center',
          marginBottom: '30px',
          cursor: 'pointer',
          backgroundColor: dragOver ? 'rgba(0, 102, 255, 0.05)' : '#f8f9fa',
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
        />
        <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>📁</div>
          <p style={{ color: '#333', marginBottom: '8px', fontWeight: '600', fontSize: '18px' }}>
            Drag & Drop files here
          </p>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            or click to browse files
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Max file size: 100MB • Supports all file types
          </p>
        </label>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ color: '#333', margin: 0 }}>
              Selected Files ({files.length})
            </h4>
            <button
              onClick={() => setFiles([])}
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
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {files.map((fileItem, index) => (
              <div key={fileItem.id} className="table-row" style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: `4px solid #0066ff`,
                animation: `fadeIn 0.3s ease-out ${index * 0.1}s both`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    <span style={{ fontSize: '24px' }}>
                      {getFileIcon(fileItem.file.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {fileItem.file.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {formatFileSize(fileItem.file.size)}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Progress Bar */}
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
                          backgroundColor: '#0066ff',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', textAlign: 'center', marginTop: '4px' }}>
                        {fileItem.progress}%
                      </div>
                    </div>
                    
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
          opacity: files.length > 0 ? 1 : 0.6,
          cursor: files.length > 0 ? 'pointer' : 'not-allowed'
        }}
      >
        {uploading ? (
          <>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '10px' }}>
              ⏳
            </span>
            Uploading {files.length} file{files.length !== 1 ? 's' : ''}...
          </>
        ) : (
          `📤 Upload ${files.length} File${files.length !== 1 ? 's' : ''}`
        )}
      </button>
    </div>
  );
};

export default FileUpload;