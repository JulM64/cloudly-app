// src/pages/DashboardPage.js - Role-aware dashboard with file opening
// Visual layer rebuilt on the shared ui/ primitives + design tokens.
// All data-fetching, state, and handlers are unchanged from the original.
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import PageHeader from '../components/ui/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import EditFileModal from '../components/EditFileModal';
import {
  IconFile, IconUsers, IconBuilding, IconLayers, IconEye,
  IconFolder, IconClock, IconAlertCircle, IconClose,
  IconUploadCloud, IconEdit, IconCheckCircle, IconXCircle, IconRoles,
} from '../components/icons';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', tone: 'brand' },
  DEPT_HEAD:   { label: 'Dept Head',   tone: 'info' },
  UNIT_HEAD:   { label: 'Unit Head',   tone: 'success' },
  MEMBER:      { label: 'Member',      tone: 'neutral' },
};

const ACTION_ICONS = {
  UPLOAD_FILE:              IconUploadCloud,
  CREATE_DEPARTMENT:        IconBuilding,
  CREATE_UNIT:              IconLayers,
  CREATE_USER:              IconUsers,
  UPDATE_USER_DEPARTMENT:   IconEdit,
  PROPOSE_ROLE_CHANGE:      IconRoles,
  AUTO_APPROVE_ROLE_CHANGE: IconCheckCircle,
  APPROVE_ROLE_CHANGE:      IconCheckCircle,
  REJECT_ROLE_CHANGE:       IconXCircle,
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

const DashboardPage = ({ user }) => {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [openingFile, setOpeningFile] = useState(null);
  const [openError, setOpenError] = useState('');
  const [editingFile, setEditingFile] = useState(null);

  const roleCfg = ROLE_CONFIG[user?.role] || ROLE_CONFIG.MEMBER;

  const loadStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiService.getDashboardStats();
      setStats(res.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const handleFocus = () => loadStats();
    const handleVisibility = () => { if (document.visibilityState === 'visible') loadStats(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('cloudly-files-changed', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('cloudly-files-changed', handleFocus);
    };
  }, []);

  const handleOpenFile = async (file) => {
    setOpenError('');
    if (!file.userId || !file.fileId) {
      setOpenError('Cannot open this file — missing metadata.');
      return;
    }
    try {
      setOpeningFile(file.fileId);
      const res = await apiService.openFile(file.userId, file.fileId);
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const isMissing = /not found|404/i.test(err.message || '');
      if (isMissing) {
        setStats((prev) => prev && {
          ...prev,
          recentUploads: (prev.recentUploads || []).filter((f) => f.fileId !== file.fileId),
        });
        setOpenError('That file no longer exists — it may have been deleted. Refreshing the list…');
        loadStats();
      } else {
        setOpenError('Failed to open file: ' + err.message);
      }
    } finally {
      setOpeningFile(null);
    }
  };

  const scopeLabel =
    stats?.scope === 'GLOBAL'     ? 'Organization-wide' :
    stats?.scope === 'DEPARTMENT' ? `Department: ${user?.department}` :
    stats?.scope === 'UNIT'       ? `Unit: ${user?.department}` :
    'Your files';

  const statCards = stats ? [
    { label: 'Total Files',   value: stats.totalFiles ?? 0,          icon: <IconFile size={18} /> },
    { label: 'Storage Used',  value: formatBytes(stats.storageUsed), icon: <IconLayers size={18} /> },
    ...(stats.scope !== 'MEMBER' ? [
      { label: 'Team Members', value: stats.teamMembers ?? 0, icon: <IconUsers size={18} /> },
    ] : []),
    ...((stats.scope === 'GLOBAL' || stats.scope === 'DEPARTMENT') && stats.totalDepartments !== undefined ? [
      { label: 'Departments', value: stats.totalDepartments ?? 0, icon: <IconBuilding size={18} /> },
    ] : []),
    ...(stats.totalUnits !== undefined && stats.scope !== 'MEMBER' ? [
      { label: 'Units', value: stats.totalUnits ?? 0, icon: <IconLayers size={18} /> },
    ] : []),
  ] : [];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={scopeLabel}
        action={<Badge tone={roleCfg.tone}>{roleCfg.label}</Badge>}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>Loading dashboard…</div>
      ) : error ? (
        <Card>
          <EmptyState
            icon={<IconAlertCircle size={28} />}
            title="Couldn't load your dashboard"
            description={error}
            action={<Button variant="secondary" size="sm" onClick={loadStats}>Retry</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map((stat, i) => (
              <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} />
            ))}
          </div>

          {openError && (
            <div className="ui-banner ui-banner--danger" style={{ marginTop: '20px' }}>
              <span>{openError}</span>
              <button className="ui-banner-close" onClick={() => setOpenError('')} aria-label="Dismiss"><IconClose size={14} /></button>
            </div>
          )}

          <div className="cl-split-layout" style={{ marginTop: '24px' }}>
            <Card>
              <CardHeader title="Recent Files" />
              {!stats.recentUploads || stats.recentUploads.length === 0 ? (
                <EmptyState
                  icon={<IconFolder size={28} />}
                  title="No files uploaded yet"
                  description={stats.scope !== 'MEMBER' ? 'Files uploaded by your team will appear here.' : undefined}
                />
              ) : (
                <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="recent-uploads">
                  {stats.recentUploads.map((file) => (
                    <div key={file.fileId} className="cl-file-row">
                      <div className="cl-file-row-main">
                        <span className="cl-file-icon"><IconFile size={16} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div className="cl-file-name">
                            <span>{file.originalName || file.fileName}</span>
                            {file.isEdited && <Badge tone="warning" className="cl-edited-badge">Edited</Badge>}
                          </div>
                          <div className="cl-file-meta">
                            {timeAgo(file.uploadDate)} &middot; {formatBytes(file.fileSize)}
                            {file.isEdited && file.lastModifiedAt && <span> &middot; edited {timeAgo(file.lastModifiedAt)}</span>}
                            {file.userEmail && file.userEmail !== user?.email && <span> &middot; {file.userEmail}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {file.userId === user?.userId && (
                          <Button variant="secondary" size="sm" icon={<IconEdit size={14} />} onClick={() => setEditingFile(file)}>Edit</Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<IconEye size={14} />}
                          loading={openingFile === file.fileId}
                          onClick={() => handleOpenFile(file)}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Recent Activity" />
              {!stats.recentActivity || stats.recentActivity.length === 0 ? (
                <EmptyState icon={<IconClock size={28} />} title="No recent activity" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {stats.recentActivity.map((act, i) => {
                    const ActIcon = ACTION_ICONS[act.action] || IconClock;
                    const label = (act.action || '').replace(/_/g, ' ').toLowerCase();
                    const isYou = act.email === user?.email;
                    return (
                      <div key={i} className="cl-activity-row">
                        <span className={`cl-activity-dot ${isYou ? 'cl-activity-dot--you' : ''}`}><ActIcon size={14} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text)' }}>
                            <span style={{ fontWeight: 600, color: isYou ? 'var(--c-brand)' : 'var(--c-success)' }}>{isYou ? 'You' : act.email?.split('@')[0]}</span>
                            {' '}<span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
                            {act.target && <span style={{ fontWeight: 600 }}> {act.target}</span>}
                          </div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)', marginTop: '2px' }}>
                            {act.createdAt ? timeAgo(act.createdAt) : act.timestamp ? timeAgo(new Date(act.timestamp).toISOString()) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <style>{`
        .cl-file-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; background:var(--c-bg); border-radius:var(--radius-md); margin-bottom:10px; }
        .cl-file-row-main { display:flex; align-items:center; gap:12px; min-width:0; flex:1; }
        .cl-file-icon { color: var(--c-text-faint); flex-shrink:0; display:flex; }
        .cl-file-name { display:flex; align-items:center; gap:6px; font-weight:600; color:var(--c-text); font-size:var(--fs-sm); min-width:0; }
        .cl-file-name > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .cl-edited-badge { flex-shrink:0; }
        .cl-file-meta { font-size:var(--fs-xs); color:var(--c-text-muted); margin-top:2px; }
        .cl-activity-row { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; background:var(--c-bg); border-radius:var(--radius-md); }
        .cl-activity-dot { width:28px; height:28px; border-radius:50%; background:var(--c-success-bg); color:var(--c-success); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .cl-activity-dot--you { background:var(--c-brand-tint); color:var(--c-brand); }
      `}</style>

      {editingFile && (
        <EditFileModal file={editingFile} onClose={() => setEditingFile(null)} onSaved={loadStats} />
      )}
    </div>
  );
};

export default DashboardPage;