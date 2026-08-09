// src/components/ui/Badge.js
// Normalizes every status pill in the app (role badges, file-processing
// states, request statuses) onto one visual pattern: light tint background +
// solid-color text, matching "Processing / Completed / Failed" in the Scan
// reference and "Enabled" in Settings.
import React from 'react';
import './ui.css';

// tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'brand'
export const Badge = ({ tone = 'neutral', icon, children, className = '' }) => (
  <span className={`ui-badge ui-badge--${tone} ${className}`}>
    {icon && <span className="ui-badge-icon">{icon}</span>}
    {children}
  </span>
);

export default Badge;
