// src/pages/ArchivePage.js
// Folder-based file manager for organizing department documents.
// Visibility: SUPER_ADMIN can browse every department's archive; DEPT_HEAD
// and UNIT_HEAD only see their own department/unit's archive. Enforced
// server-side (see server-dynamodb.js) — this page just reflects whatever
// the backend is willing to hand back.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/apiService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  IconFolder, IconFile, IconFileText, IconImage, IconVideo, IconPlus,
  IconEdit, IconTrash, IconFolderMove, IconChevronRight, IconClose,
  IconEye, IconUploadCloud, IconBuilding, IconLayers,
} from '../components/icons';

const getFileTypeIcon = (fileType) => {
  if (!fileType) return IconFile;
  if (fileType.startsWith('image/')) return IconImage;
  if (fileType.startsWith('video/')) return IconVideo;
  return IconFileText;
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const backdrop = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };

function NewFolderModal({ onCancel, onCreate, creating }) {
  const [name, setName] = useState('');
  return (
    <div style={backdrop} onClick={onCancel}>
      <Card style={{ width: '100%', maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: '16px' }}>New folder</h2>
        <div className="ui-field">
          <label className="ui-label">Folder name</label>
          <input className="ui-input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Contracts 2026" autoFocus />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={creating}>Cancel</Button>
          <Button onClick={() => name.trim() && onCreate(name.trim())} loading={creating} disabled={!name.trim()}>Create</Button>
        </div>
      </Card>
    </div>
  );
}

function RenameModal({ initialName, onCancel, onSave, saving }) {
  const [name, setName] = useState(initialName);
  return (
    <div style={backdrop} onClick={onCancel}>
      <Card style={{ width: '100%', maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: '16px' }}>Rename</h2>
        <div className="ui-field">
          <label className="ui-label">Name</label>
          <input className="ui-input" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={() => name.trim() && onSave(name.trim())} loading={saving} disabled={!name.trim() || name.trim() === initialName}>Save</Button>
        </div>
      </Card>
    </div>
  );
}

