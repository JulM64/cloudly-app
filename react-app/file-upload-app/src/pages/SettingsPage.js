// src/pages/SettingsPage.js - COMPLETE VERSION
import React, { useState } from 'react';

const SettingsPage = ({ user }) => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    twoFactorAuth: false,
    autoBackup: true,
    darkMode: false,
    emailDigest: true,
    fileNotifications: true
  });

  const [profile, setProfile] = useState({
    firstName: user.firstName,
    email: user.email,
    jobTitle: 'Software Developer',
    timezone: 'UTC-5 (Eastern Time)'
  });

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // Save settings logic here
    alert('Settings saved successfully!');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ textAlign: 'left' }}>⚙️ Settings</h1>
      <p className="page-description" style={{ textAlign: 'left', marginBottom: '40px' }}>
        Manage your account preferences and notification settings
      </p>
      
      <div className="page-card">
        {/* Profile Information */}
        <div style={{ marginBottom: '40px' }}>
          <h3>👤 Profile Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                First Name
              </label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => handleProfileChange('firstName', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  transition: 'all 0.3s'
                }}
                className="hover-card"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange('email', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  transition: 'all 0.3s'
                }}
                className="hover-card"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Job Title
              </label>
              <input
                type="text"
                value={profile.jobTitle}
                onChange={(e) => handleProfileChange('jobTitle', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  transition: 'all 0.3s'
                }}
                className="hover-card"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '500' }}>
                Timezone
              </label>
              <select
                value={profile.timezone}
                onChange={(e) => handleProfileChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  backgroundColor: 'white',
                  transition: 'all 0.3s'
                }}
                className="hover-card"
              >
                <option value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</option>
                <option value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</option>
                <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
                <option value="UTC+1 (Central European)">UTC+1 (Central European)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div style={{ marginBottom: '40px' }}>
          <h3>🔔 Notifications</h3>
          {[
            { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about your files' },
            { key: 'fileNotifications', label: 'File Notifications', description: 'Get notified when files are shared with you' },
            { key: 'twoFactorAuth', label: 'Two-Factor Authentication', description: 'Add an extra layer of security to your account' },
            { key: 'autoBackup', label: 'Auto Backup', description: 'Automatically backup your files daily' },
            { key: 'emailDigest', label: 'Weekly Email Digest', description: 'Receive a weekly summary of your activity' },
            { key: 'darkMode', label: 'Dark Mode', description: 'Use dark theme interface' }
          ].map((setting) => (
            <div key={setting.key} className="table-row" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px',
              borderBottom: '1px solid #eee',
              cursor: 'pointer'
            }}
            onClick={() => handleSettingChange(setting.key)}
            >
              <div>
                <div style={{ fontWeight: '500', color: '#333', fontSize: '15px' }}>{setting.label}</div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{setting.description}</div>
              </div>
              <div style={{
                width: '50px',
                height: '26px',
                backgroundColor: settings[setting.key] ? '#0066ff' : '#ccc',
                borderRadius: '13px',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.3s'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: settings[setting.key] ? '27px' : '3px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Account Security */}
        <div style={{ marginBottom: '40px' }}>
          <h3>🔒 Account Security</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button className="btn-3d" style={{ textAlign: 'left', justifyContent: 'flex-start' }}>
              🔑 Change Password
            </button>
            <button className="btn-3d" style={{ 
              textAlign: 'left', 
              justifyContent: 'flex-start',
              backgroundColor: settings.twoFactorAuth ? '#4caf50' : '#0066ff'
            }}>
              {settings.twoFactorAuth ? '✅' : '🔐'} Two-Factor Authentication: {settings.twoFactorAuth ? 'Enabled' : 'Disabled'}
            </button>
            <button className="btn-3d" style={{ 
              textAlign: 'left', 
              justifyContent: 'flex-start',
              backgroundColor: '#ff4444'
            }}>
              🗑️ Delete Account
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
          <button className="btn-3d" style={{
            padding: '12px 24px',
            backgroundColor: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}>
            Cancel
          </button>
          <button 
            className="btn-3d" 
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              fontWeight: '600'
            }}
          >
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;