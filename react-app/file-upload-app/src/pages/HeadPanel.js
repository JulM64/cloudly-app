// src/pages/HeadPanel.js - Scoped management page for DEPT_HEAD / UNIT_HEAD
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import Avatar from '../components/Avatar';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  IconUsers, IconFolder, IconRoles, IconFile, IconRefresh, IconTrash,
  IconClose,
} from '../components/icons';

const ROLE_TONE = { SUPER_ADMIN: 'brand', DEPT_HEAD: 'info', UNIT_HEAD: 'success', MEMBER: 'neutral' };
const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', DEPT_HEAD: 'Dept Head', UNIT_HEAD: 'Unit Head', MEMBER: 'Member' };
const RoleBadge = ({ role }) => <Badge tone={ROLE_TONE[role] || 'neutral'}>{ROLE_LABEL[role] || role}</Badge>;

const STATUS_TONE = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'neutral'}>{status === 'PENDING' ? 'Pending' : status === 'APPROVED' ? 'Approved' : 'Rejected'}</Badge>;

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

function RequestRemovalModal({ file, onCancel, onSubmit, submitting }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <Card style={{ width: '100%', maxWidth: '460px' }}>
        <h3 style={{ marginBottom: '6px', fontSize: 'var(--fs-lg)', fontWeight: 700 }}>Request file removal</h3>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginBottom: '18px' }}>
          "{file.originalName || file.fileName}" won't be deleted immediately — this sends a request to the Super Admin for final approval.
        </p>
        <div className="ui-field">
          <label className="ui-label">Reason for removal (required)</label>
          <textarea className="ui-textarea" value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. Duplicate upload, outdated document, uploaded by mistake…" rows={4} />
          {touched && !reason.trim() && <div style={{ color: 'var(--c-danger)', fontSize: 'var(--fs-xs)', marginTop: '6px' }}>A reason is required to submit this request.</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <Button variant="secondary" disabled={submitting} onClick={onCancel}>Cancel</Button>
          <Button variant="danger" loading={submitting} onClick={() => (reason.trim() ? onSubmit(reason.trim()) : setTouched(true))}>Submit request</Button>
        </div>
      </Card>
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

  const roleTone = ROLE_TONE[user?.role] || 'neutral';
  const roleLabel = ROLE_LABEL[user?.role] || 'Member';

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersRes, filesRes, requestsRes] = await Promise.allSettled([
        apiService.getTeamUsers(), apiService.getTeamFiles(), apiService.getMyFileDeleteRequests(),
      ]);
      if (usersRes.status === 'fulfilled') setTeamUsers(usersRes.value.users || []);
      if (filesRes.status === 'fulfilled') setTeamFiles(filesRes.value.files || []);
      if (requestsRes.status === 'fulfilled') setMyRequests(requestsRes.value.requests || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
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
      setFileMsg(`Removal request submitted for "${requestModalFile.originalName || requestModalFile.fileName}"`);
      setRequestModalFile(null);
      setTimeout(() => setFileMsg(''), 4000);
      loadAll();
    } catch (err) { setFileMsg(err.message); }
    finally { setSubmittingRequest(false); }
  };

  const filteredUsers = teamUsers.filter(u => !search.trim() || (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()));
  const filteredFiles = teamFiles.filter(f => !fileSearch.trim() || (f.originalName || f.fileName || '').toLowerCase().includes(fileSearch.toLowerCase()) || (f.userEmail || '').toLowerCase().includes(fileSearch.toLowerCase()));
  const pendingFileNames = new Set(myRequests.filter(r => r.status === 'PENDING').map(r => r.fileName));

  const tabs = [
    { key: 'users', label: 'Team members', count: teamUsers.length, icon: IconUsers },
    { key: 'files', label: 'Team files', count: teamFiles.length, icon: IconFolder },
    { key: 'requests', label: 'My requests', count: myRequests.filter(r => r.status === 'PENDING').length || null, icon: IconRoles },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <PageHeader
          title="Team management"
          subtitle={user?.role === 'DEPT_HEAD' ? `Department: ${user?.department}` : `Unit: ${user?.department}`}
        />
        <Badge tone={roleTone}>{roleLabel}</Badge>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>Loading…</div>
      ) : error ? (
        <Card><EmptyState title="Couldn't load team data" description={error} action={<Button variant="secondary" size="sm" onClick={loadAll}>Retry</Button>} /></Card>
      ) : (
        <>
          <div className="ui-tabs">
            {tabs.map(tab => (
              <button key={tab.key} type="button" className={`ui-tab ${activeTab === tab.key ? 'ui-tab--active' : ''}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}{tab.count ? ` (${tab.count})` : ''}
              </button>
            ))}
          </div>

          <Card>
            {activeTab === 'users' && (
              <div>
                <input className="ui-input" style={{ marginBottom: '18px' }} type="text" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                {filteredUsers.length === 0 ? (
                  <EmptyState title="No team members found" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredUsers.map((u, i) => (
                      <div key={u.userId || i} className="cl-list-row">
                        <Avatar src={u.avatarBase64} name={u.name} email={u.email} size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--c-text)' }}>{u.name}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>{u.email}</div>
                        </div>
                        <RoleBadge role={u.role} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'files' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <input className="ui-input" style={{ flex: 1, minWidth: '200px' }} type="text" placeholder="Search by file name or owner…" value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                  <Button variant="secondary" icon={<IconRefresh size={14} />} onClick={loadAll}>Refresh</Button>
                </div>
                {fileMsg && <div className={`ui-banner ui-banner--${fileMsg.toLowerCase().includes('submit') ? 'success' : 'danger'}`} style={{ marginBottom: '14px' }}>{fileMsg}</div>}
                <div className="ui-banner ui-banner--info" style={{ marginBottom: '16px' }}>
                  You can't delete files directly here — click "Request removal" to send a request (with your reason) to the Super Admin for approval.
                </div>
                {filteredFiles.length === 0 ? (
                  <EmptyState title="No files found" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredFiles.map((f, i) => {
                      const isPending = pendingFileNames.has(f.originalName || f.fileName);
                      return (
                        <div key={f.fileId || i} className="cl-list-row" style={{ justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <IconFile size={16} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>{f.originalName || f.fileName}</div>
                              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', marginTop: '2px' }}>{f.userEmail || '—'} &middot; {formatBytes(f.fileSize)} &middot; {timeAgo(f.uploadDate)}</div>
                            </div>
                          </div>
                          <Button variant={isPending ? 'secondary' : 'danger'} size="sm" icon={<IconTrash size={13} />} disabled={isPending} onClick={() => setRequestModalFile(f)}>
                            {isPending ? 'Requested' : 'Request removal'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                {myRequests.length === 0 ? (
                  <EmptyState icon={<IconFolder size={28} />} title="No removal requests submitted yet" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {myRequests.map((r, i) => (
                      <div key={r.requestId || i} className="cl-list-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--c-text)' }}>{r.fileName}</div>
                          <StatusBadge status={r.status} />
                        </div>
                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>"{r.reason}"</div>
                        {r.status === 'REJECTED' && r.rejectReason && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-danger)', marginTop: '6px' }}>Admin's reason: {r.rejectReason}</div>}
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)', marginTop: '6px' }}>{timeAgo(r.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {requestModalFile && (
        <RequestRemovalModal file={requestModalFile} submitting={submittingRequest} onCancel={() => setRequestModalFile(null)} onSubmit={handleSubmitRemovalRequest} />
      )}

      <style>{`.cl-list-row { display:flex; align-items:center; gap:14px; padding:12px 14px; background:var(--c-bg); border-radius:var(--radius-md); }`}</style>
    </div>
  );
};

export default HeadPanel;
