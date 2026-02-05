// src/pages/LoginPage.js - WITH AWS COGNITO AUTHENTICATION
import React, { useState } from 'react';
import cognitoService from '../services/cognitoService';

const LoginPage = ({ onLoginSuccess, onNewPasswordRequired, setMessage }) => {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'confirm', 'forgot', 'reset'
  const [loading, setLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [confirmCode, setConfirmCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const departments = [
    'Engineering',
    'Marketing',
    'Sales',
    'HR',
    'Finance',
    'Operations',
    'IT',
    'Legal'
  ];

  // Show message (use parent setMessage if available, otherwise local)
  const showMessage = (msg) => {
    if (setMessage) {
      setMessage(msg);
    } else {
      setLocalMessage(msg);
      setTimeout(() => setLocalMessage(''), 5000);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');

    try {
      const userData = await cognitoService.signIn(email, password);
      
      showMessage('✅ Login successful!');
      
      if (onLoginSuccess) {
        onLoginSuccess(userData);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.code === 'UserNotConfirmedException') {
        showMessage('⚠️ Please confirm your email first');
        setMode('confirm');
      } else if (error.code === 'NewPasswordRequired') {
        showMessage('⚠️ Please set a new password');
        if (onNewPasswordRequired) {
          onNewPasswordRequired(error.cognitoUser, error.userAttributes);
        }
      } else {
        showMessage(`❌ ${error.message || 'Login failed'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');

    try {
      await cognitoService.signUp(email, password, firstName, lastName, department);
      
      showMessage('✅ Sign up successful! Please check your email for verification code.');
      setMode('confirm');
    } catch (error) {
      console.error('Sign up error:', error);
      showMessage(`❌ ${error.message || 'Sign up failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Confirmation
  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');

    try {
      await cognitoService.confirmSignUp(email, confirmCode);
      
      showMessage('✅ Email confirmed! You can now login.');
      setTimeout(() => {
        setMode('login');
      }, 1500);
    } catch (error) {
      console.error('Confirmation error:', error);
      showMessage(`❌ ${error.message || 'Confirmation failed'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');

    try {
      await cognitoService.forgotPassword(email);
      showMessage('✅ Password reset code sent to your email');
      setMode('reset');
    } catch (error) {
      console.error('Forgot password error:', error);
      showMessage(`❌ ${error.message || 'Failed to send reset code'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');

    try {
      await cognitoService.confirmPassword(email, confirmCode, newPassword);
      showMessage('✅ Password reset successful! You can now login.');
      setTimeout(() => {
        setMode('login');
      }, 1500);
    } catch (error) {
      console.error('Reset password error:', error);
      showMessage(`❌ ${error.message || 'Password reset failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const displayMessage = localMessage || '';

  return (
    <div className="upload-wrapper" style={{ maxWidth: '500px' }}>
      <div className="page-card" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        {/* Header */}
        <h1 className="section-title" style={{ textAlign: 'center', marginBottom: '10px' }}>
          {mode === 'login' && '🔐 Welcome Back'}
          {mode === 'signup' && '📝 Create Account'}
          {mode === 'confirm' && '✉️ Confirm Email'}
          {mode === 'forgot' && '🔑 Reset Password'}
          {mode === 'reset' && '🔑 Set New Password'}
        </h1>
        <p className="page-description" style={{ textAlign: 'center', marginBottom: '30px' }}>
          {mode === 'login' && 'Sign in with AWS Cognito'}
          {mode === 'signup' && 'Join Cloudly and start uploading files'}
          {mode === 'confirm' && 'Enter the code sent to your email'}
          {mode === 'forgot' && 'We\'ll send you a reset code'}
          {mode === 'reset' && 'Enter the code and your new password'}
        </p>

        {/* Message Banner */}
        {displayMessage && (
          <div style={{
            padding: '12px',
            backgroundColor: displayMessage.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 
                           displayMessage.includes('⚠️') ? 'rgba(255, 152, 0, 0.1)' :
                           'rgba(244, 67, 54, 0.1)',
            border: `1px solid ${displayMessage.includes('✅') ? '#4CAF50' : 
                                displayMessage.includes('⚠️') ? '#ff9800' :
                                '#f44336'}`,
            borderRadius: '8px',
            color: displayMessage.includes('✅') ? '#4CAF50' : 
                   displayMessage.includes('⚠️') ? '#ff9800' :
                   '#f44336',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px'
          }}>
            {displayMessage}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>

            <button
              type="button"
              onClick={() => setMode('forgot')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0066ff',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '20px'
              }}
            >
              Forgot password?
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {loading ? '⏳ Signing in...' : '🚀 Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0066ff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Sign up
              </button>
            </div>

            {/* Test Accounts Info */}
            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px', fontWeight: '600' }}>
                🧪 Test Accounts:
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                Admin: admin@cloudly.com / TempAdmin123!
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                User: user@cloudly.com / TempUser123!
              </p>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '10px' }}>
                First login will require password change
              </p>
            </div>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                  First Name
                </label>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  className="hover-card"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '15px'
                  }}
                  className="hover-card"
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="john.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  backgroundColor: 'white'
                }}
                className="hover-card"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters, include uppercase, number & symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {loading ? '⏳ Creating account...' : '📝 Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0066ff',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Sign in
              </button>
            </div>
          </form>
        )}

        {/* Confirm Email Form */}
        {mode === 'confirm' && (
          <form onSubmit={handleConfirm}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Verification Code
              </label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                required
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '20px',
                  textAlign: 'center',
                  letterSpacing: '5px'
                }}
                className="hover-card"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {loading ? '⏳ Verifying...' : '✅ Confirm Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0066ff',
                  cursor: 'pointer'
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        )}

        {/* Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
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
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {loading ? '⏳ Sending code...' : '📧 Send Reset Code'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0066ff',
                  cursor: 'pointer'
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        )}

        {/* Reset Password Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Verification Code
              </label>
              <input
                type="text"
                placeholder="Enter code from email"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                className="hover-card"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-3d"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {loading ? '⏳ Resetting...' : '🔑 Reset Password'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0066ff',
                  cursor: 'pointer'
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;