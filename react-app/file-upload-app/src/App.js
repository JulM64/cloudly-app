import React, { useState } from 'react';
import './App.css';
import { Amplify } from 'aws-amplify';
import { Authenticator, withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';

// Import the proper HomePage component
import HomePage from './components/HomePage'; // This should be your upload page

Amplify.configure(awsExports);

// Other page components (simplified)
const Management = () => (
  <div className="upload-wrapper">
    <h1 className="section-title">File Management</h1>
    <div className="page-card">
      <h3>📁 Your Files</h3>
      <p>Total Files: <strong>0</strong></p>
      <p>Storage Used: <strong>0 MB</strong></p>
    </div>
  </div>
);

const Notifications = () => (
  <div className="upload-wrapper">
    <h1 className="section-title">Notifications</h1>
    <div className="page-card">
      <h3>🔔 Recent Alerts</h3>
      <p>No new notifications</p>
    </div>
  </div>
);

const Messages = () => (
  <div className="upload-wrapper">
    <h1 className="section-title">Messages</h1>
    <div className="page-card">
      <h3>📨 Your Inbox</h3>
      <p>No new messages</p>
    </div>
  </div>
);

const AdminPanel = () => (
  <div className="upload-wrapper">
    <h1 className="section-title">Admin Dashboard</h1>
    <div className="page-card">
      <h3>👨‍💼 Admin Features</h3>
      <p>User Management</p>
      <p>System Settings</p>
    </div>
  </div>
);

// Function to get user initials for avatar
const getUserInitials = (username) => {
  if (!username) return 'U';
  return username.charAt(0).toUpperCase();
};

// Function to get avatar color based on username
const getAvatarColor = (username) => {
  const colors = ['#0066ff', '#00cc66', '#ff6600', '#9c27b0'];
  if (!username) return colors[0];
  const charCode = username.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch(currentPage) {
      case 'management': return <Management />;
      case 'notifications': return <Notifications />;
      case 'messages': return <Messages />;
      case 'admin': return <AdminPanel />;
      default: return <HomePage />; // This uses the imported HomePage
    }
  };

  return (
    <div className="App">
      <Authenticator loginMechanisms={['email']}>
        {({ signOut, user }) => {
          const isAdmin = user?.username?.includes('admin') || false;
          const userInitials = getUserInitials(user?.username);
          const avatarColor = getAvatarColor(user?.username);
          
          return (
            <>
              <header className="cloudly-header">
                <div className="logo">
                  <img src="/cloudly-logo-simplified01.png" width="32" alt="Cloudly" />
                  <span className="logo-text">Cloudly</span>
                </div>

                <nav className="nav-links">
                  <button 
                    onClick={() => setCurrentPage('home')}
                    className={currentPage === 'home' ? 'active' : ''}
                  >
                    Homepage
                  </button>
                  <button 
                    onClick={() => setCurrentPage('management')}
                    className={currentPage === 'management' ? 'active' : ''}
                  >
                    Management
                  </button>
                  <button 
                    onClick={() => setCurrentPage('notifications')}
                    className={currentPage === 'notifications' ? 'active' : ''}
                  >
                    Notifications
                  </button>
                  <button 
                    onClick={() => setCurrentPage('messages')}
                    className={currentPage === 'messages' ? 'active' : ''}
                  >
                    Messages
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => setCurrentPage('admin')}
                      className={currentPage === 'admin' ? 'active' : ''}
                    >
                      Admin
                    </button>
                  )}
                </nav>

                <div className="user-info">
                  {/* User Avatar */}
                  <div 
                    className="user-avatar"
                    style={{ 
                      backgroundColor: avatarColor,
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      border: '2px solid white'
                    }}
                    title={user?.username || 'User'}
                    onClick={() => alert(`Logged in as: ${user?.username || 'User'}`)}
                  >
                    {userInitials}
                  </div>
                  
                  <button 
                    className="btn-3d sign-out-btn" 
                    onClick={signOut}
                    style={{
                      padding: '10px 24px',
                      fontSize: '14px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </header>

              <main className="cloudly-main">
                {/* Cloud animations */}
                <div className="cloud"></div>
                <div className="cloud"></div>
                <div className="cloud"></div>
                
                {renderPage()}
              </main>
            </>
          );
        }}
      </Authenticator>
    </div>
  );
}

export default withAuthenticator(App);