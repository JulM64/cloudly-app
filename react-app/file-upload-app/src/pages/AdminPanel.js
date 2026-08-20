// src/pages/AdminPanel.js - Real data from backend
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';
import Avatar from '../components/Avatar';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  IconUsers, IconFolder, IconSettings, IconFileText, IconShield, IconPlus,
  IconRefresh, IconTrash, IconClose, IconCheckCircle, IconXCircle,
  IconBuilding, IconLayers, IconUploadCloud, IconEdit, IconRoles,
} from '../components/icons';

const ROLE_TONE = { SUPER_ADMIN: 'brand', DEPT_HEAD: 'info', UNIT_HEAD: 'success', MEMBER: 'neutral' };
const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', DEPT_HEAD: 'Dept Head', UNIT_HEAD: 'Unit Head', MEMBER: 'Member' };
const RoleBadge = ({ role }) => <Badge tone={ROLE_TONE[role] || 'neutral'}>{ROLE_LABEL[role] || role}</Badge>;
const StatusBadge = ({ status }) => <Badge tone={status === 'CONFIRMED' ? 'success' : 'warning'}>{status === 'CONFIRMED' ? 'Active' : status}</Badge>;

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
  return `${Math.floor(h / 24)}d ago`;
};

const ACTION_ICON = {
  UPLOAD_FILE: IconUploadCloud, CREATE_DEPARTMENT: IconBuilding, CREATE_UNIT: IconLayers,
  CREATE_USER: IconUsers, UPDATE_USER_DEPARTMENT: IconEdit, PROPOSE_ROLE_CHANGE: IconRoles,
  AUTO_APPROVE_ROLE_CHANGE: IconCheckCircle, APPROVE_ROLE_CHANGE: IconCheckCircle,
  REJECT_ROLE_CHANGE: IconXCircle, DELETE_DEPARTMENT: IconTrash,
};

