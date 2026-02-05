// src/pages/HomePage.js - WITH S3 INTEGRATION
import React from 'react';
import FileUpload from '../components/FileUpload';

const HomePage = ({ user, setMessage }) => {
  return (
    <div className="upload-wrapper">
      <h1 className="section-title">Welcome back, {user.firstName}!</h1>
      <p className="page-description" style={{ marginBottom: '40px' }}>
        Upload files to your department's S3 bucket
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '30px' }}>
        <div className="hover-card" style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📤 File Upload
          </h3>
          <FileUpload user={user} onUploadSuccess={setMessage} />
        </div>
        
        <div className="hover-card" style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Your Info
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              borderLeft: '4px solid #0066ff'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</div>
              <div style={{ fontWeight: '600', color: '#333' }}>{user.email}</div>
            </div>
            
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              borderLeft: '4px solid #4caf50'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Department</div>
              <div style={{ fontWeight: '600', color: '#333' }}>{user.department}</div>
            </div>
            
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              borderLeft: '4px solid #9c27b0'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Role</div>
              <div style={{ fontWeight: '600', color: '#333', textTransform: 'capitalize' }}>
                {user.role.toLowerCase().replace('_', ' ')}
              </div>
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              borderLeft: '4px solid #ff9800'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>S3 Bucket</div>
              <div style={{ fontWeight: '600', color: '#333', fontSize: '13px' }}>
                cloudly-dept-{user.department?.toLowerCase()}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px' }}>
            <div style={{ fontSize: '13px', color: '#0066ff', fontWeight: '600', marginBottom: '8px' }}>
              ℹ️ Upload Information
            </div>
            <ul style={{ fontSize: '12px', color: '#666', margin: 0, paddingLeft: '20px' }}>
              <li>Files stored in AWS S3</li>
              <li>Department-based buckets</li>
              <li>Secure cloud storage</li>
              <li>Max size: 100MB per file</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;