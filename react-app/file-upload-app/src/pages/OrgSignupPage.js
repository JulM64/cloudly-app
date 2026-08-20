// src/pages/OrgSignupPage.js - Public page for creating a brand-new organization
import React, { useState } from 'react';
import apiService from '../services/apiService';
import cognitoService from '../services/cognitoService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import logoWordmark from '../assets/logo-wordmark.png';

const OrgSignupPage = ({ onSignupComplete }) => {
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({ orgName: '', firstName: '', lastName: '', adminEmail: '', adminPassword: '', confirmPassword: '' });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmitDetails = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!form.orgName.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.adminEmail.trim() || !form.adminPassword) {
      setMessage({ type: 'danger', text: 'Please fill in all fields.' });
      return;
    }
    if (form.adminPassword !== form.confirmPassword) { setMessage({ type: 'danger', text: 'Passwords do not match.' }); return; }
    if (form.adminPassword.length < 8) { setMessage({ type: 'danger', text: 'Password must be at least 8 characters.' }); return; }

    setLoading(true);
    try {
      await apiService.createOrganization({
        orgName: form.orgName.trim(), adminEmail: form.adminEmail.trim(), adminPassword: form.adminPassword,
        firstName: form.firstName.trim(), lastName: form.lastName.trim(),
      });
      setMessage({ type: 'success', text: 'Organization created. Check your email for a verification code.' });
      setStep('confirm');
    } catch (err) { setMessage({ type: 'danger', text: err.message || 'Failed to create organization.' }); }
    finally { setLoading(false); }
  };

  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!code.trim()) { setMessage({ type: 'danger', text: 'Please enter the verification code from your email.' }); return; }
    setLoading(true);
    try {
      await cognitoService.confirmSignUp(form.adminEmail.trim(), code.trim());
      setMessage({ type: 'success', text: 'Account verified. You can now log in.' });
      setTimeout(() => onSignupComplete?.(), 1500);
    } catch (err) { setMessage({ type: 'danger', text: err.message || 'Invalid or expired code.' }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '48px auto', padding: '0 20px' }}>
      <Card>
        <img src={logoWordmark} alt="Cloudly" style={{ height: '48px', width: 'auto', display: 'block', marginBottom: '20px' }} />
        <h1 style={{ textAlign: 'left', marginBottom: '4px', fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--c-text)' }}>
          {step === 'details' ? 'Create your organization' : 'Verify your email'}
        </h1>
        <p style={{ textAlign: 'left', marginBottom: '24px', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
          {step === 'details' ? "Set up your own space in Cloudly — you'll be the first admin." : `We sent a code to ${form.adminEmail}. Enter it below to activate your account.`}
        </p>

        {message && <div className={`ui-banner ui-banner--${message.type}`} style={{ marginBottom: '20px' }}>{message.text}</div>}

        {step === 'details' ? (
          <form onSubmit={handleSubmitDetails}>
            <div className="ui-field">
              <label className="ui-label">Organization name</label>
              <input className="ui-input" type="text" value={form.orgName} onChange={(e) => handleChange('orgName', e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <div className="cl-form-pair">
              <div className="ui-field">
                <label className="ui-label">First name</label>
                <input className="ui-input" type="text" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
              </div>
              <div className="ui-field">
                <label className="ui-label">Last name</label>
                <input className="ui-input" type="text" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
              </div>
            </div>
            <div className="ui-field">
              <label className="ui-label">Your email</label>
              <input className="ui-input" type="email" value={form.adminEmail} onChange={(e) => handleChange('adminEmail', e.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label">Password</label>
              <input className="ui-input" type="password" value={form.adminPassword} onChange={(e) => handleChange('adminPassword', e.target.value)} placeholder="Min 8 characters" />
            </div>
            <div className="ui-field">
              <label className="ui-label">Confirm password</label>
              <input className="ui-input" type="password" value={form.confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Create organization</Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmCode}>
            <div className="ui-field">
              <label className="ui-label">Verification code</label>
              <input className="ui-input" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" />
            </div>
            <Button type="submit" loading={loading} style={{ width: '100%' }}>Verify &amp; continue</Button>
          </form>
        )}
      </Card>
    </div>
  );
};

export default OrgSignupPage;