// src/components/EditFileModal.js
// Shared "edit file" modal — rename and/or replace a file's content.
// Used from DashboardPage, AdminPanel, and HeadPanel wherever the current
// viewer is looking at a file they themselves uploaded. Ownership is also
// enforced server-side (see server-dynamodb.js), so this UI only needs to
// decide whether to SHOW the edit action — the backend is the real gate.
import React, { useState } from 'react';
import apiService from '../services/apiService';
import Card from './ui/Card';
import Button from './ui/Button';
import { IconClose, IconFile } from './icons';

const EditFileModal = ({ file, onClose, onSaved }) => {
  const [name, setName] = useState(file.originalName || file.fileName || '');
  const [replacementFile, setReplacementFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const originalName = file.originalName || file.fileName || '';
  const nameChanged = name.trim() && name.trim() !== originalName;
  const hasChanges = nameChanged || !!replacementFile;

  const handleSave = async () => {
    if (!hasChanges) { onClose(); return; }
    setSaving(true);
    setError('');
    try {
      if (replacementFile) {
        await apiService.replaceFileContent(file.userId, file.fileId, replacementFile, setProgress);
      }
      if (nameChanged) {
        await apiService.updateFileMetadata(file.userId, file.fileId, { originalName: name.trim() });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={onClose}>
      <Card style={{ width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>Edit file</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-muted)', display: 'flex' }}><IconClose size={16} /></button>
        </div>

        {error && <div className="ui-banner ui-banner--danger" style={{ marginBottom: '16px' }}>{error}</div>}

        <div className="ui-field">
          <label className="ui-label">File name</label>
          <input className="ui-input" type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
        </div>

        <div className="ui-field">
          <label className="ui-label">Replace file content (optional)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', border: '1px dashed var(--c-border-strong)', borderRadius: 'var(--radius-md)', cursor: saving ? 'default' : 'pointer', color: 'var(--c-text-muted)', fontSize: 'var(--fs-sm)' }}>
            <IconFile size={16} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replacementFile ? replacementFile.name : 'Choose a new file to upload in its place…'}
            </span>
            <input type="file" style={{ display: 'none' }} disabled={saving} onChange={(e) => setReplacementFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        {saving && replacementFile && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ height: '6px', backgroundColor: 'var(--c-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--c-brand)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        <div className="ui-banner ui-banner--info" style={{ marginBottom: '16px' }}>
          Anyone who can see this file will see it marked as edited, with the date of your change.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!hasChanges}>Save changes</Button>
        </div>
      </Card>
    </div>
  );
};

export default EditFileModal;