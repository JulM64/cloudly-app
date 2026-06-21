// src/pages/DashboardPage.js - Role-aware, real data from backend
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#9c27b0', icon: '👑' },
  DEPT_HEAD:   { label: 'Dept Head',   color: '#0066ff', icon: '🏢' },
  UNIT_HEAD:   { label: 'Unit Head',   color: '#4caf50', icon: '🔷' },
  MEMBER:      { label: 'Member',      color: '#ff9800', icon: '👤' },
};

const ACTION_ICONS = {
  UPLOAD_FILE:               '📤',
  CREATE_DEPARTMENT:         '🏢',
  CREATE_UNIT:               '🔷',
  CREATE_USER:               '👤',
  UPDATE_USER_DEPARTMENT:    '🔄',
  PROPOSE_ROLE_CHANGE:       '📋',
  AUTO_APPROVE_ROLE_CHANGE:  '✅',
  APPROVE_ROLE_CHANGE:       '✅',
  REJECT_ROLE_CHANGE:        '❌',
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const formatActivity = (a) => {
  const icon = ACTION_ICONS[a.action] || '📌';
  const label = (a.action || '').replace(/_/g, ' ').toLowerCase();
  return { icon, label };
};

const DashboardPage = ({ user }) => {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

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

  const scopeLabel = stats?.scope === 'GLOBAL' ? 'Organization-wide'
    : stats?.scope === 'DEPARTMENT' ? `Department: ${user?.department}`
    : stats?.scope === 'UNIT' ? `Unit: ${user?.department}`
    : `Your files`;

  const statCards = stats ? [
    { label: 'Total Files',   value: stats.totalFiles ?? 0,                icon: '📁', color: '#0066ff' },
    { label: 'Storage Used',  value: formatBytes(stats.storageUsed),       icon: '💾', color: '#4caf50' },
    ...(stats.scope !== 'MEMBER' ? [
      { label: 'Team Members', value: stats.teamMembers ?? 0,              icon: '👥', color: '#ff9800' },
    ] : []),
    ...(stats.scope === 'GLOBAL' || stats.scope === 'DEPARTMENT' ? [
      { label: 'Departments',  value: stats.totalDepartments ?? 0,         icon: '🏢', color: '#9c27b0' },
    ] : []),
    ...(stats.totalUnits !== undefined ? [
      { label: 'Units',        value: stats.totalUnits ?? 0,               icon: '🔷', color: '#00bcd4' },
    ] : []),
  ] : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '4px' }}>📊 Dashboard</h1>
          <p className="page-description" style={{ textAlign: 'left', margin: 0 }}>{scopeLabel}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: `${roleCfg.color}15`, padding: '8px 16px', borderRadius: '20px' }}>
          <span style={{ fontSize: '18px' }}>{roleCfg.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: roleCfg.color }}>{roleCfg.label}</span>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }} />

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
            {statCards.map((stat, index) => (
              <div key={index} className="hover-card" style={{
                padding: '25px', backgroundColor: 'white', borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderTop: `4px solid ${stat.color}`,
                animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
              }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '40px' }}>
            {/* Recent Files */}
            <div className="page-card">
              <h3>📁 Recent Files</h3>
              {(!stats.recentUploads || stats.recentUploads.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📂</div>
                  <div>No files uploaded yet.</div>
                </div>
              ) : (
                <div className="recent-uploads" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {stats.recentUploads.map((file, index) => (
                    <div key={file.fileId || index} className="table-row" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '10px',
                      borderLeft: `4px solid ${index === 0 ? '#0066ff' : '#ddd'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: 0 }}>
                        <span style={{ fontSize: '24px', flexShrink: 0 }}>📄</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: '600', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.originalName || file.fileName}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            {timeAgo(file.uploadDate)} • {formatBytes(file.fileSize)} • {file.userEmail || 'You'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="page-card">
              <h3>📝 Recent Activity</h3>
              {(!stats.recentActivity || stats.recentActivity.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                  <div>No recent activity.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stats.recentActivity.map((act, index) => {
                    const { icon, label } = formatActivity(act);
                    const isYou = act.email === user?.email;
                    return (
                      <div key={index} className="table-row" style={{ padding: '14px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            backgroundColor: isYou ? '#0066ff' : '#4caf50', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0
                          }}>{icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '500', color: '#333', fontSize: '13px' }}>
                              <span style={{ color: '#0066ff' }}>{isYou ? 'You' : act.email}</span>{' '}
                              <span style={{ color: '#666' }}>{label}</span>{' '}
                              {act.target && <span style={{ color: '#333', fontWeight: '600' }}>{act.target}</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                              {timeAgo(act.createdAt) || (act.timestamp ? timeAgo(new Date(act.timestamp).toISOString()) : '')}
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