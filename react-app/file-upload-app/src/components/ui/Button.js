// src/components/ui/Button.js
// Replaces the old `.btn-3d` (gradient + lift-on-hover) button with the flat,
// solid-fill button shown in the Stitch references ("Save Organization
// Settings", "Process All", "Browse Files").
import React from 'react';
import './ui.css';

const VARIANT_CLASS = {
  primary: 'ui-btn ui-btn--primary',
  secondary: 'ui-btn ui-btn--secondary',
  ghost: 'ui-btn ui-btn--ghost',
  danger: 'ui-btn ui-btn--danger',
  success: 'ui-btn ui-btn--success',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) => (
  <button
    className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ui-btn--${size} ${className}`}
    disabled={disabled || loading}
    {...rest}
  >
    {icon && !loading && <span className="ui-btn-icon">{icon}</span>}
    {loading && <span className="ui-btn-spinner" aria-hidden="true" />}
    <span>{children}</span>
  </button>
);

export default Button;
