// src/pages/HeadPanel.js - Scoped management page for DEPT_HEAD / UNIT_HEAD
// Shows only the user's own department/unit: team members + team files.
// Unlike the Super Admin's AdminPanel, files here can't be deleted directly —
// a removal request (with a required reason) is submitted for Super Admin approval.
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import Avatar from '../components/Avatar';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#9c27b0', icon: '👑' },
  DEPT_HEAD:   { label: 'Dept Head',   color: '#0066ff', icon: '🏢' },
  UNIT_HEAD:   { label: 'Unit Head',   color: '#4caf50', icon: '🔷' },
  MEMBER:      { label: 'Member',      color: '#ff9800', icon: '👤' },
};

const getFileIcon = (fileType) => {
  if (!fileType) return '📁';
  if (fileType.startsWith('image/'))  return '🖼️';
  if (fileType.startsWith('video/'))  return '🎬';
  if (fileType.startsWith('audio/'))  return '🎵';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word'))      return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📑';
  if (fileType.startsWith('text/'))   return '📃';
  return '📁';
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' };
const btn = (color = '#0066ff') => ({ padding: '8px 18px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' });

const STATUS_STYLE = {
  PENDING:  { bg: '#fff3e0', color: '#e65100', label: '⏳ Pending' },
  APPROVED: { bg: '#e8f5e9', color: '#2e7d32', label: '✅ Approved' },
  REJECTED: { bg: '#ffeaea', color: '#c62828', label: '❌ Rejected' },
};

// Small inline modal for entering a removal reason — avoids a plain window.prompt
// so the reason field can be validated and styled consistently with the rest of the app.
function RequestRemovalModal({ file, onCancel, onSubmit, submitting }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '28px', width: '90%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ marginBottom: '6px', fontSize: '18px' }}>🗑️ Request File Removal</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '18px' }}>
          "{file.originalName || file.fileName}" won't be deleted immediately — this sends a request to
          the Super Admin for final approval.
        </p>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#555', marginBottom: '6px' }}>
          Reason for removal (required)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="e.g. Duplicate upload, outdated document, uploaded by mistake…"
          rows={4}
          style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
        />
        {touched && !reason.trim() && (
          <div style={{ color: '#c62828', fontSize: '12px', marginTop: '6px' }}>A reason is required to submit this request.</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          <button onClick={onCancel} disabled={submitting} style={btn('#888')}>Cancel</button>
          <button
            onClick={() => reason.trim() ? onSubmit(reason.trim()) : setTouched(true)}
            disabled={submitting}
            style={btn(submitting ? '#aaa' : '#ff9800')}
          >
            {submitting ? '⏳ Submitting…' : '📨 Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

const HeadPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamFiles, setTeamFiles] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [requestModalFile, setRequestModalFile] = useState(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [fileMsg, setFileMsg] = useState('');

  const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.MEMBER;

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersRes, filesRes, requestsRes] = await Promise.allSettled([
        apiService.getTeamUsers(),
        apiService.getTeamFiles(),
        apiService.getMyFileDeleteRequests(),
      ]);
      if (usersRes.status === 'fulfilled') setTeamUsers(usersRes.value.users || []);
      if (filesRes.status === 'fulfilled') setTeamFiles(filesRes.value.files || []);
      if (requestsRes.status === 'fulfilled') setMyRequests(requestsRes.value.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const refresh = () => loadAll();
    window.addEventListener('focus', refresh);
    window.addEventListener('cloudly-files-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('cloudly-files-changed', refresh);
    };
  }, []);

  const handleSubmitRemovalRequest = async (reason) => {
    if (!requestModalFile) return;
    try {
      setSubmittingRequest(true);
      await apiService.requestFileDelete(requestModalFile.userId, requestModalFile.fileId, reason);
      setMyRequests(prev => [
        { requestId: `temp_${Date.now()}`, fileName: requestModalFile.originalName || requestModalFile.fileName, status: 'PENDING', reason, createdAt: new Date().toISOString() },
        ...prev,
      ]);
      setFileMsg(`✅ Removal request submitted for "${requestModalFile.originalName || requestModalFile.fileName}"`);
      setRequestModalFile(null);
      setTimeout(() => setFileMsg(''), 4000);
      loadAll(); // resync with the real backend-generated request
    } catch (err) {
      setFileMsg(`❌ ${err.message}`);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const filteredUsers = teamUsers.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  const filteredFiles = teamFiles.filter(f => {
    if (!fileSearch.trim()) return true;
    const q = fileSearch.toLowerCase();
    return (f.originalName || f.fileName || '').toLowerCase().includes(q) || (f.userEmail || '').toLowerCase().includes(q);
  });

  // A file already has a pending request against it — disable requesting again
  const pendingFileNames = new Set(myRequests.filter(r => r.status === 'PENDING').map(r => r.fileName));

  const tabs = [
    { key: 'users', label: '👥 Team Members', count: teamUsers.length },
    { key: 'files', label: '📁 Team Files',   count: teamFiles.length },
    { key: 'requests', label: '📨 My Requests', count: myRequests.filter(r => r.status === 'PENDING').length || null },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '28px' }}>
        <div>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '4px' }}>{roleCfg.icon} Team Management</h1>
          <p className="page-description" style={{ textAlign: 'left', margin: 0 }}>
            {user?.role === 'DEPT_HEAD' ? `Department: ${user?.department}` : `Unit: ${user?.department}`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: `${roleCfg.color}15`, padding: '8px 16px', borderRadius: '20px' }}>
          <span style={{ fontSize: '18px' }}>{roleCfg.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: roleCfg.color }}>{roleCfg.label}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666', fontSize: '20px' }}>⏳ Loading…</div>
      ) : error ? (
        <div style={{ padding: '20px', backgroundColor: '#ffeaea', borderRadius: '10px', color: '#c62828', textAlign: 'center' }}>
          ❌ {error}
          <div style={{ marginTop: '12px' }}><button onClick={loadAll} className="btn-3d" style={{ padding: '8px 20px' }}>🔄 Retry</button></div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #eee', flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? '700' : '500',
                  color: activeTab === tab.key ? roleCfg.color : '#666',
                  borderBottom: activeTab === tab.key ? `3px solid ${roleCfg.color}` : '3px solid transparent',
                  fontSize: '15px',
                }}
              >
                {tab.label}{tab.count ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          <div className="page-card">
            {/* ── TEAM MEMBERS TAB ── */}
            {activeTab === 'users' && (
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <input type="text" placeholder="🔍 Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} style={inp} />
                </div>
                {filteredUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>No team members found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredUsers.map((u, i) => (
                      <div key={u.userId || i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <Avatar src={u.avatarBase64} name={u.name} email={u.email} size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>{u.name}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>{u.email}</div>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: ROLE_CONFIG[u.role]?.color || '#888', backgroundColor: `${ROLE_CONFIG[u.role]?.color || '#888'}15`, padding: '4px 10px', borderRadius: '12px' }}>
                          {ROLE_CONFIG[u.role]?.icon} {ROLE_CONFIG[u.role]?.label || u.role}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TEAM FILES TAB ── */}
            {activeTab === 'files' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input type="text" placeholder="🔍 Search by file name or owner…" value={fileSearch} onChange={e => setFileSearch(e.target.value)} style={inp} />
                  </div>
                  <button onClick={loadAll} style={{ ...btn('#888'), whiteSpace: 'nowrap' }}>🔄 Refresh</button>
                </div>

                {fileMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', backgroundColor: fileMsg.includes('✅') ? '#e8f5e9' : '#ffeaea', color: fileMsg.includes('✅') ? '#2e7d32' : '#c62828' }}>
                    {fileMsg}
                  </div>
                )}

                <div style={{ backgroundColor: '#f0f6ff', border: '1px solid #cfe0ff', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#0052cc' }}>
                  ℹ️ You can't delete files directly here — click "Request Removal" to send a request (with your reason) to the Super Admin for approval.
                </div>

                {filteredFiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>No files found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredFiles.map((f, i) => {
                      const isPending = pendingFileNames.has(f.originalName || f.fileName);
                      return (
                        <div key={f.fileId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '20px', flexShrink: 0 }}>{getFileIcon(f.fileType)}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>
                                {f.originalName || f.fileName}
                              </div>
                              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                                {f.userEmail || '—'} · {formatBytes(f.fileSize)} · {timeAgo(f.uploadDate)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setRequestModalFile(f)}
                            disabled={isPending}
                            style={btn(isPending ? '#aaa' : '#ff9800')}
                          >
                            {isPending ? '⏳ Requested' : '🗑️ Request Removal'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── MY REQUESTS TAB ── */}
            {activeTab === 'requests' && (
              <div>
                {myRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                    <div>No removal requests submitted yet.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myRequests.map((r, i) => {
                      const s = STATUS_STYLE[r.status] || STATUS_STYLE.PENDING;
                      return (
                        <div key={r.requestId || i} style={{ padding: '14px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>{r.fileName}</div>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: s.color, backgroundColor: s.bg, padding: '4px 10px', borderRadius: '12px' }}>{s.label}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>"{r.reason}"</div>
                          {r.status === 'REJECTED' && r.rejectReason && (
                            <div style={{ fontSize: '12px', color: '#c62828', marginTop: '6px' }}>Admin's reason: {r.rejectReason}</div>
                          )}
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>{timeAgo(r.createdAt)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {requestModalFile && (
        <RequestRemovalModal
          file={requestModalFile}
          submitting={submittingRequest}
          onCancel={() => setRequestModalFile(null)}
          onSubmit={handleSubmitRemovalRequest}
        />
      )}
    </div>
  );
};

export default HeadPanel;