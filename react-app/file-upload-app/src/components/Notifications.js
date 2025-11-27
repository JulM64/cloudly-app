import React, { useState } from 'react';

const Notifications = ({ userRole }) => {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'info', message: 'Your file was uploaded successfully', time: '5 min ago', read: false },
    { id: 2, type: 'warning', message: 'Storage space running low', time: '1 hour ago', read: false },
    { id: 3, type: 'success', message: 'Welcome to Cloudly!', time: '1 day ago', read: true }
  ]);

  const markAsRead = (id) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  return (
    <div className="notifications-container">
      <h1 className="section-title">Notifications</h1>
      
      <div className="notifications-list">
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            className={`notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`}
          >
            <div className="notification-content">
              <p className="notification-message">{notification.message}</p>
              <span className="notification-time">{notification.time}</span>
            </div>
            {!notification.read && (
              <button 
                className="mark-read-btn"
                onClick={() => markAsRead(notification.id)}
              >
                Mark as read
              </button>
            )}
          </div>
        ))}
      </div>

      {userRole === 'admin' && (
        <div className="admin-notifications">
          <h2>System Notifications</h2>
          <button className="btn-3d">Send System Notification</button>
          <button className="btn-3d">Configure Alerts</button>
        </div>
      )}
    </div>
  );
};

export default Notifications;