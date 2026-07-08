// src/pages/SettingsPage.js - COMPLETE VERSION with real functionality
import React, { useState, useEffect } from 'react';
import cognitoService from '../services/cognitoService';

const TABS = [
  { key: 'profile', label: '👤 Profile' },
  { key: 'security', label: '🔒 Security' },
  { key: 'notifications', label: '🔔 Notifications' },
  { key: 'appearance', label: '🎨 Appearance' },
];

const DEFAULT_NOTIFICATIONS = {
  emailNotifications: true,
  fileNotifications: true,
  autoBackup: true,
  emailDigest: true,
};

const SettingsPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  // ---------- Profile ----------
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    department: user?.department || 'N/A',
    role: user?.role || 'N/A',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // ---------- Security ----------
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // ---------- Notifications ----------
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  // ---------- Appearance ----------
  const [theme, setTheme] = useState('light');

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('cloudly_notifications');
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
      const savedTheme = localStorage.getItem('cloudly_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }, []);

  // ---------- Handlers ----------
  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await cognitoService.updateUserAttributes({
        given_name: profile.firstName,
        family_name: profile.lastName,
      });
      setProfileMessage({ type: 'success', text: '✅ Profile updated successfully!' });
    } catch (err) {
      console.error(err);
      setProfileMessage({ type: 'error', text: `❌ Failed to update profile: ${err.message || err}` });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMessage(null), 4000);
    }
  };

  const handlePasswordFieldChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage({ type: 'error', text: '❌ Please fill in all password fields.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: '❌ New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: '❌ New password must be at least 8 characters.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await cognitoService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      setPasswordMessage({ type: 'success', text: '✅ Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      setPasswordMessage({ type: 'error', text: `❌ ${err.message || 'Failed to change password.'}` });
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMessage(null), 5000);
    }
  };

  const handleToggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('cloudly_notifications', JSON.stringify(updated));
      return updated;
    });
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('cloudly_theme', newTheme);
    // Optional: apply immediately to document
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // ---------- Styles ----------
  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: '#555',
    fontWeight: '500',
  };

  const messageStyle = (type) => ({
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500',
    backgroundColor: type === 'success' ? '#e6f7ec' : '#fdecea',
    color: type === 'success' ? '#1e7e34' : '#c62828',
  });

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ textAlign: 'left' }}>⚙️ Settings</h1>
      <p className="page-description" style={{ textAlign: 'left', marginBottom: '30px' }}>
        Manage your account preferences and notification settings
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #eee' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? '700' : '500',
              color: activeTab === tab.key ? '#0066ff' : '#666',
              borderBottom: activeTab === tab.key ? '3px solid #0066ff' : '3px solid transparent',
              fontSize: '15px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="page-card">
        {/* ---------------- PROFILE TAB ---------------- */}
        {activeTab === 'profile' && (
          <div>
            <h3>👤 Profile Information</h3>
            {profileMessage && <div style={messageStyle(profileMessage.type)}>{profileMessage.text}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => handleProfileChange('firstName', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => handleProfileChange('lastName', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  style={{ ...inputStyle, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Department</label>
                <input
                  type="text"
                  value={profile.department}
                  disabled
                  style={{ ...inputStyle, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  style={{ ...inputStyle, backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn-3d"
                onClick={handleSaveProfile}
                disabled={profileSaving}
                style={{ padding: '12px 24px', fontWeight: '600' }}
              >
                {profileSaving ? '⏳ Saving...' : '💾 Save Profile'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- SECURITY TAB ---------------- */}
        {activeTab === 'security' && (
          <div>
            <h3>🔒 Change Password</h3>
            {passwordMessage && <div style={messageStyle(passwordMessage.type)}>{passwordMessage.text}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '500px' }}>
              <div>
                <label style={labelStyle}>Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <button
                className="btn-3d"
                onClick={handleChangePassword}
                disabled={passwordSaving}
                style={{ padding: '12px 24px', fontWeight: '600', alignSelf: 'flex-start' }}
              >
                {passwordSaving ? '⏳ Updating...' : '🔑 Update Password'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- NOTIFICATIONS TAB ---------------- */}
        {activeTab === 'notifications' && (
          <div>
            <h3>🔔 Notification Preferences</h3>
            {[
              { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about your files' },
              { key: 'fileNotifications', label: 'File Notifications', description: 'Get notified when files are shared with you' },
              { key: 'autoBackup', label: 'Auto Backup', description: 'Automatically backup your files daily' },
              { key: 'emailDigest', label: 'Weekly Email Digest', description: 'Receive a weekly summary of your activity' },
            ].map((setting) => (
              <div
                key={setting.key}
                onClick={() => handleToggleNotification(setting.key)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: '#333', fontSize: '15px' }}>{setting.label}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{setting.description}</div>
                </div>
                <div
                  style={{
                    width: '50px',
                    height: '26px',
                    backgroundColor: notifications[setting.key] ? '#0066ff' : '#ccc',
                    borderRadius: '13px',
                    position: 'relative',
                    transition: 'background-color 0.3s',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: notifications[setting.key] ? '27px' : '3px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.3s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>
            ))}
            <p style={{ fontSize: '13px', color: '#888', marginTop: '15px' }}>
              💡 Preferences are saved automatically to this browser.
            </p>
          </div>
        )}

        {/* ---------------- APPEARANCE TAB ---------------- */}
        {activeTab === 'appearance' && (
          <div>
            <h3>🎨 Appearance</h3>
            <p style={{ color: '#666', marginBottom: '20px' }}>Choose how Cloudly looks to you.</p>

            <div style={{ display: 'flex', gap: '20px' }}>
              {[
                { key: 'light', label: '☀️ Light Mode' },
                { key: 'dark', label: '🌙 Dark Mode' },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => handleThemeChange(opt.key)}
                  style={{
                    flex: 1,
                    padding: '30px 20px',
                    textAlign: 'center',
                    borderRadius: '12px',
                    border: theme === opt.key ? '3px solid #0066ff' : '2px solid #eee',
                    backgroundColor: theme === opt.key ? '#f0f6ff' : '#fafafa',
                    cursor: 'pointer',
                    fontWeight: theme === opt.key ? '700' : '500',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                  {theme === opt.key && <div style={{ marginTop: '8px', fontSize: '13px', color: '#0066ff' }}>✓ Active</div>}
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#888', marginTop: '15px' }}>
              💡 Theme preference is saved to this browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;