// Recursive folder tree for the "Move to…" picker
function FolderTreeOption({ folder, allFolders, depth, excludeId, excludeDescendantsOf, selectedId, onSelect }) {
  const children = allFolders.filter((f) => f.parentFolderId === folder.id);
  const isExcluded = folder.id === excludeId || (excludeDescendantsOf && excludeDescendantsOf.has(folder.id));
  return (
    <>
      <div
        onClick={() => !isExcluded && onSelect(folder.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', paddingLeft: `${10 + depth * 20}px`,
          borderRadius: 'var(--radius-sm)', cursor: isExcluded ? 'not-allowed' : 'pointer',
          backgroundColor: selectedId === folder.id ? 'var(--c-brand-tint)' : 'transparent',
          opacity: isExcluded ? 0.4 : 1, fontSize: 'var(--fs-sm)',
          color: selectedId === folder.id ? 'var(--c-brand)' : 'var(--c-text)',
        }}
      >
        <IconFolder size={14} /> {folder.name}
      </div>
      {children.map((c) => (
        <FolderTreeOption key={c.id} folder={c} allFolders={allFolders} depth={depth + 1} excludeId={excludeId} excludeDescendantsOf={excludeDescendantsOf} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </>
  );
}

function MoveModal({ itemName, allFolders, excludeId, onCancel, onMove, moving }) {
  const [selectedId, setSelectedId] = useState(null); // null = department root

  const excludeDescendantsOf = new Set();
  if (excludeId) {
    const collect = (id) => {
      excludeDescendantsOf.add(id);
      allFolders.filter((f) => f.parentFolderId === id).forEach((c) => collect(c.id));
    };
    collect(excludeId);
  }

  const roots = allFolders.filter((f) => !f.parentFolderId);

  return (
    <div style={backdrop} onClick={onCancel}>
      <Card style={{ width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: '6px' }}>Move "{itemName}"</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginBottom: '14px' }}>Choose a destination folder.</p>
        <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)', padding: '6px', marginBottom: '18px' }}>
          <div
            onClick={() => setSelectedId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: selectedId === null ? 'var(--c-brand-tint)' : 'transparent', color: selectedId === null ? 'var(--c-brand)' : 'var(--c-text)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}
          >
            <IconBuilding size={14} /> Department root
          </div>
          {roots.length === 0 ? (
            <div style={{ padding: '10px', fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)' }}>No folders yet.</div>
          ) : (
            roots.map((f) => (
              <FolderTreeOption key={f.id} folder={f} allFolders={allFolders} depth={0} excludeId={excludeId} excludeDescendantsOf={excludeDescendantsOf} selectedId={selectedId} onSelect={setSelectedId} />
            ))
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onCancel} disabled={moving}>Cancel</Button>
          <Button onClick={() => onMove(selectedId)} loading={moving}>Move here</Button>
        </div>
      </Card>
    </div>
  );
}

const ArchivePage = ({ user }) => {
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [path, setPath] = useState([]); // [{id, name}]
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [allFoldersForMove, setAllFoldersForMove] = useState([]);
  const [moving, setMoving] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const currentFolderId = path.length ? path[path.length - 1].id : null;

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getArchiveDepartments();
        const depts = res.departments || [];
        setDepartments(depts);
        if (depts.length > 0) setSelectedDept(depts[0].name);
        else setLoading(false);
      } catch (err) { setError(err.message); setLoading(false); }
    })();
  }, []);

  const loadContents = useCallback(async () => {
    if (!selectedDept) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiService.getFolderContents(selectedDept, currentFolderId);
      setFolders(res.folders || []);
      setFiles(res.files || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [selectedDept, currentFolderId]);

  useEffect(() => { loadContents(); }, [loadContents]);

  const handleSelectDept = (name) => { setSelectedDept(name); setPath([]); };
  const enterFolder = (folder) => setPath((p) => [...p, { id: folder.id, name: folder.name }]);
  const jumpTo = (index) => setPath((p) => p.slice(0, index + 1));
  const goRoot = () => setPath([]);

  const handleCreateFolder = async (name) => {
    try {
      setCreatingFolder(true);
      await apiService.createFolder({ name, department: selectedDept, parentFolderId: currentFolderId });
      setShowNewFolder(false);
      await loadContents();
    } catch (err) { setError(err.message); }
    finally { setCreatingFolder(false); }
  };

  const handleRename = async (newName) => {
    if (!renameTarget) return;
    try {
      setRenaming(true);
      if (renameTarget.type === 'folder') {
        await apiService.updateFolder(renameTarget.id, { name: newName });
      } else {
        await apiService.organizeFile(renameTarget.userId, renameTarget.id, { originalName: newName });
      }
      setRenameTarget(null);
      await loadContents();
    } catch (err) { setError(err.message); }
    finally { setRenaming(false); }
  };

  const openMoveModal = async (target) => {
    try {
      const res = await apiService.getAllFolders(selectedDept);
      setAllFoldersForMove(res.folders || []);
      setMoveTarget(target);
    } catch (err) { setError(err.message); }
  };

  const handleMove = async (destinationFolderId) => {
    if (!moveTarget) return;
    try {
      setMoving(true);
      if (moveTarget.type === 'folder') {
        await apiService.updateFolder(moveTarget.id, { parentFolderId: destinationFolderId });
      } else {
        await apiService.organizeFile(moveTarget.userId, moveTarget.id, { folderId: destinationFolderId });
      }
      setMoveTarget(null);
      await loadContents();
    } catch (err) { setError(err.message); }
    finally { setMoving(false); }
  };

  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Delete "${folder.name}"? It must be empty first.`)) return;
    try {
      setDeletingFolderId(folder.id);
      await apiService.deleteFolder(folder.id);
      await loadContents();
    } catch (err) { setError(err.message); }
    finally { setDeletingFolderId(null); }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      await apiService.uploadFile(file, setUploadProgress, currentFolderId);
      setMessage(`"${file.name}" uploaded.`);
      setTimeout(() => setMessage(''), 3000);
      await loadContents();
    } catch (err) { setError(err.message); }
    finally { setUploading(false); setUploadProgress(0); }
  };

  const handleOpenFile = async (file) => {
    try {
      const res = await apiService.openFile(file.userId, file.fileId);
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (err) { setError('Failed to open file: ' + err.message); }
  };

  return (
    <div>
      <PageHeader
        title="Archive"
        subtitle={isAdmin ? 'Organize documents into folders across every department.' : `Organize documents for ${user?.department || 'your department'}.`}
      />

      {error && <div className="ui-banner ui-banner--danger" style={{ marginBottom: '20px' }}>{error}<button className="ui-banner-close" onClick={() => setError('')}><IconClose size={14} /></button></div>}
      {message && <div className="ui-banner ui-banner--success" style={{ marginBottom: '20px' }}>{message}</div>}

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
          {isAdmin && departments.length > 1 ? (
            <select className="ui-select" style={{ width: 'auto', minWidth: '200px' }} value={selectedDept} onChange={(e) => handleSelectDept(e.target.value)}>
              {departments.map((d) => <option key={d.id} value={d.name}>{d.type === 'unit' ? 'Unit: ' : 'Dept: '}{d.name}</option>)}
            </select>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: 'var(--fs-md)' }}>
              <IconBuilding size={16} /> {selectedDept || user?.department}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" icon={<IconPlus size={14} />} onClick={() => setShowNewFolder(true)} disabled={!selectedDept}>New folder</Button>
            <Button size="sm" icon={<IconUploadCloud size={14} />} loading={uploading} onClick={handleUploadClick} disabled={!selectedDept}>Upload file</Button>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelected} />
          </div>
        </div>

        {uploading && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ height: '6px', backgroundColor: 'var(--c-border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, backgroundColor: 'var(--c-brand)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginBottom: '18px', fontSize: 'var(--fs-sm)' }}>
          <button onClick={goRoot} className="cl-breadcrumb-btn" style={{ fontWeight: path.length === 0 ? 700 : 500, color: path.length === 0 ? 'var(--c-text)' : 'var(--c-brand)' }}>
            {selectedDept || 'Archive'}
          </button>
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              <IconChevronRight size={13} style={{ color: 'var(--c-text-faint)' }} />
              <button onClick={() => jumpTo(i)} className="cl-breadcrumb-btn" style={{ fontWeight: i === path.length - 1 ? 700 : 500, color: i === path.length - 1 ? 'var(--c-text)' : 'var(--c-brand)' }}>
                {p.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--c-text-muted)' }}>Loading…</div>
        ) : !selectedDept ? (
          <EmptyState icon={<IconFolder size={28} />} title="No department to browse" description="You don't have a department assigned yet." />
        ) : folders.length === 0 && files.length === 0 ? (
          <EmptyState icon={<IconFolder size={28} />} title="This folder is empty" description="Create a subfolder or upload a file to get started." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {folders.map((folder) => (
              <div key={folder.id} className="cl-archive-row">
                <div className="cl-archive-row-main" onClick={() => enterFolder(folder)} style={{ cursor: 'pointer' }}>
                  <span className="cl-archive-icon cl-archive-icon--folder"><IconFolder size={18} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="cl-archive-name">{folder.name}</div>
                    <div className="cl-archive-meta">Folder &middot; created {timeAgo(folder.createdAt)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <Button variant="secondary" size="sm" icon={<IconEdit size={13} />} onClick={() => setRenameTarget({ type: 'folder', id: folder.id, name: folder.name })} />
                  <Button variant="secondary" size="sm" icon={<IconFolderMove size={13} />} onClick={() => openMoveModal({ type: 'folder', id: folder.id, name: folder.name })} />
                  <Button variant="danger" size="sm" icon={<IconTrash size={13} />} loading={deletingFolderId === folder.id} onClick={() => handleDeleteFolder(folder)} />
                </div>
              </div>
            ))}

            {files.map((file) => {
              const FileIcon = getFileTypeIcon(file.fileType);
              return (
                <div key={file.fileId} className="cl-archive-row">
                  <div className="cl-archive-row-main">
                    <span className="cl-archive-icon"><FileIcon size={18} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div className="cl-archive-name">
                        {file.originalName || file.fileName}
                        {file.isEdited && <Badge tone="warning" style={{ flexShrink: 0, marginLeft: '6px' }}>Edited</Badge>}
                      </div>
                      <div className="cl-archive-meta">{file.userEmail} &middot; {formatBytes(file.fileSize)} &middot; {timeAgo(file.uploadDate)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <Button variant="secondary" size="sm" icon={<IconEye size={13} />} onClick={() => handleOpenFile(file)} />
                    <Button variant="secondary" size="sm" icon={<IconEdit size={13} />} onClick={() => setRenameTarget({ type: 'file', id: file.fileId, userId: file.userId, name: file.originalName || file.fileName })} />
                    <Button variant="secondary" size="sm" icon={<IconFolderMove size={13} />} onClick={() => openMoveModal({ type: 'file', id: file.fileId, userId: file.userId, name: file.originalName || file.fileName })} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showNewFolder && <NewFolderModal onCancel={() => setShowNewFolder(false)} onCreate={handleCreateFolder} creating={creatingFolder} />}
      {renameTarget && <RenameModal initialName={renameTarget.name} onCancel={() => setRenameTarget(null)} onSave={handleRename} saving={renaming} />}
      {moveTarget && (
        <MoveModal
          itemName={moveTarget.name}
          allFolders={allFoldersForMove}
          excludeId={moveTarget.type === 'folder' ? moveTarget.id : null}
          onCancel={() => setMoveTarget(null)}
          onMove={handleMove}
          moving={moving}
        />
      )}

      <style>{`
        .cl-breadcrumb-btn { background:none; border:none; cursor:pointer; padding:2px 4px; font-size:inherit; }
        .cl-breadcrumb-btn:hover { text-decoration:underline; }
        .cl-archive-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; background:var(--c-bg); border-radius:var(--radius-md); }
        .cl-archive-row-main { display:flex; align-items:center; gap:12px; min-width:0; flex:1; }
        .cl-archive-icon { color:var(--c-text-faint); flex-shrink:0; display:flex; }
        .cl-archive-icon--folder { color:var(--c-brand); }
        .cl-archive-name { display:flex; align-items:center; font-weight:600; color:var(--c-text); font-size:var(--fs-sm); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cl-archive-meta { font-size:var(--fs-xs); color:var(--c-text-muted); margin-top:2px; }
      `}</style>
    </div>
  );
};

export default ArchivePage;