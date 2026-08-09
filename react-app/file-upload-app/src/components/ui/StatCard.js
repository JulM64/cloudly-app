// src/components/ui/StatCard.js
// Matches the Dashboard reference's "TOTAL DOCUMENTS / ACTIVE USERS / SCAN
// QUEUE" cards: small uppercase muted label, large bold value, optional
// small trend/status line underneath. No icon-in-circle, no colored border.
import React from 'react';
import Card from './Card';
import './ui.css';

export const StatCard = ({ label, value, trend, trendTone = 'neutral', icon }) => (
  <Card className="ui-stat-card">
    <div className="ui-stat-top">
      <span className="ui-stat-label">{label}</span>
      {icon && <span className="ui-stat-icon">{icon}</span>}
    </div>
    <div className="ui-stat-value">{value}</div>
    {trend && <div className={`ui-stat-trend ui-stat-trend--${trendTone}`}>{trend}</div>}
  </Card>
);

export default StatCard;
