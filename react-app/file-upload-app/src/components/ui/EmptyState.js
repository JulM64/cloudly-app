// src/components/ui/EmptyState.js
import React from 'react';
import './ui.css';

export const EmptyState = ({ icon, title, description, action }) => (
  <div className="ui-empty-state">
    {icon && <div className="ui-empty-icon">{icon}</div>}
    <div className="ui-empty-title">{title}</div>
    {description && <div className="ui-empty-description">{description}</div>}
    {action && <div className="ui-empty-action">{action}</div>}
  </div>
);

export default EmptyState;
