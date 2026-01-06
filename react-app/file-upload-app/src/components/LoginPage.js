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

  return (
    <div className="upload-wrapper">
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h1 className="section-title">🔐 Sign In</h1>
        
        <div className="page-card">
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '15px',
                marginBottom: '15px',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            />
            
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '15px',
                marginBottom: '15px',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.1)'
              }}
            />
            
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{ width: '100%', padding: '15px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p>Test credentials:</p>
            <div style={{ fontSize: '14px', color: '#666' }}>
              <p>admin@cloudly.com / Admin123!</p>
              <p>user@cloudly.com / User123!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;