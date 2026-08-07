// src/pages/OrgSignupPage.js - Public page for creating a brand-new organization
// (and its first Super Admin). Regular members are added afterward via the
// existing Admin Panel "Create User" flow — they don't sign up themselves.
import React, { useState } from 'react';
import apiService from '../services/apiService';
import cognitoService from '../services/cognitoService';

const inputStyle = { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' };
const labelStyle = { display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500', fontSize: '14px' };
const messageStyle = (type) => ({
  padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: '500',
  backgroundColor: type === 'success' ? '#e6f7ec' : '#fdecea',
  color: type === 'success' ? '#1e7e34' : '#c62828',
});

const OrgSignupPage = ({ onSignupComplete }) => {
  const [step, setStep] = useState('details'); // 'details' | 'confirm'
  const [form, setForm] = useState({ orgName: '', firstName: '', lastName: '', adminEmail: '', adminPassword: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.orgName.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.adminEmail.trim() || !form.adminPassword) {
      setMessage({ type: 'error', text: '❌ Please fill in all fields.' });
      return;
    }
    if (form.adminPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: '❌ Passwords do not match.' });
      return;
    }
    if (form.adminPassword.length < 8) {
      setMessage({ type: 'error', text: '❌ Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    try {
      await apiService.createOrganization({
        orgName: form.orgName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      setMessage({ type: 'success', text: '✅ Organization created! Check your email for a verification code.' });
      setStep('confirm');
    } catch (err) {
      setMessage({ type: 'error', text: `❌ ${err.message || 'Failed to create organization.'}` });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!code.trim()) {
      setMessage({ type: 'error', text: '❌ Please enter the verification code from your email.' });
      return;
    }
    setLoading(true);
    try {
      await cognitoService.confirmSignUp(form.adminEmail.trim(), code.trim());
      setMessage({ type: 'success', text: '✅ Account verified! You can now log in.' });
      setTimeout(() => onSignupComplete?.(), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: `❌ ${err.message || 'Invalid or expired code.'}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '60px auto', padding: '20px' }}>
      <div className="page-card" style={{ padding: '40px' }}>
        <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '4px' }}>
          {step === 'details' ? '🏢 Create Your Organization' : '📧 Verify Your Email'}
        </h1>
        <p className="page-description" style={{ textAlign: 'left', marginBottom: '28px' }}>
          {step === 'details'
            ? "Set up your own space in Cloudly — you'll be the first admin."
            : `We sent a code to ${form.adminEmail}. Enter it below to activate your account.`}
        </p>

        {message && <div style={messageStyle(message.type)}>{message.text}</div>}

        {step === 'details' ? (
          <form onSubmit={handleSubmitDetails}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Organization Name</label>
              <input type="text" value={form.orgName} onChange={(e) => handleChange('orgName', e.target.value)} placeholder="e.g., Acme Corp" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input type="text" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input type="text" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Your Email</label>
              <input type="email" value={form.adminEmail} onChange={(e) => handleChange('adminEmail', e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={form.adminPassword} onChange={(e) => handleChange('adminPassword', e.target.value)} placeholder="Min 8 characters" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '26px' }}>
              <label style={labelStyle}>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} className="btn-3d" style={{ width: '100%', padding: '14px', fontWeight: '700', fontSize: '15px' }}>
              {loading ? '⏳ Creating…' : '🚀 Create Organization'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirmCode}>
            <div style={{ marginBottom: '26px' }}>
              <label style={labelStyle}>Verification Code</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} className="btn-3d" style={{ width: '100%', padding: '14px', fontWeight: '700', fontSize: '15px' }}>
              {loading ? '⏳ Verifying…' : '✅ Verify & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrgSignupPage;