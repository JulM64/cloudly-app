// src/components/ui/Tabs.js
import React from 'react';
import './ui.css';

// tabs: [{ key, label }]
export const Tabs = ({ tabs, activeKey, onChange }) => (
  <div className="ui-tabs">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        className={`ui-tab ${activeKey === tab.key ? 'ui-tab--active' : ''}`}
        onClick={() => onChange(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default Tabs;
