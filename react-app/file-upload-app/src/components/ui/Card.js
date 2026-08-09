// src/components/ui/Card.js
import React from 'react';
import './ui.css';

export const Card = ({ children, className = '', padded = true, style, ...rest }) => (
  <div className={`ui-card ${padded ? 'ui-card--padded' : ''} ${className}`} style={style} {...rest}>
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, className = '' }) => (
  <div className={`ui-card-header ${className}`}>
    <div>
      <h3 className="ui-card-title">{title}</h3>
      {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="ui-card-action">{action}</div>}
  </div>
);

export default Card;
