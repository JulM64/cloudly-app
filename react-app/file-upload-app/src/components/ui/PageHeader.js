// src/components/ui/PageHeader.js
import React from 'react';
import './ui.css';

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="ui-page-header">
    <div>
      <h1 className="ui-page-title">{title}</h1>
      {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="ui-page-header-action">{action}</div>}
  </div>
);

export default PageHeader;