const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [usersLastKey, setUsersLastKey] = useState(null);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [activities, setActivities] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFileDeleteCount, setPendingFileDeleteCount] = useState(0);
  const [fileDeleteRequests, setFileDeleteRequests] = useState([]);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [files, setFiles]           = useState([]);
  const [filesLastKey, setFilesLastKey] = useState(null);
  const [loadingMoreFiles, setLoadingMoreFiles] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [deletingFile, setDeletingFile] = useState(null);
  const [fileMsg, setFileMsg]       = useState('');

  const [userSearch, setUserSearch]   = useState('');
  const [userFilter, setUserFilter]   = useState('ALL');
  const [actionMsg, setActionMsg]     = useState('');

  const [logFilter, setLogFilter] = useState('ALL');

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser]               = useState({ firstName: '', lastName: '', email: '', department: '', role: 'MEMBER' });
  const [creating, setCreating]             = useState(false);
  const [createMsg, setCreateMsg]           = useState('');
  const [tempPassword, setTempPassword]     = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, usersRes, actsRes, pendingRes, filesRes, fileDelRes] = await Promise.allSettled([
        apiService.getAdminStats(), apiService.getUsers(), apiService.getActivities(),
        apiService.getPendingRoleCount(), apiService.getAllFiles(), apiService.getFileDeleteRequests(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats);
      if (usersRes.status === 'fulfilled') { setUsers(usersRes.value.users || []); setUsersLastKey(usersRes.value.lastKey || null); }
      if (actsRes.status === 'fulfilled') setActivities(actsRes.value.activities || []);
      if (pendingRes.status === 'fulfilled') setPendingCount(pendingRes.value.pendingCount || 0);
      if (filesRes.status === 'fulfilled') { setFiles(filesRes.value.files || []); setFilesLastKey(filesRes.value.lastKey || null); }
      if (fileDelRes.status === 'fulfilled') {
        const allReqs = fileDelRes.value.requests || [];
        setFileDeleteRequests(allReqs);
        setPendingFileDeleteCount(allReqs.filter(r => r.status === 'PENDING').length);
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLoadMoreUsers = async () => {
    if (!usersLastKey || loadingMoreUsers) return;
    try {
      setLoadingMoreUsers(true);
      const res = await apiService.getUsers(usersLastKey);
      setUsers(prev => [...prev, ...(res.users || [])]);
      setUsersLastKey(res.lastKey || null);
    } catch (err) { setError(err.message); }
    finally { setLoadingMoreUsers(false); }
  };

  const handleLoadMoreFiles = async () => {
    if (!filesLastKey || loadingMoreFiles) return;
    try {
      setLoadingMoreFiles(true);
      const res = await apiService.getAllFiles(filesLastKey);
      setFiles(prev => [...prev, ...(res.files || [])]);
      setFilesLastKey(res.lastKey || null);
    } catch (err) { setError(err.message); }
    finally { setLoadingMoreFiles(false); }
  };

  const handleDeleteFile = async (file) => {
    const label = file.originalName || file.fileName || 'this file';
    if (!window.confirm(`Delete "${label}"? This permanently removes it and cannot be undone.`)) return;
    try {
      setDeletingFile(file.fileId);
      setFileMsg('');
      await apiService.deleteFileMetadata(file.userId, file.fileId);
      setFiles(prev => prev.filter(f => f.fileId !== file.fileId));
      setStats(prev => prev && ({ ...prev, totalFiles: Math.max(0, (prev.totalFiles || 1) - 1) }));
      window.dispatchEvent(new Event('cloudly-files-changed'));
      setFileMsg(`Deleted "${label}"`);
      setTimeout(() => setFileMsg(''), 3000);
    } catch (err) { setFileMsg(`Failed to delete: ${err.message}`); }
    finally { setDeletingFile(null); }
  };

  const handleApproveFileDeleteRequest = async (reqItem) => {
    if (!window.confirm(`Approve removal of "${reqItem.fileName}"? This will permanently delete the file.`)) return;
    try {
      setProcessingRequestId(reqItem.requestId);
      await apiService.approveFileDeleteRequest(reqItem.requestId);
      setFileDeleteRequests(prev => prev.map(r => r.requestId === reqItem.requestId ? { ...r, status: 'APPROVED' } : r));
      setPendingFileDeleteCount(prev => Math.max(0, prev - 1));
      setFiles(prev => prev.filter(f => f.fileId !== reqItem.fileId));
      window.dispatchEvent(new Event('cloudly-files-changed'));
      window.dispatchEvent(new Event('cloudly-notifications-changed'));
      setFileMsg(`Approved removal of "${reqItem.fileName}"`);
      setTimeout(() => setFileMsg(''), 3000);
    } catch (err) { setFileMsg(`Failed to approve: ${err.message}`); }
    finally { setProcessingRequestId(null); }
  };

  const handleRejectFileDeleteRequest = async (reqItem) => {
    const reason = window.prompt(`Reason for rejecting removal of "${reqItem.fileName}" (optional):`, '');
    if (reason === null) return;
    try {
      setProcessingRequestId(reqItem.requestId);
      await apiService.rejectFileDeleteRequest(reqItem.requestId, reason);
      setFileDeleteRequests(prev => prev.map(r => r.requestId === reqItem.requestId ? { ...r, status: 'REJECTED', rejectReason: reason } : r));
      setPendingFileDeleteCount(prev => Math.max(0, prev - 1));
      window.dispatchEvent(new Event('cloudly-notifications-changed'));
      setFileMsg(`Rejected removal request for "${reqItem.fileName}"`);
      setTimeout(() => setFileMsg(''), 3000);
    } catch (err) { setFileMsg(`Failed to reject: ${err.message}`); }
    finally { setProcessingRequestId(null); }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName.trim() || !newUser.email.trim()) { setCreateMsg('First name and email required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) { setCreateMsg('Invalid email.'); return; }
    try {
      setCreating(true);
      const res = await apiService.createUser(newUser);
      setTempPassword(res.tempPassword);
      setCreateMsg('User created.');
      await loadAll();
    } catch (err) { setCreateMsg(err.message); }
    finally { setCreating(false); }
  };

  const handleQuickRoleChange = async (u, newRole) => {
    if (u.role === newRole) return;
    try {
      setActionMsg('');
      await apiService.proposeRoleChange({ targetEmail: u.email, targetName: u.name, newRole, department: u.department, reason: 'Admin quick role change' });
      setActionMsg(`${u.name} → ${newRole}`);
      await loadAll();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) { setActionMsg(err.message); }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !userSearch.trim() || (u.name || '').toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userFilter === 'ALL' || u.role === userFilter || (!u.role && userFilter === 'MEMBER');
    return matchSearch && matchRole;
  });

  const filteredLogs = logFilter === 'ALL' ? activities : activities.filter(a => a.action?.includes(logFilter));

  const filteredFiles = files.filter(f => {
    if (!fileSearch.trim()) return true;
    const q = fileSearch.toLowerCase();
    return (f.originalName || f.fileName || '').toLowerCase().includes(q) || (f.userEmail || '').toLowerCase().includes(q) || (f.department || '').toLowerCase().includes(q);
  });

  const tabs = [
    { key: 'users', label: 'Users', count: users.length, icon: IconUsers },
    { key: 'files', label: 'Files', count: files.length, icon: IconFolder, alert: pendingFileDeleteCount },
    { key: 'system', label: 'System', count: null, icon: IconSettings },
    { key: 'logs', label: 'Logs', count: activities.length, icon: IconFileText },
    { key: 'security', label: 'Security', count: pendingCount > 0 ? pendingCount : null, icon: IconShield },
  ];

  return (
    <div>
      <PageHeader title="Admin panel" subtitle={<>System administration — logged in as <strong>{user?.email}</strong></>} />

      {stats && (
        <div className="cl-stat-row-6" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Users', value: stats.totalUsers ?? '—' },
            { label: 'Departments', value: stats.totalDepartments ?? '—' },
            { label: 'Units', value: stats.totalUnits ?? '—' },
            { label: 'Files', value: stats.totalFiles ?? '—' },
            { label: 'Storage', value: formatBytes(stats.storageUsed) },
            { label: 'Pending roles', value: stats.pendingRoleRequests ?? 0 },
          ].map((s, i) => (
            <Card key={i} className="ui-stat-card" style={{ textAlign: 'center' }}>
              <div className="ui-stat-value" style={{ fontSize: 'var(--fs-xl)' }}>{s.value}</div>
              <div className="ui-stat-label" style={{ marginTop: '4px' }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="ui-banner ui-banner--danger" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
          <Button variant="danger" size="sm" onClick={loadAll}>Retry</Button>
        </div>
      )}

      <Card>
        <div className="ui-tabs">
          {tabs.map(tab => (
            <button key={tab.key} type="button" className={`ui-tab ${activeTab === tab.key ? 'ui-tab--active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}{tab.count ? ` (${tab.count})` : ''}{tab.alert > 0 ? ` · ${tab.alert}` : ''}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--c-text-muted)' }}>Loading…</div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="ui-input" style={{ flex: 1, minWidth: '200px' }} type="text" placeholder="Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                  <select className="ui-select" style={{ width: 'auto' }} value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                    <option value="ALL">All roles</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="DEPT_HEAD">Dept Head</option>
                    <option value="UNIT_HEAD">Unit Head</option>
                    <option value="MEMBER">Member</option>
                  </select>
                  <Button icon={<IconPlus size={14} />} onClick={() => { setShowCreateUser(true); setNewUser({ firstName: '', lastName: '', email: '', department: '', role: 'MEMBER' }); setCreateMsg(''); setTempPassword(''); }}>Create user</Button>
                  <Button variant="secondary" icon={<IconRefresh size={14} />} onClick={loadAll}>Refresh</Button>
                </div>

                {actionMsg && <div className={`ui-banner ui-banner--${actionMsg.includes('→') ? 'success' : 'danger'}`} style={{ marginBottom: '14px' }}>{actionMsg}</div>}

                {filteredUsers.length === 0 ? (
                  <EmptyState title={`No users found${userSearch ? ` matching "${userSearch}"` : ''}`} />
                ) : (
                  <div className="ui-table-wrap">
                    <table className="ui-table">
                      <thead><tr>{['Name', 'Email', 'Role', 'Department', 'Status', 'Quick actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.email}>
                            <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Avatar src={u.avatarBase64} name={u.name} email={u.email} size={34} /><div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--c-text)' }}>{u.name || '—'}</div></div></td>
                            <td>{u.email}</td>
                            <td><RoleBadge role={u.role || 'MEMBER'} /></td>
                            <td>{u.department ? <Badge tone="success">{u.department}</Badge> : <span style={{ color: 'var(--c-text-faint)' }}>—</span>}</td>
                            <td><StatusBadge status={u.status} /></td>
                            <td>
                              <select className="ui-select" style={{ width: 'auto', padding: '5px 8px', fontSize: 'var(--fs-xs)' }} defaultValue={u.role || 'MEMBER'} onChange={e => handleQuickRoleChange(u, e.target.value)}>
                                <option value="MEMBER">Member</option>
                                <option value="UNIT_HEAD">Unit Head</option>
                                <option value="DEPT_HEAD">Dept Head</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: '14px', fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span>Showing {filteredUsers.length} of {users.length} loaded users</span>
                  {usersLastKey && <Button variant="secondary" size="sm" loading={loadingMoreUsers} onClick={handleLoadMoreUsers}>Load more users</Button>}
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div>
                {fileDeleteRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <div className="ui-banner ui-banner--warning" style={{ display: 'block', marginBottom: '20px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '14px' }}>{pendingFileDeleteCount} pending removal request{pendingFileDeleteCount > 1 ? 's' : ''}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {fileDeleteRequests.filter(r => r.status === 'PENDING').map(r => (
                        <div key={r.requestId} style={{ backgroundColor: 'var(--c-surface)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--c-text)' }}>{r.fileName}</div>
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', marginTop: '3px' }}>Requested by <strong>{r.requestedBy}</strong> ({r.requestedByRole}) &middot; {r.department || '—'} &middot; {timeAgo(r.createdAt)}</div>
                            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>"{r.reason}"</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <Button variant="success" size="sm" loading={processingRequestId === r.requestId} onClick={() => handleApproveFileDeleteRequest(r)}>Approve</Button>
                            <Button variant="danger" size="sm" disabled={processingRequestId === r.requestId} onClick={() => handleRejectFileDeleteRequest(r)}>Reject</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="ui-input" style={{ flex: 1, minWidth: '200px' }} type="text" placeholder="Search by file name, owner, or department…" value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                  <Button variant="secondary" icon={<IconRefresh size={14} />} onClick={loadAll}>Refresh</Button>
                </div>

                {fileMsg && <div className={`ui-banner ui-banner--${fileMsg.startsWith('Deleted') || fileMsg.startsWith('Approved') ? 'success' : 'danger'}`} style={{ marginBottom: '14px' }}>{fileMsg}</div>}

                {filteredFiles.length === 0 ? (
                  <EmptyState title={`No files found${fileSearch ? ` matching "${fileSearch}"` : ''}`} />
                ) : (
                  <div className="ui-table-wrap">
                    <table className="ui-table">
                      <thead><tr>{['File', 'Owner', 'Department', 'Size', 'Uploaded', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredFiles.map((f, i) => (
                          <tr key={f.fileId || i}>
                            <td><div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}><IconFileText size={16} /><span style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{f.originalName || f.fileName}</span></div></td>
                            <td>{f.userEmail || '—'}</td>
                            <td>{f.department || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>{formatBytes(f.fileSize)}</td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)' }}>{timeAgo(f.uploadDate)}</td>
                            <td><Button variant="danger" size="sm" icon={<IconTrash size={13} />} loading={deletingFile === f.fileId} onClick={() => handleDeleteFile(f)}>Delete</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: '14px', fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <span>Showing {filteredFiles.length} of {files.length} loaded files</span>
                  {filesLastKey && <Button variant="secondary" size="sm" loading={loadingMoreFiles} onClick={handleLoadMoreFiles}>Load more files</Button>}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <h3 style={{ marginBottom: '20px', fontSize: 'var(--fs-lg)', fontWeight: 700 }}>System configuration</h3>
                <div className="cl-info-pair">
                  {[
                    { title: 'Database', items: [['Provider', 'Amazon DynamoDB'], ['Region', 'us-east-1'], ['Tables', 'departments, files, activities, role-requests']] },
                    { title: 'Storage', items: [['Provider', 'Amazon S3'], ['Bucket prefix', 'cloudly-dept-*'], ['Total files', stats?.totalFiles ?? '—'], ['Total storage', formatBytes(stats?.storageUsed)]] },
                    { title: 'Authentication', items: [['Provider', 'AWS Cognito'], ['Region', 'us-east-1'], ['Total users', stats?.totalUsers ?? '—']] },
                    { title: 'Role distribution', items: Object.entries(stats?.roleCounts || {}).map(([role, count]) => [role.replace('_', ' '), count]) },
                  ].map((section, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--c-bg)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                      <h4 style={{ marginBottom: '14px', fontSize: 'var(--fs-md)', fontWeight: 600 }}>{section.title}</h4>
                      {section.items.map(([key, val], j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: j < section.items.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)' }}>{key}</span>
                          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--c-text)', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {stats?.departmentStats && Object.keys(stats.departmentStats).length > 0 && (
                  <div style={{ marginTop: '22px', backgroundColor: 'var(--c-bg)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                    <h4 style={{ marginBottom: '14px', fontSize: 'var(--fs-md)', fontWeight: 600 }}>Files per department</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {Object.entries(stats.departmentStats).map(([dept, data]) => (
                        <div key={dept} style={{ backgroundColor: 'var(--c-surface)', borderRadius: 'var(--radius-sm)', padding: '14px', border: '1px solid var(--c-border)' }}>
                          <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)', marginBottom: '8px' }}>{dept}</div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)' }}>{data.fileCount} files</div>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-faint)' }}>{formatBytes(data.totalSize)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="ui-select" style={{ width: 'auto' }} value={logFilter} onChange={e => setLogFilter(e.target.value)}>
                    <option value="ALL">All actions</option>
                    <option value="UPLOAD">Uploads</option>
                    <option value="CREATE">Created</option>
                    <option value="ROLE">Role changes</option>
                    <option value="USER">User actions</option>
                  </select>
                  <Button variant="secondary" icon={<IconRefresh size={14} />} onClick={loadAll}>Refresh</Button>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginLeft: 'auto' }}>{filteredLogs.length} entries</span>
                </div>

                {filteredLogs.length === 0 ? (
                  <EmptyState title="No activity logs found" />
                ) : (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="ui-table-wrap">
                    <table className="ui-table">
                      <thead><tr>{['Time', 'User', 'Action', 'Target'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                      <tbody>
                        {filteredLogs.map((act, i) => {
                          const ActIcon = ACTION_ICON[act.action] || IconFileText;
                          return (
                            <tr key={i}>
                              <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)' }}>{timeAgo(act.createdAt)}</td>
                              <td style={{ fontWeight: 500, color: 'var(--c-text)' }}>{act.email}</td>
                              <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-xs)', backgroundColor: 'var(--c-brand-tint)', color: 'var(--c-brand)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}><ActIcon size={12} />{(act.action || '').replace(/_/g, ' ').toLowerCase()}</span></td>
                              <td style={{ fontWeight: 600 }}>{act.target || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h3 style={{ marginBottom: '20px', fontSize: 'var(--fs-lg)', fontWeight: 700 }}>Security &amp; access control</h3>

                {pendingCount > 0 ? (
                  <div className="ui-banner ui-banner--warning" style={{ display: 'flex', marginBottom: '24px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{pendingCount} pending role request{pendingCount > 1 ? 's' : ''}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', marginTop: '4px' }}>Role changes proposed by department heads waiting for your approval.</div>
                    </div>
                    <Link to="/role-requests"><Button size="sm">Review now</Button></Link>
                  </div>
                ) : (
                  <div className="ui-banner ui-banner--success" style={{ display: 'block', marginBottom: '24px' }}>
                    <div style={{ fontWeight: 700 }}>No pending role requests</div>
                    <div style={{ fontSize: 'var(--fs-xs)', marginTop: '4px' }}>All role change requests have been processed.</div>
                  </div>
                )}

                {stats?.roleCounts && (
                  <div style={{ backgroundColor: 'var(--c-bg)', borderRadius: 'var(--radius-md)', padding: '18px', marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: 'var(--fs-md)', fontWeight: 600 }}>User role distribution</h4>
                    <div className="cl-stat-row-4">
                      {Object.entries(ROLE_LABEL).map(([role, label]) => (
                        <div key={role} className={`ui-badge ui-badge--${ROLE_TONE[role]}`} style={{ display: 'block', borderRadius: 'var(--radius-md)', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800 }}>{stats.roleCounts[role] ?? 0}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', marginTop: '4px' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ backgroundColor: 'var(--c-bg)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: 'var(--fs-md)', fontWeight: 600 }}>Quick actions</h4>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Link to="/role-requests"><Button variant="secondary">Role requests</Button></Link>
                    <Link to="/departments"><Button variant="secondary">Manage departments</Button></Link>
                    <Button variant="secondary" onClick={loadAll}>Refresh data</Button>
                    <Button variant="secondary" onClick={() => setActiveTab('logs')}>View logs</Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {showCreateUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <Card style={{ width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>Create new user</h2>
              {!tempPassword && <button onClick={() => setShowCreateUser(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-muted)', display: 'flex' }}><IconClose size={16} /></button>}
            </div>

            {!tempPassword ? (
              <>
                {[['First name', 'firstName', 'text', 'e.g., Jean'], ['Last name', 'lastName', 'text', 'e.g., Dupont'], ['Email', 'email', 'email', 'e.g., jean@company.com'], ['Department', 'department', 'text', 'e.g., DIP']].map(([label, key, type, placeholder]) => (
                  <div key={key} className="ui-field">
                    <label className="ui-label">{label}</label>
                    <input className="ui-input" type={type} placeholder={placeholder} value={newUser[key]} onChange={e => setNewUser(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="ui-field">
                  <label className="ui-label">Role</label>
                  <select className="ui-select" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
                    <option value="MEMBER">Member</option>
                    <option value="UNIT_HEAD">Unit Head</option>
                    <option value="DEPT_HEAD">Dept Head</option>
                  </select>
                </div>
                {createMsg && !createMsg.includes('created') && <div className="ui-banner ui-banner--danger" style={{ marginBottom: '14px' }}>{createMsg}</div>}
                <div className="ui-banner ui-banner--warning" style={{ marginBottom: '20px' }}>A temporary password will be generated and sent to the user's email.</div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                  <Button variant="success" loading={creating} onClick={handleCreateUser}>Create user</Button>
                </div>
              </>
            ) : (
              <div>
                <div className="ui-banner ui-banner--success" style={{ display: 'block', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px' }}>User created successfully.</div>
                  <div style={{ fontSize: 'var(--fs-sm)', marginBottom: '8px' }}>Account: <strong>{newUser.email}</strong></div>
                  <div style={{ fontSize: 'var(--fs-sm)', marginBottom: '8px' }}>Temporary password:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <code style={{ flex: 1, padding: '10px', backgroundColor: 'var(--c-surface)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-md)', fontWeight: 700, letterSpacing: '1px', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}>{tempPassword}</code>
                    <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(tempPassword)}>Copy</Button>
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)' }}>Share this with the user. They'll be asked to change it on first login.</div>
                </div>
                <Button variant="success" style={{ width: '100%' }} onClick={() => { setShowCreateUser(false); setTempPassword(''); setCreateMsg(''); }}>Done — password saved</Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;