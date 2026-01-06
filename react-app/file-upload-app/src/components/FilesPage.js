import React from 'react';
import { useUser } from '../contexts/UserContext';

const FilesPage = () => {
  const { user } = useUser();

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '40px',
      borderRadius: '15px',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>📁 Files Browser</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Welcome, {user?.firstName}! This is the files management page.
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {/* File Cards */}
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{fontSize: '32px', marginBottom: '10px'}}>📄</div>
          <h3>Documents</h3>
          <p style={{fontSize: '14px', color: '#666'}}>12 files</p>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{fontSize: '32px', marginBottom: '10px'}}>🖼️</div>
          <h3>Images</h3>
          <p style={{fontSize: '14px', color: '#666'}}>8 files</p>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{fontSize: '32px', marginBottom: '10px'}}>📊</div>
          <h3>Spreadsheets</h3>
          <p style={{fontSize: '14px', color: '#666'}}>5 files</p>
        </div>
      </div>
    </div>
  );
};

export default FilesPage;