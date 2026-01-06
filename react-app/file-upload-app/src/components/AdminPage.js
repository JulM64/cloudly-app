import React from 'react';
import { useUser } from '../contexts/UserContext';

const AdminPage = () => {
  const { user } = useUser();

  // Only SUPER_ADMIN can access this page
  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '40px',
        borderRadius: '15px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        textAlign: 'center'
      }}>
        <div style={{fontSize: '64px', marginBottom: '20px'}}>🚫</div>
        <h2 style={{color: '#333', marginBottom: '15px'}}>Access Denied</h2>
        <p style={{color: '#666'}}>
          You need to be a SUPER_ADMIN to access this page.
          <br />
          Your current role: <strong>{user?.role}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '40px',
      borderRadius: '15px',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>⚙️ Admin Panel</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Welcome, Super Admin {user?.firstName}! Manage system settings here.
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {/* Admin Cards */}
        <div style={{
          padding: '25px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{fontSize: '32px', marginBottom: '15px', color: '#9c27b0'}}>👑</div>
          <h3>User Management</h3>
          <p style={{color: '#666', fontSize: '14px'}}>
            Manage users, roles, and permissions
          </p>
          <button style={{
            marginTop: '15px',
            padding: '10px 20px',
            backgroundColor: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Manage Users
          </button>
        </div>
        
        <div style={{
          padding: '25px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{fontSize: '32px', marginBottom: '15px', color: '#2196f3'}}>🔒</div>
          <h3>Security Settings</h3>
          <p style={{color: '#666', fontSize: '14px'}}>
            Configure security and access controls
          </p>
          <button style={{
            marginTop: '15px',
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Security Settings
          </button>
        </div>
        
        <div style={{
          padding: '25px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{fontSize: '32px', marginBottom: '15px', color: '#4caf50'}}>📊</div>
          <h3>System Analytics</h3>
          <p style={{color: '#666', fontSize: '14px'}}>
            View system usage and performance metrics
          </p>
          <button style={{
            marginTop: '15px',
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;