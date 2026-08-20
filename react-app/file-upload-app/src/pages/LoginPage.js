// src/pages/LoginPage.js - WITH AWS COGNITO AUTHENTICATION
import React, { useState } from 'react';
import cognitoService from '../services/cognitoService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import logoWordmark from '../assets/logo-wordmark.png';

const LoginPage = ({ onLoginSuccess, onNewPasswordRequired, setMessage }) => {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [localMessage, setLocalMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [confirmCode, setConfirmCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT', 'Legal'];

  const showMessage = (msg) => {
    if (setMessage) { setMessage(msg); }
    else { setLocalMessage(msg); setTimeout(() => setLocalMessage(''), 5000); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');
    try {
      const userData = await cognitoService.signIn(email, password);
      showMessage('Login successful.');
      if (onLoginSuccess) onLoginSuccess(userData);
    } catch (error) {
      if (error.code === 'UserNotConfirmedException') {
        showMessage('Please confirm your email first.');
        setMode('confirm');
      } else if (error.code === 'NewPasswordRequired') {
        showMessage('Please set a new password.');
        if (onNewPasswordRequired) onNewPasswordRequired(error.cognitoUser, error.userAttributes);
      } else {
        showMessage(error.message || 'Login failed.');
      }
    } finally { setLoading(false); }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');
    try {
      await cognitoService.signUp(email, password, firstName, lastName, department);
      showMessage('Sign up successful. Check your email for a verification code.');
      setMode('confirm');
    } catch (error) { showMessage(error.message || 'Sign up failed.'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');
    try {
      await cognitoService.confirmSignUp(email, confirmCode);
      showMessage('Email confirmed. You can now log in.');
      setTimeout(() => setMode('login'), 1500);
    } catch (error) { showMessage(error.message || 'Confirmation failed.'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');
    try {
      await cognitoService.forgotPassword(email);
      showMessage('Password reset code sent to your email.');
      setMode('reset');
    } catch (error) { showMessage(error.message || 'Failed to send reset code.'); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    showMessage('');
    try {
      await cognitoService.confirmPassword(email, confirmCode, newPassword);
      showMessage('Password reset successful. You can now log in.');
      setTimeout(() => setMode('login'), 1500);
    } catch (error) { showMessage(error.message || 'Password reset failed.'); }
    finally { setLoading(false); }
  };

  const displayMessage = localMessage || '';
  const bannerTone = displayMessage.toLowerCase().includes('fail') || displayMessage.toLowerCase().includes('please') ? 'warning' : 'success';

  const titles = {
    login: 'Welcome back', signup: 'Create account', confirm: 'Confirm email',
    forgot: 'Reset password', reset: 'Set new password',
  };
  const subtitles = {
    login: 'Sign in with your Cloudly account', signup: 'Join Cloudly and start uploading files',
    confirm: 'Enter the code sent to your email', forgot: "We'll send you a reset code",
    reset: 'Enter the code and your new password',
  };

  return (
    <div style={{ maxWidth: '440px', margin: '48px auto', padding: '0 20px' }}>
      <Card>
        <img src={logoWordmark} alt="Cloudly" className="cl-auth-logo" style={{ display: 'block', margin: '0 auto 20px' }} />
        <h1 style={{ textAlign: 'center', marginBottom: '6px', fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--c-text)' }}>{titles[mode]}</h1>
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>{subtitles[mode]}</p>

        {displayMessage && <div className={`ui-banner ui-banner--${bannerTone}`} style={{ marginBottom: '20px', justifyContent: 'center' }}>{displayMessage}</div>}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="ui-field">
              <label className="ui-label">Email address</label>
              <input className="ui-input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="ui-field">
              <label className="ui-label">Password</label>
              <input className="ui-input" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="button" onClick={() => setMode('forgot')} className="cl-link-btn" style={{ marginBottom: '18px' }}>Forgot password?</button>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Sign in</Button>
            <div style={{ textAlign: 'center', marginTop: '18px', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
              Don't have an account? <button type="button" onClick={() => setMode('signup')} className="cl-link-btn cl-link-btn--strong">Sign up</button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div className="cl-form-pair">
              <div className="ui-field">
                <label className="ui-label">First name</label>
                <input className="ui-input" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="ui-field">
                <label className="ui-label">Last name</label>
                <input className="ui-input" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="ui-field">
              <label className="ui-label">Email address</label>
              <input className="ui-input" type="email" placeholder="john.doe@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="ui-field">
              <label className="ui-label">Department</label>
              <select className="ui-select" value={department} onChange={(e) => setDepartment(e.target.value)} required>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div className="ui-field">
              <label className="ui-label">Password</label>
              <input className="ui-input" type="password" placeholder="Min 8 characters, include uppercase, number & symbol" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Create account</Button>
            <div style={{ textAlign: 'center', marginTop: '18px', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
              Already have an account? <button type="button" onClick={() => setMode('login')} className="cl-link-btn cl-link-btn--strong">Sign in</button>
            </div>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirm}>
            <div className="ui-field">
              <label className="ui-label">Verification code</label>
              <input className="ui-input" type="text" placeholder="Enter 6-digit code" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} required maxLength={6} style={{ textAlign: 'center', letterSpacing: '5px', fontSize: 'var(--fs-lg)' }} />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Confirm email</Button>
            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <button type="button" onClick={() => setMode('login')} className="cl-link-btn">Back to login</button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword}>
            <div className="ui-field">
              <label className="ui-label">Email address</label>
              <input className="ui-input" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Send reset code</Button>
            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <button type="button" onClick={() => setMode('login')} className="cl-link-btn">Back to login</button>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <div className="ui-field">
              <label className="ui-label">Verification code</label>
              <input className="ui-input" type="text" placeholder="Enter code from email" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} required />
            </div>
            <div className="ui-field">
              <label className="ui-label">New password</label>
              <input className="ui-input" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Reset password</Button>
            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <button type="button" onClick={() => setMode('login')} className="cl-link-btn">Back to login</button>
            </div>
          </form>
        )}
      </Card>

      <style>{`
        .cl-link-btn { background:none; border:none; color:var(--c-brand); cursor:pointer; font-size:var(--fs-sm); padding:0; }
        .cl-link-btn--strong { font-weight:600; }
      `}</style>
    </div>
  );
};

export default LoginPage;