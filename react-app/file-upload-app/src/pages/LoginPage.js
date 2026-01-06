// src/pages/LoginPage.js - COMPLETE VERSION
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = ({ login, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    }
  };

  const testCredentials = [
    { email: 'admin@cloudly.com', password: 'Admin123!', label: '👑 Admin Account', color: '#9c27b0' },
    { email: 'user@cloudly.com', password: 'User123!', label: '👤 User Account', color: '#4caf50' },
    { email: 'demo@cloudly.com', password: 'Demo123!', label: '🎯 Demo Account', color: '#ff9800' }
  ];

  const handleTestLogin = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    
    // Auto-submit after a short delay
    setTimeout(() => {
      document.querySelector('form').dispatchEvent(new Event('submit'));
    }, 100);
  };

  return (
    <div className="upload-wrapper" style={{ maxWidth: '500px' }}>
      <div className="page-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <h1 className="section-title" style={{ textAlign: 'center', marginBottom: '10px' }}>🔐 Welcome Back</h1>
        <p className="page-description" style={{ textAlign: 'center', marginBottom: '40px' }}>
          Sign in to access your cloud storage and files
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#555', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'all 0.3s'
              }}
              className="hover-card"
            />
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#555', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'all 0.3s'
              }}
              className="hover-card"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-3d"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {loading ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', marginRight: '10px' }}>
                  ⏳
                </span>
                Signing in...
              </>
            ) : '🚀 Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '30px' }}>
          <h3 style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '16px' }}>
            Quick Test Accounts
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testCredentials.map((cred, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTestLogin(cred)}
                className="hover-card"
                style={{
                  padding: '15px',
                  backgroundColor: `${cred.color}20`,
                  color: cred.color,
                  border: `2px solid ${cred.color}30`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s',
                  animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {cred.label.includes('Admin') ? '👑' : 
                     cred.label.includes('User') ? '👤' : '🎯'}
                  </span>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>{cred.label}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
                      {cred.email}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
            <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '10px' }}>
              <strong>Note:</strong> These are mock accounts for testing
            </p>
            <p style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
              In a production environment, these would be real user accounts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;