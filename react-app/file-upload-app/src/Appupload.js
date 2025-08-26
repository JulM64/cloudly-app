import React, { useState } from 'react';
import { uploadData } from '@aws-amplify/storage';
import { getCurrentUser } from 'aws-amplify/auth';

function Appupload() {
  const [file, setFile] = useState(null);

  const handleUpload = async (e) => {
    const chosenFile = e.target.files[0];
    if (!chosenFile) return;

    try {
      const user = await getCurrentUser();
      await uploadData({
        key: `uploads/${user.username}/${chosenFile.name}`,
        data: chosenFile,
        options: { contentType: chosenFile.type, accessLevel: 'public' },
      });
      alert('PDF uploaded 🎉');
    } catch (err) {
      alert('Upload failed ❌');
    }
  };

  return (
    <>
      {/* animated clouds */}
      <div className="cloud"></div>
      <div className="cloud"></div>
      <div className="cloud"></div>

      <div className="upload-wrapper">
        <h2>Scan & Upload PDF</h2>
        <label className="btn-3d upload-label">
          Scan or Upload PDF
          <input
            type="file"
            accept=".pdf"
            capture="environment"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </>
  );
}

export default Appupload;