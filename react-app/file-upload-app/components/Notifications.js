import React from 'react';

const Notifications = () => {
  return (
    <div>
      <h1 style={{color: 'green', background: '#e6ffe6', padding: '20px', borderRadius: '10px'}}>
        🔔 NOTIFICATIONS PAGE
      </h1>
      <p>This is different from other pages!</p>
      <div style={{marginTop: '20px', padding: '20px', background: '#f0fff0', borderRadius: '10px'}}>
        <h3>Recent Alerts</h3>
        <ul>
          <li>File uploaded</li>
          <li>Storage alert</li>
          <li>System update</li>
        </ul>
      </div>
    </div>
  );
};

export default Notifications;
