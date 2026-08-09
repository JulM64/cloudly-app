// src/pages/SettingsPage.js - COMPLETE VERSION with real functionality + Avatar upload
// Visual layer rebuilt on the shared ui/ primitives + design tokens.
// All handlers, state, and API calls are unchanged from the original.
import React, { useState, useEffect, useRef } from 'react';
import cognitoService from '../services/cognitoService';
import apiService from '../services/apiService';
import Avatar from '../components/Avatar';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import Button from '../components/ui/Button';
import { IconCamera, IconTrash } from '../components/icons';

const TABS = [
  { key: 'profile', label: 'Profile' },
  { key: 'security', label: 'Security' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance', label: 'Appearance' },
];

const DEFAULT_NOTIFICATIONS = {
  emailNotifications: true,
  fileNotifications: true,
  autoBackup: true,
  emailDigest: true,
};

const resizeImage = (file, maxSize = 300, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const SettingsPage = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    department: user?.department || 'N/A',
    role: user?.role || 'N/A',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  const [avatar, setAvatar] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState(null);
  const fileInputRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('cloudly_notifications');
      if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
      const savedTheme = localStorage.getItem('cloudly_theme');
      if (savedTheme) setTheme(savedTheme);
    } catch (e) { console.error('Failed to load settings from localStorage', e); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getMyAvatar();
        if (res.avatarBase64) setAvatar(res.avatarBase64);
      } catch (e) { console.warn('Could not load avatar', e); }
    })();
  }, []);

  const handleProfileChange = (field, value) => setProfile((prev) => ({ ...prev, [field]: value }));

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await cognitoService.updateUserAttributes({ given_name: profile.firstName, family_name: profile.lastName });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMessage({ type: 'error', text: `Failed to update profile: ${err.message || err}` });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMessage(null), 4000);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }
    setAvatarLoading(true);
    setAvatarMessage(null);
    try {
      const resizedBase64 = await resizeImage(file);
      const res = await apiService.updateAvatar(resizedBase64);
      setAvatar(res.avatarBase64);
      setAvatarMessage({ type: 'success', text: 'Profile picture updated.' });
      try {
        const stored = JSON.parse(localStorage.getItem('cloudly_user') || '{}');
        stored.avatar = res.avatarBase64;
        localStorage.setItem('cloudly_user', JSON.stringify(stored));
      } catch {}
      window.dispatchEvent(new CustomEvent('cloudly-avatar-updated', { detail: { avatar: res.avatarBase64 } }));
    } catch (err) {
      setAvatarMessage({ type: 'error', text: err.message || 'Failed to upload picture.' });
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
      setTimeout(() => setAvatarMessage(null), 4000);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    setAvatarMessage(null);
    try {
      await apiService.removeAvatar();
      setAvatar(null);
      setAvatarMessage({ type: 'success', text: 'Profile picture removed.' });
      try {
        const stored = JSON.parse(localStorage.getItem('cloudly_user') || '{}');
        delete stored.avatar;
        localStorage.setItem('cloudly_user', JSON.stringify(stored));
      } catch {}
      window.dispatchEvent(new CustomEvent('cloudly-avatar-updated', { detail: { avatar: null } }));
    } catch (err) {
      setAvatarMessage({ type: 'error', text: err.message || 'Failed to remove picture.' });
    } finally {
      setAvatarLoading(false);
      setTimeout(() => setAvatarMessage(null), 4000);
    }
  };

  const handlePasswordFieldChange = (field, value) => setPasswordForm((prev) => ({ ...prev, [field]: value }));

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    setPasswordSaving(true);
    try {
      await cognitoService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message || 'Failed to change password.' });
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
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const displayName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email || 'User';

  return (
    <div style={{ maxWidth: '760px' }}>
      <PageHeader title="Settings" subtitle="Manage your account preferences and notification settings." />

      <Tabs tabs={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' && (
        <Card>
          <h3 className="cl-settings-heading">Profile information</h3>

          <div className="cl-avatar-row">
            <Avatar src={avatar} name={displayName} email={profile.email} size={72} onClick={handleAvatarClick} loading={avatarLoading} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-base)', marginBottom: '6px', color: 'var(--c-text)' }}>Profile picture</div>
              {avatarMessage && (
                <div className={avatarMessage.type === 'success' ? 'cl-inline-success' : 'cl-inline-error'}>{avatarMessage.text}</div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <Button variant="secondary" size="sm" icon={<IconCamera size={14} />} onClick={handleAvatarClick} disabled={avatarLoading}>
                  {avatar ? 'Change photo' : 'Upload photo'}
                </Button>
                {avatar && (
                  <Button variant="danger" size="sm" icon={<IconTrash size={14} />} onClick={handleRemoveAvatar} disabled={avatarLoading}>
                    Remove
                  </Button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: 'none' }} />
            </div>
          </div>

          {profileMessage && (
            <div className={`ui-banner ui-banner--${profileMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
              {profileMessage.text}
            </div>
          )}

          <div className="cl-form-grid">
            <div className="ui-field">
              <label className="ui-label">First name</label>
              <input className="ui-input" type="text" value={profile.firstName} onChange={(e) => handleProfileChange('firstName', e.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label">Last name</label>
              <input className="ui-input" type="text" value={profile.lastName} onChange={(e) => handleProfileChange('lastName', e.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label">Email address</label>
              <input className="ui-input" type="email" value={profile.email} disabled />
            </div>
            <div className="ui-field">
              <label className="ui-label">Department</label>
              <input className="ui-input" type="text" value={profile.department} disabled />
            </div>
            <div className="ui-field">
              <label className="ui-label">Role</label>
              <input className="ui-input" type="text" value={profile.role} disabled />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleSaveProfile} loading={profileSaving}>Save profile</Button>
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <h3 className="cl-settings-heading">Change password</h3>
          {passwordMessage && (
            <div className={`ui-banner ui-banner--${passwordMessage.type === 'success' ? 'success' : 'danger'}`} style={{ marginBottom: '20px' }}>
              {passwordMessage.text}
            </div>
          )}
          <div style={{ maxWidth: '420px' }}>
            <div className="ui-field">
              <label className="ui-label">Current password</label>
              <input className="ui-input" type="password" value={passwordForm.currentPassword} onChange={(e) => handlePasswordFieldChange('currentPassword', e.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label">New password</label>
              <input className="ui-input" type="password" value={passwordForm.newPassword} onChange={(e) => handlePasswordFieldChange('newPassword', e.target.value)} />
            </div>
            <div className="ui-field">
              <label className="ui-label">Confirm new password</label>
              <input className="ui-input" type="password" value={passwordForm.confirmPassword} onChange={(e) => handlePasswordFieldChange('confirmPassword', e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} loading={passwordSaving}>Update password</Button>
          </div>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <h3 className="cl-settings-heading">Notification preferences</h3>
          {[
            { key: 'emailNotifications', label: 'Email notifications', description: 'Receive email updates about your files' },
            { key: 'fileNotifications', label: 'File notifications', description: 'Get notified when files are shared with you' },
            { key: 'autoBackup', label: 'Auto backup', description: 'Automatically back up your files daily' },
            { key: 'emailDigest', label: 'Weekly email digest', description: 'Receive a weekly summary of your activity' },
          ].map((setting) => (
            <div key={setting.key} className="cl-toggle-row" onClick={() => handleToggleNotification(setting.key)}>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--c-text)', fontSize: 'var(--fs-base)' }}>{setting.label}</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginTop: '2px' }}>{setting.description}</div>
              </div>
              <div className={`cl-switch ${notifications[setting.key] ? 'cl-switch--on' : ''}`}>
                <div className="cl-switch-knob" />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)', marginTop: '16px' }}>Preferences are saved automatically to this browser.</p>
        </Card>
      )}

      {activeTab === 'appearance' && (
        <Card>
          <h3 className="cl-settings-heading">Appearance</h3>
          <p style={{ color: 'var(--c-text-muted)', marginBottom: '20px', fontSize: 'var(--fs-sm)' }}>Choose how Cloudly looks to you.</p>
          <div style={{ display: 'flex', gap: '16px' }}>
            {[{ key: 'light', label: 'Light mode' }, { key: 'dark', label: 'Dark mode' }].map((opt) => (
              <div key={opt.key} className={`cl-theme-option ${theme === opt.key ? 'cl-theme-option--active' : ''}`} onClick={() => handleThemeChange(opt.key)}>
                {opt.label}
                {theme === opt.key && <div style={{ marginTop: '6px', fontSize: 'var(--fs-xs)', color: 'var(--c-brand)', fontWeight: 600 }}>Active</div>}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)', marginTop: '16px' }}>Theme preference is saved to this browser.</p>
        </Card>
      )}

      <style>{`
        .cl-settings-heading { margin: 0 0 20px; font-size: var(--fs-lg); font-weight: 600; color: var(--c-text); }
        .cl-avatar-row { display:flex; align-items:center; gap:20px; margin-bottom:24px; padding-bottom:24px; border-bottom:1px solid var(--c-border); }
        .cl-inline-success { font-size: var(--fs-xs); color: var(--c-success); }
        .cl-inline-error { font-size: var(--fs-xs); color: var(--c-danger); }
        .cl-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 20px; margin-bottom:8px; }
        .cl-toggle-row { display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--c-border); cursor:pointer; }
        .cl-toggle-row:last-of-type { border-bottom: none; }
        .cl-switch { width:42px; height:24px; background:var(--c-border-strong); border-radius:var(--radius-pill); position:relative; transition:background-color .15s; flex-shrink:0; }
        .cl-switch--on { background: var(--c-brand); }
        .cl-switch-knob { position:absolute; top:3px; left:3px; width:18px; height:18px; background:#fff; border-radius:50%; transition:left .15s; box-shadow: var(--shadow-xs); }
        .cl-switch--on .cl-switch-knob { left:21px; }
        .cl-theme-option { flex:1; padding:24px 16px; text-align:center; border-radius:var(--radius-md); border:1.5px solid var(--c-border); cursor:pointer; font-weight:500; color:var(--c-text-secondary); font-size: var(--fs-sm); }
        .cl-theme-option--active { border-color: var(--c-brand); background: var(--c-brand-tint); color: var(--c-brand); font-weight:600; }
        @media (max-width: 640px) { .cl-form-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default SettingsPage;
