// src/components/Avatar.js
import React from 'react';
import { getAvatarGradient, getInitials } from '../utils/avatarUtils';

/**
 * Reusable Avatar component.
 * Shows the uploaded photo if `src` is provided, otherwise falls back
 * to a colorful gradient circle with the user's initials.
 *
 * Props:
 *  - src: base64/URL image string (optional)
 *  - name: display name (preferred for initials + color seed)
 *  - email: fallback for initials + color seed
 *  - size: diameter in px (default 40)
 *  - fontSize: optional override
 *  - onClick: optional click handler
 *  - loading: shows a subtle overlay spinner
 *  - style: extra style overrides
 */
function Avatar({ src, name, email, size = 40, fontSize, onClick, loading = false, style = {} }) {
  const seed = name || email || '';
  const initials = getInitials(name || email);
  const gradient = getAvatarGradient(seed);

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: fontSize || `${Math.max(12, size * 0.38)}px`,
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: src ? '#eee' : 'transparent',
        backgroundImage: src ? `url(${src})` : gradient,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '2px solid #f0f0f0',
        userSelect: 'none',
        ...style,
      }}
      title={name || email}
    >
      {!src && initials}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: `${Math.max(10, size * 0.3)}px`, color: 'white'
        }}>
          ⏳
        </div>
      )}
    </div>
  );
}

export default Avatar;