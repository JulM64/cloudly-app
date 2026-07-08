// src/pages/DashboardPage.js - Role-aware dashboard with file opening
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#9c27b0', icon: '👑' },
  DEPT_HEAD:   { label: 'Dept Head',   color: '#0066ff', icon: '🏢' },
  UNIT_HEAD:   { label: 'Unit Head',   color: '#4caf50', icon: '🔷' },
  MEMBER:      { label: 'Member',      color: '#ff9800', icon: '👤' },
};

const ACTION_ICONS = {
  UPLOAD_FILE:              '📤',
  CREATE_DEPARTMENT:        '🏢',
  CREATE_UNIT:              '🔷',
  CREATE_USER:              '👤',
  UPDATE_USER_DEPARTMENT:   '🔄',
  PROPOSE_ROLE_CHANGE:      '📋',
  AUTO_APPROVE_ROLE_CHANGE: '✅',
  APPROVE_ROLE_CHANGE:      '✅',
  REJECT_ROLE_CHANGE:       '❌',
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

const DashboardPage = ({ user }) => {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [openingFile, setOpeningFile] = useState(null);
  const [openError, setOpenError] = useState('');

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

  useEffect(() => { loadStats(); }, []);

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
      setOpenError('Failed to open file: ' + err.message);
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
    { label: 'Total Files',   value: stats.totalFiles ?? 0,          icon: '📁', color: '#0066ff' },
    { label: 'Storage Used',  value: formatBytes(stats.storageUsed), icon: '💾', color: '#4caf50' },
    ...(stats.scope !== 'MEMBER' ? [
      { label: 'Team Members', value: stats.teamMembers ?? 0, icon: '👥', color: '#ff9800' },
    ] : []),
    ...((stats.scope === 'GLOBAL' || stats.scope === 'DEPARTMENT') && stats.totalDepartments !== undefined ? [
      { label: 'Departments', value: stats.totalDepartments ?? 0, icon: '🏢', color: '#9c27b0' },
    ] : []),
    ...(stats.totalUnits !== undefined && stats.scope !== 'MEMBER' ? [
      { label: 'Units', value: stats.totalUnits ?? 0, icon: '🔷', color: '#00bcd4' },
    ] : []),
  ] : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '32px' }}>
        <div>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '4px' }}>📊 Dashboard</h1>
          <p className="page-description" style={{ textAlign: 'left', margin: 0 }}>{scopeLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: `${roleCfg.color}15`, padding: '8px 16px', borderRadius: '20px' }}>
          <span style={{ fontSize: '18px' }}>{roleCfg.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: roleCfg.color }}>{roleCfg.label}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666', fontSize: '20px' }}>⏳ Loading dashboard…</div>
      ) : error ? (
        <div style={{ padding: '20px', backgroundColor: '#ffeaea', borderRadius: '10px', color: '#c62828', textAlign: 'center' }}>
          ❌ {error}
          <div style={{ marginTop: '12px' }}>
            <button onClick={loadStats} className="btn-3d" style={{ padding: '8px 20px' }}>🔄 Retry</button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            {statCards.map((stat, i) => (
              <div key={i} className="hover-card" style={{ padding: '25px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderTop: `4px solid ${stat.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '30px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>{stat.value}</div>
                    <div style={{ color: '#666', fontSize: '14px' }}>{stat.label}</div>
                  </div>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Open file error */}
          {openError && (
            <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#ffeaea', borderRadius: '8px', color: '#c62828', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
              ❌ {openError}
              <button onClick={() => setOpenError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c62828', fontSize: '16px' }}>✕</button>
            </div>
          )}

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '30px' }}>

            {/* Recent Files */}
            <div className="page-card">
              <h3 style={{ marginBottom: '16px' }}>📁 Recent Files</h3>
              {!stats.recentUploads || stats.recentUploads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📂</div>
                  <div>No files uploaded yet.</div>
                  {stats.scope !== 'MEMBER' && (
                    <div style={{ fontSize: '12px', marginTop: '8px', color: '#bbb' }}>Files uploaded by your team will appear here.</div>
                  )}
                </div>
              ) : (
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {stats.recentUploads.map((file, i) => (
                    <div key={file.fileId || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '10px', borderLeft: `4px solid ${i === 0 ? '#0066ff' : '#ddd'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '22px', flexShrink: 0 }}>{getFileIcon(file.fileType)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '14px' }}>
                            {file.originalName || file.fileName}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                            {timeAgo(file.uploadDate)} · {formatBytes(file.fileSize)}
                            {file.userEmail && file.userEmail !== user?.email && (
                              <span style={{ marginLeft: '6px' }}>· {file.userEmail}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenFile(file)}
                        disabled={openingFile === file.fileId}
                        style={{ padding: '6px 14px', backgroundColor: openingFile === file.fileId ? '#aaa' : '#0066ff', color: 'white', border: 'none', borderRadius: '6px', cursor: openingFile === file.fileId ? 'default' : 'pointer', fontSize: '12px', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' }}
                      >
                        {openingFile === file.fileId ? '⏳' : '👁️ Open'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="page-card">
              <h3 style={{ marginBottom: '16px' }}>📝 Recent Activity</h3>
              {!stats.recentActivity || stats.recentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                  <div>No recent activity.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                  {stats.recentActivity.map((act, i) => {
                    const icon = ACTION_ICONS[act.action] || '📌';
                    const label = (act.action || '').replace(/_/g, ' ').toLowerCase();
                    const isYou = act.email === user?.email;
                    return (
                      <div key={i} style={{ padding: '12px 14px', backgroundColor: '#f8f9fa', borderRadius: '8px', borderLeft: `3px solid ${isYou ? '#0066ff' : '#4caf50'}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: isYou ? '#0066ff' : '#4caf50', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                            {icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', color: '#333' }}>
                              <span style={{ fontWeight: '700', color: isYou ? '#0066ff' : '#4caf50' }}>{isYou ? 'You' : act.email?.split('@')[0]}</span>
                              {' '}<span style={{ color: '#666' }}>{label}</span>
                              {act.target && <span style={{ fontWeight: '600', color: '#333' }}> {act.target}</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '3px' }}>
                              {act.createdAt ? timeAgo(act.createdAt) : act.timestamp ? timeAgo(new Date(act.timestamp).toISOString()) : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;