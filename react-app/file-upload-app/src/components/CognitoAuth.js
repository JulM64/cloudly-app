import React, { useState, useEffect } from 'react';
import { Authenticator, useAuthenticator, Button, Heading } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import '@aws-amplify/ui-react/styles.css';
import { useUser } from '../contexts/UserContext';

const CognitoAuth = ({ onSuccess }) => {
  const { user: backendUser, verifyCognitoTokens } = useUser();
  const { user: cognitoUser, signOut } = useAuthenticator();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // When Cognito authentication succeeds, verify with backend
  useEffect(() => {
    if (cognitoUser && !backendUser) {
      verifyWithBackend();
    }
  }, [cognitoUser, backendUser]);

  const verifyWithBackend = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get tokens from Cognito
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString();
      const idToken = session.tokens?.idToken?.toString();
      
      if (!accessToken) {
        throw new Error('No access token found');
      }
      
      // Send tokens to backend for verification
      const result = await verifyCognitoTokens(accessToken, idToken);
      
      if (result.success) {
        // Store our backend token
        localStorage.setItem('cloudly_token', result.token);
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result.user);
        }
        
        // Reload to update app state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(result.error || 'Authentication failed');
        await signOut(); // Sign out from Cognito if backend verification fails
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(error.message);
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      localStorage.removeItem('cloudly_token');
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (backendUser) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Already logged in as {backendUser.email}</p>
        <Button onClick={handleSignOut}>Sign Out</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0066ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  // If we have a Cognito user but verification hasn't happened yet
  if (cognitoUser && !backendUser && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0066ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Authenticated with Cognito, verifying with backend...</p>
        <Button onClick={verifyWithBackend} style={{ marginTop: '20px' }}>
          Retry Verification
        </Button>
      </div>
    );
  }

  // Show the Authenticator component for login/signup
  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <Authenticator
        loginMechanisms={['email']}
        signUpAttributes={[
          'given_name',
          'family_name',
          'phone_number'
        ]}
        components={{
          SignIn: {
            Header: () => (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Heading level={3}>Sign in to Cloudly</Heading>
              </div>
            ),
          },
          SignUp: {
            Header: () => (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Heading level={3}>Create Cloudly Account</Heading>
              </div>
            ),
          }
        }}
      >
        {() => (
          <div style={{ textAlign: 'center' }}>
            <p>Loading authentication...</p>
          </div>
        )}
      </Authenticator>
      
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          color: '#ff4444',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          Error: {error}
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .amplify-button--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .amplify-button--primary:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default CognitoAuth;