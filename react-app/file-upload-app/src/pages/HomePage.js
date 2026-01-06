// src/pages/HomePage.js - COMPLETE VERSION
import React from 'react';
import FileUpload from '../components/FileUpload';

const HomePage = ({ user }) => {
  return (
    <div className="upload-wrapper">
      <h1 className="section-title">Welcome back, {user.firstName}!</h1>
      <p className="page-description" style={{ marginBottom: '40px' }}>
        Upload, share, and manage your files in the cloud.
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
          <FileUpload />
        </div>
        
        <div className="hover-card" style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '25px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#333', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📈 Storage Overview
          </h3>
          
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ color: '#333', fontWeight: '500' }}>Used: 3.2 GB</span>
              <span style={{ color: '#666' }}>of 10 GB</span>
            </div>
            <div style={{
              height: '12px',
              backgroundColor: '#e0e0e0',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '5px'
            }}>
              <div className="progress-bar-animated" style={{
                width: '32%',
                height: '100%',
                borderRadius: '6px'
              }}></div>
            </div>
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
              32% used
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { type: '📄 Documents', size: '1.2 GB', color: '#4caf50', percent: 12 },
              { type: '🖼️ Images', size: '850 MB', color: '#ff9800', percent: 8.5 },
              { type: '🎥 Videos', size: '950 MB', color: '#9c27b0', percent: 9.5 },
              { type: '📦 Other', size: '200 MB', color: '#607d8b', percent: 2 }
            ].map((item, index) => (
              <div key={index} className="table-row" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    backgroundColor: item.color,
                    borderRadius: '50%'
                  }}></div>
                  <span style={{ color: '#333', fontWeight: '500' }}>{item.type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#666', fontWeight: '600' }}>{item.size}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{item.percent}%</div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="btn-3d" style={{
            width: '100%',
            marginTop: '25px',
            padding: '12px',
            fontSize: '15px'
          }}>
            📊 View Detailed Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;