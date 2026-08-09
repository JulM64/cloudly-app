// src/components/Avatar.js
// Reconstructed to match the prop contract already used at every call site
// in the app (src, name, email, size, onClick, loading, style) — see
// SettingsPage.js, HeadPanel.js, AdminPanel.js, DepartmentPage.js.
// If your real implementation has extra behavior beyond initials-from-name
// and a deterministic color-from-string fallback, merge that in; this keeps
// the same props/signature so nothing else needs to change.
import React from 'react';
import { getAvatarGradient, getInitials } from '../utils/avatarUtils';

const Avatar = ({ src, name, email, size = 40, onClick, loading = false, style = {} }) => {
  const seed = email || name || '';
  const initials = getInitials(name || email || '');

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: src ? 'var(--c-neutral-bg, #f3f4f6)' : getAvatarGradient(seed),
        color: '#fff',
        fontWeight: 600,
        fontSize: Math.max(11, size * 0.38),
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid var(--c-border, #e5e7eb)',
        ...style,
      }}
    >
      {src ? (
        <img src={src} alt={name || email || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{initials}</span>
      )}
      {loading && (
        <div
          style={{
            position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: Math.max(12, size * 0.3), height: Math.max(12, size * 0.3),
              border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff',
              borderRadius: '50%', animation: 'cl-avatar-spin 0.7s linear infinite',
            }}
          />
        </div>
      )}
      <style>{'@keyframes cl-avatar-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
};

export default Avatar;
