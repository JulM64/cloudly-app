import React, { useState } from 'react';

const Messages = ({ userRole }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'Support Team', subject: 'Welcome to Cloudly!', preview: 'Thank you for joining Cloudly...', time: '2 days ago', read: false },
    { id: 2, sender: 'System', subject: 'Storage Update', preview: 'Your storage plan has been updated...', time: '1 week ago', read: true }
  ]);

  const [selectedMessage, setSelectedMessage] = useState(null);

  return (
    <div className="messages-container">
      <h1 className="section-title">Messages</h1>
      
      <div className="messages-layout">
        {/* Messages List */}
        <div className="messages-list">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message-item ${message.read ? 'read' : 'unread'}`}
              onClick={() => setSelectedMessage(message)}
            >
              <div className="message-header">
                <span className="sender">{message.sender}</span>
                <span className="time">{message.time}</span>
              </div>
              <div className="message-subject">{message.subject}</div>
              <div className="message-preview">{message.preview}</div>
            </div>
          ))}
        </div>

        {/* Message Detail */}
        <div className="message-detail">
          {selectedMessage ? (
            <div className="message-full">
              <h2>{selectedMessage.subject}</h2>
              <div className="message-meta">
                <span>From: {selectedMessage.sender}</span>
                <span>Time: {selectedMessage.time}</span>
              </div>
              <div className="message-content">
                <p>This is the full message content. In a real app, this would contain the actual message text.</p>
              </div>
            </div>
          ) : (
            <div className="no-message-selected">
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="admin-messages">
          <button className="btn-3d">Send Message to All Users</button>
        </div>
      )}
    </div>
  );
};

export default Messages;