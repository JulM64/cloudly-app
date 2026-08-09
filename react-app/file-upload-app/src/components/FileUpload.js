// src/components/FileUpload.js
// Reconstructed to match its existing call site — `<FileUpload user={user}
// onUploadSuccess={setMessage} />` in HomePage.js — and wired to the same
// apiService.uploadFile() presigned-S3 flow already used by ScanPage.js.
// If your real implementation does more (multi-file queue, per-file retry,
// etc.), merge that logic in; the outward props are unchanged.
import React, { useState, useRef, useCallback } from 'react';
import apiService from '../services/apiService';
import { IconUploadCloud, IconFile, IconCheckCircle, IconXCircle } from './icons';
import Button from './ui/Button';
import './FileUpload.css';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const FileUpload = ({ user, onUploadSuccess }) => {
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState([]); // [{id, file, progress, status, error}]
  const inputRef = useRef(null);

  const uploadOne = useCallback((entry) => {
    setQueue((q) => q.map((e) => (e.id === entry.id ? { ...e, status: 'uploading' } : e)));
    apiService
      .uploadFile(entry.file, (pct) => {
        setQueue((q) => q.map((e) => (e.id === entry.id ? { ...e, progress: pct } : e)));
      })
      .then(() => {
        setQueue((q) => q.map((e) => (e.id === entry.id ? { ...e, status: 'done', progress: 100 } : e)));
        window.dispatchEvent(new Event('cloudly-files-changed'));
        onUploadSuccess?.(`"${entry.file.name}" uploaded successfully.`);
      })
      .catch((err) => {
        setQueue((q) => q.map((e) => (e.id === entry.id ? { ...e, status: 'error', error: err.message } : e)));
        onUploadSuccess?.(`Failed to upload "${entry.file.name}": ${err.message}`);
      });
  }, [onUploadSuccess]);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const entries = files.map((file) => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, file, progress: 0, status: 'queued' }));
    setQueue((q) => [...entries, ...q]);
    entries.forEach(uploadOne);
  }, [uploadOne]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className="cl-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        data-active={dragOver || undefined}
      >
        <IconUploadCloud size={30} />
        <div className="cl-dropzone-title">Drag and drop files here</div>
        <div className="cl-dropzone-sub">or browse from your computer to upload to {user?.department || 'your'} department storage</div>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {queue.length > 0 && (
        <div className="cl-upload-queue">
          {queue.map((entry) => (
            <div key={entry.id} className="cl-upload-row">
              <IconFile size={16} />
              <div className="cl-upload-row-main">
                <div className="cl-upload-row-name">{entry.file.name}</div>
                <div className="cl-upload-row-meta">{formatBytes(entry.file.size)}</div>
                {entry.status === 'uploading' && (
                  <div className="cl-upload-bar"><div style={{ width: `${entry.progress}%` }} /></div>
                )}
                {entry.status === 'error' && <div className="cl-upload-error">{entry.error}</div>}
              </div>
              {entry.status === 'done' && <IconCheckCircle size={18} className="cl-upload-status-ok" />}
              {entry.status === 'error' && <IconXCircle size={18} className="cl-upload-status-error" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
