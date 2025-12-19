import React from 'react';

const Messages = () => {
  return (
    <div>
      <h1 style={{color: 'purple', background: '#f3e5f5', padding: '20px', borderRadius: '10px'}}>
        📨 MESSAGES PAGE
      </h1>
      <p>This is different from other pages!</p>
      <div style={{marginTop: '20px', padding: '20px', background: '#f8f0ff', borderRadius: '10px'}}>
        <h3>Your Inbox</h3>
        <p>Welcome message</p>
        <p>Account verified</p>
      </div>
    </div>
  );
};

export default Messages;
