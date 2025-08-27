import React from 'react';
import './App.css';
import { Amplify } from 'aws-amplify';
import { Authenticator, withAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports';
import Appupload from './Appupload';

Amplify.configure(awsExports);

function App() {
  return (
    <div className="App">
      <Authenticator>
        {({ signOut }) => (
          <>
            <header className="cloudly-header">
              <div className="logo">
                <img src="/cloudly-logo-simplified01.png" width="32" alt="Cloudly" />
                Cloudly
              </div>

              <nav className="nav-links">
                <a href="#home">Homepage</a>
                <a href="#management">Management</a>
                <a href="#notifications">Notifications</a>
                <a href="#messages">Messages</a>
              </nav>

              <button className="btn-3d" onClick={signOut}>Sign Out</button>
            </header>

            <main className="cloudly-main">
              <h1 className="section-title">Secure PDF Upload</h1>
              <Appupload />
            </main>
          </>
        )}
      </Authenticator>
    </div>
  );
}

export default withAuthenticator(App);