import React, { useState } from 'react';
import { uploadData, getUrl, list } from '@aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';

const DebugUpload = () => {
  const [debugLog, setDebugLog] = useState([]);
  const [testStage, setTestStage] = useState('ready');
  const [bucketInfo, setBucketInfo] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const testAmplifyStorage = async () => {
    setTestStage('testing');
    addLog('🔍 Starting Amplify Storage diagnostic...', 'info');
    
    try {
      // Test 1: Check if Amplify Storage module is available
      addLog('Test 1: Checking Amplify Storage module...', 'info');
      if (!uploadData || !getUrl) {
        addLog('❌ Amplify Storage functions not found', 'error');
        addLog('Install: npm install @aws-amplify/storage', 'error');
        return;
      }
      addLog('✅ Amplify Storage module loaded', 'success');

      // Test 2: Try to list files (check bucket access)
      addLog('Test 2: Testing S3 bucket access...', 'info');
      try {
        const result = await list({
          path: '',
          options: { accessLevel: 'guest' }
        });
        addLog(`✅ Can access S3 bucket. Found ${result.items?.length || 0} items`, 'success');
        setBucketInfo(result);
      } catch (error) {
        addLog(`⚠️ Cannot list bucket (might be empty or permissions issue): ${error.message}`, 'warning');
      }

      // Test 3: Test authentication
      addLog('Test 3: Checking authentication...', 'info');
      try {
        const user = await getCurrentUser();
        addLog(`✅ Authenticated as: ${user.username}`, 'success');
        addLog(`User ID: ${user.userId}`, 'info');
      } catch (authError) {
        addLog(`⚠️ Not authenticated: ${authError.message}`, 'warning');
        addLog('Note: Some S3 buckets require authentication', 'info');
      }

      // Test 4: Test actual upload with small file
      addLog('Test 4: Testing file upload...', 'info');
      
      // Create a small test file
      const testContent = `Test upload from Cloudly Debug\nTime: ${new Date().toISOString()}\nUser: Debug Test`;
      const testFile = new Blob([testContent], { type: 'text/plain' });
      const testFileName = `debug-test-${Date.now()}.txt`;
      
      try {
        addLog(`Uploading test file: ${testFileName}`, 'info');
        
        const uploadResult = await uploadData({
          key: `debug/${testFileName}`,
          data: testFile,
          options: {
            contentType: 'text/plain',
            accessLevel: 'guest', // Try 'private' if this fails
            onProgress: ({ transferredBytes, totalBytes }) => {
              const percent = Math.round((transferredBytes / totalBytes) * 100);
              addLog(`Upload progress: ${percent}%`, 'progress');
            }
          }
        }).result;

        addLog(`✅ Upload successful!`, 'success');
        addLog(`File key: ${uploadResult.key}`, 'info');
        
        // Test 5: Try to get download URL
        addLog('Test 5: Testing file retrieval...', 'info');
        try {
          const url = await getUrl({
            key: uploadResult.key,
            options: { accessLevel: 'guest' }
          });
          addLog(`✅ Can generate download URL`, 'success');
          addLog(`URL: ${url.url}`, 'info');
        } catch (urlError) {
          addLog(`⚠️ Cannot generate URL: ${urlError.message}`, 'warning');
        }

      } catch (uploadError) {
        addLog(`❌ Upload failed: ${uploadError.message}`, 'error');
        addLog('Trying with private access level...', 'info');
        
        // Try with private access
        try {
          const uploadResult = await uploadData({
            key: `debug/private-${testFileName}`,
            data: testFile,
            options: {
              contentType: 'text/plain',
              accessLevel: 'private'
            }
          }).result;
          
          addLog(`✅ Upload successful with private access!`, 'success');
          addLog(`Private file key: ${uploadResult.key}`, 'info');
        } catch (privateError) {
          addLog(`❌ Private upload also failed: ${privateError.message}`, 'error');
        }
      }

    } catch (error) {
      addLog(`❌ Diagnostic failed: ${error.message}`, 'error');
      addLog(`Stack: ${error.stack}`, 'error');
    } finally {
      setTestStage('completed');
      addLog('Diagnostic completed. Check logs above.', 'info');
    }
  };

  const testFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setTestStage('uploading');
    addLog(`📤 Starting file upload: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`, 'info');

    try {
      const user = await getCurrentUser();
      const timestamp = Date.now();
      const fileKey = `uploads/${user.username}/${timestamp}-${file.name}`;

      addLog(`Uploading to: ${fileKey}`, 'info');

      const result = await uploadData({
        key: fileKey,
        data: file,
        options: {
          contentType: file.type,
          accessLevel: 'guest',
          onProgress: (progress) => {
            const percent = Math.round((progress.transferredBytes / progress.totalBytes) * 100);
            addLog(`Progress: ${percent}% (${progress.transferredBytes}/${progress.totalBytes} bytes)`, 'progress');
          }
        }
      }).result;

      addLog(`✅ File uploaded successfully!`, 'success');
      addLog(`S3 Result: ${JSON.stringify(result, null, 2)}`, 'info');

    } catch (error) {
      addLog(`❌ Upload error: ${error.message}`, 'error');
      addLog(`Error details: ${JSON.stringify(error, null, 2)}`, 'error');
      
      // Try alternative access levels
      addLog('Trying alternative access levels...', 'info');
      
      const levels = ['private', 'protected'];
      for (const level of levels) {
        try {
          addLog(`Trying with accessLevel: ${level}...`, 'info');
          const user = await getCurrentUser();
          const fileKey = `uploads/${level}/${user.username}/${Date.now()}-${file.name}`;
          
          await uploadData({
            key: fileKey,
            data: file,
            options: { contentType: file.type, accessLevel: level }
          }).result;
          
          addLog(`✅ Success with ${level} access!`, 'success');
          break;
        } catch (levelError) {
          addLog(`❌ Failed with ${level}: ${levelError.message}`, 'error');
        }
      }
    } finally {
      setTestStage('completed');
    }
  };

  const clearLogs = () => {
    setDebugLog([]);
    setTestStage('ready');
  };

  return (
    <div className="upload-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="section-title">S3 Upload Debugger</h1>
      
      {/* Control Panel */}
      <div style={{
        display: 'flex',
        gap: '15px',
        margin: '30px 0',
        flexWrap: 'wrap'
      }}>
        <button
          className="btn-3d"
          onClick={testAmplifyStorage}
          disabled={testStage === 'testing'}
          style={{ backgroundColor: '#0066ff' }}
        >
          🔍 Run Diagnostic
        </button>
        
        <label className="btn-3d" style={{ backgroundColor: '#28a745', cursor: 'pointer' }}>
          📁 Test File Upload
          <input
            type="file"
            onChange={testFileUpload}
            disabled={testStage === 'testing'}
            style={{ display: 'none' }}
          />
        </label>
        
        <button
          className="btn-3d"
          onClick={clearLogs}
          style={{ backgroundColor: '#6c757d' }}
        >
          🗑️ Clear Logs
        </button>
      </div>

      {/* Status */}
      <div style={{
        padding: '15px',
        margin: '20px 0',
        backgroundColor: testStage === 'ready' ? '#e7f3ff' :
                        testStage === 'testing' ? '#fff3cd' :
                        testStage === 'completed' ? '#d4edda' : '#f8d7da',
        border: `2px solid ${
          testStage === 'ready' ? '#b3d7ff' :
          testStage === 'testing' ? '#ffeaa7' :
          testStage === 'completed' ? '#c3e6cb' : '#f5c6cb'
        }`,
        borderRadius: '10px'
      }}>
        <strong>Status:</strong> {testStage.toUpperCase()}
        {bucketInfo && (
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            <strong>Bucket Info:</strong> {JSON.stringify(bucketInfo, null, 2)}
          </div>
        )}
      </div>

      {/* Debug Log */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#1e1e1e',
        borderRadius: '10px',
        maxHeight: '500px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '13px'
      }}>
        <h4 style={{ color: '#fff', marginTop: 0 }}>Debug Log:</h4>
        {debugLog.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic' }}>No logs yet. Run a test above.</div>
        ) : (
          debugLog.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '5px 0',
                borderBottom: '1px solid #333',
                color: log.type === 'error' ? '#ff6b6b' :
                       log.type === 'success' ? '#51cf66' :
                       log.type === 'warning' ? '#ffd43b' :
                       log.type === 'progress' ? '#339af0' : '#adb5bd'
              }}
            >
              <span style={{ color: '#868e96' }}>[{log.timestamp}]</span>{' '}
              {log.message}
            </div>
          ))
        )}
      </div>

      {/* Common Solutions */}
      <div style={{ marginTop: '40px', padding: '25px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
        <h4>🔧 Common Solutions:</h4>
        
        <div style={{ marginTop: '20px' }}>
          <h5>Issue 1: "No credentials" error</h5>
          <pre style={{ backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
{`// Add to your upload function:
try {
  const user = await getCurrentUser();
  console.log('User:', user);
} catch (error) {
  console.error('Auth error:', error);
  // Handle unauthenticated users
}`}</pre>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h5>Issue 2: S3 not configured in Amplify</h5>
          <pre style={{ backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
{`# Run in terminal:
amplify add storage
# Choose: Content (Images, audio, video, etc.)
# Use your existing bucket name
# Set permissions
amplify push --yes`}</pre>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h5>Issue 3: Missing CORS configuration</h5>
          <pre style={{ backgroundColor: '#333', color: '#fff', padding: '10px', borderRadius: '5px', fontSize: '12px' }}>
{`# In AWS S3 Console:
1. Select your bucket
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Add configuration:
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]`}</pre>
        </div>
      </div>

      {/* Quick Tests */}
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e7f3ff', borderRadius: '10px' }}>
        <h4>⚡ Quick Manual Tests:</h4>
        
        <div style={{ marginTop: '15px' }}>
          <button
            className="btn-3d"
            style={{ padding: '10px 20px', fontSize: '14px', marginRight: '10px' }}
            onClick={async () => {
              try {
                const user = await getCurrentUser();
                alert(`✅ Authenticated:\nUsername: ${user.username}\nUser ID: ${user.userId}`);
              } catch (error) {
                alert(`❌ Not authenticated: ${error.message}`);
              }
            }}
          >
            Test Authentication
          </button>
          
          <button
            className="btn-3d"
            style={{ padding: '10px 20px', fontSize: '14px' }}
            onClick={async () => {
              try {
                // Try to import aws-exports
                const awsExports = await import('../aws-exports');
                const config = JSON.stringify(awsExports.default, null, 2);
                console.log('aws-exports:', awsExports.default);
                alert('✅ aws-exports loaded. Check browser console (F12) for details.');
              } catch (error) {
                alert(`❌ Error loading aws-exports: ${error.message}`);
              }
            }}
          >
            Check aws-exports
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugUpload;