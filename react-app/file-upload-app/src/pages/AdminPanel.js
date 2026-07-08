// src/pages/AdminPanel.js - Real data from backend
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#9c27b0', bg: '#f3e5f5', icon: '👑' },
  DEPT_HEAD:   { label: 'Dept Head',   color: '#0066ff', bg: '#e3f2fd', icon: '🏢' },
  UNIT_HEAD:   { label: 'Unit Head',   color: '#4caf50', bg: '#e8f5e9', icon: '🔷' },
  MEMBER:      { label: 'Member',      color: '#ff9800', bg: '#fff3e0', icon: '👤' },
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.MEMBER;
  return (
    <span style={{ padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const confirmed = status === 'CONFIRMED';
  return (
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600', backgroundColor: confirmed ? '#e8f5e9' : '#fff3e0', color: confirmed ? '#2e7d32' : '#e65100' }}>
      {confirmed ? '✅ Active' : '⏳ ' + status}
    </span>
  );
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
  return `${Math.floor(h / 24)}d ago`;
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
  DELETE_DEPARTMENT:        '🗑️',
};

const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' };
const btn = (color = '#0066ff') => ({ padding: '8px 18px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' });

// ── Admin Panel ───────────────────────────────────────────────────────────────
const AdminPanel = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [activities, setActivities] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Users tab state
  const [userSearch, setUserSearch]   = useState('');
  const [userFilter, setUserFilter]   = useState('ALL');
  const [actionMsg, setActionMsg]     = useState('');

  // Logs tab state
  const [logFilter, setLogFilter] = useState('ALL');

  // Create user modal
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser]               = useState({ firstName: '', lastName: '', email: '', department: '', role: 'MEMBER' });
  const [creating, setCreating]             = useState(false);
  const [createMsg, setCreateMsg]           = useState('');
  const [tempPassword, setTempPassword]     = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsRes, usersRes, actsRes, pendingRes] = await Promise.allSettled([
        apiService.getAdminStats(),
        apiService.getUsers(),
        apiService.getActivities(),
        apiService.getPendingRoleCount(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.stats);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.users || []);
      if (actsRes.status === 'fulfilled')  setActivities(actsRes.value.activities || []);
      if (pendingRes.status === 'fulfilled') setPendingCount(pendingRes.value.pendingCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.firstName.trim() || !newUser.email.trim()) { setCreateMsg('❌ First name and email required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) { setCreateMsg('❌ Invalid email.'); return; }
    try {
      setCreating(true);
      const res = await apiService.createUser(newUser);
      setTempPassword(res.tempPassword);
      setCreateMsg('✅ User created!');
      await loadAll();
    } catch (err) {
      setCreateMsg('❌ ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleQuickRoleChange = async (u, newRole) => {
    if (u.role === newRole) return;
    try {
      setActionMsg('');
      await apiService.proposeRoleChange({ targetEmail: u.email, targetName: u.name, newRole, department: u.department, reason: 'Admin quick role change' });
      setActionMsg(`✅ ${u.name} → ${newRole}`);
      await loadAll();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('❌ ' + err.message);
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchSearch = !userSearch.trim() ||
      (u.name||'').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email||'').toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userFilter === 'ALL' || u.role === userFilter || (!u.role && userFilter === 'MEMBER');
    return matchSearch && matchRole;
  });

  // Filter logs
  const filteredLogs = logFilter === 'ALL'
    ? activities
    : activities.filter(a => a.action?.includes(logFilter));

  const tabs = [
    { key: 'users',    label: '👥 Users',    count: users.length },
    { key: 'system',   label: '⚙️ System',   count: null },
    { key: 'logs',     label: '📋 Logs',     count: activities.length },
    { key: 'security', label: '🔒 Security', count: pendingCount > 0 ? pendingCount : null },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ marginBottom: '6px' }}>👑 Admin Panel</h1>
      <p className="page-description" style={{ marginBottom: '28px' }}>
        System administration — logged in as <strong>{user?.email}</strong>
      </p>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '14px', marginBottom: '28px' }}>
          {[
            { label: 'Users',       value: stats.totalUsers ?? '—',       icon: '👥', color: '#0066ff' },
            { label: 'Departments', value: stats.totalDepartments ?? '—', icon: '🏢', color: '#9c27b0' },
            { label: 'Units',       value: stats.totalUnits ?? '—',       icon: '🔷', color: '#00bcd4' },
            { label: 'Files',       value: stats.totalFiles ?? '—',       icon: '📁', color: '#4caf50' },
            { label: 'Storage',     value: formatBytes(stats.storageUsed), icon: '💾', color: '#ff9800' },
            { label: 'Pending Roles', value: stats.pendingRoleRequests ?? 0, icon: '⏳', color: stats.pendingRoleRequests > 0 ? '#ef5350' : '#888' },
          ].map((s, i) => (
            <div key={i} className="hover-card" style={{ padding: '18px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', backgroundColor: '#ffeaea', borderRadius: '8px', color: '#c62828', marginBottom: '20px' }}>
          ❌ {error} <button onClick={loadAll} style={{ ...btn('#ef5350'), padding: '4px 12px', fontSize: '12px', marginLeft: '10px' }}>Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="page-card">
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
              backgroundColor: activeTab === tab.key ? '#0066ff' : 'white',
              color: activeTab === tab.key ? 'white' : '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}>
              {tab.label}
              {tab.count !== null && tab.count !== undefined && (
                <span style={{ backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : tab.key === 'security' && tab.count > 0 ? '#ef5350' : '#e0e0e0', color: activeTab === tab.key ? 'white' : tab.key === 'security' && tab.count > 0 ? 'white' : '#555', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '800' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888', fontSize: '18px' }}>⏳ Loading…</div>
        ) : (
          <>
            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <input type="text" placeholder="🔍 Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} style={inp} />
                  </div>
                  <select value={userFilter} onChange={e => setUserFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
                    <option value="ALL">All Roles</option>
                    <option value="SUPER_ADMIN">👑 Super Admin</option>
                    <option value="DEPT_HEAD">🏢 Dept Head</option>
                    <option value="UNIT_HEAD">🔷 Unit Head</option>
                    <option value="MEMBER">👤 Member</option>
                  </select>
                  <button onClick={() => { setShowCreateUser(true); setNewUser({ firstName: '', lastName: '', email: '', department: '', role: 'MEMBER' }); setCreateMsg(''); setTempPassword(''); }}
                    style={{ ...btn('#4caf50'), whiteSpace: 'nowrap' }}>
                    ➕ Create User
                  </button>
                  <button onClick={loadAll} style={{ ...btn('#888'), whiteSpace: 'nowrap' }}>🔄 Refresh</button>
                </div>

                {actionMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', backgroundColor: actionMsg.includes('✅') ? '#e8f5e9' : '#ffeaea', color: actionMsg.includes('✅') ? '#2e7d32' : '#c62828' }}>
                    {actionMsg}
                  </div>
                )}

                {filteredUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>👤</div>
                    <div>No users found{userSearch ? ` matching "${userSearch}"` : ''}.</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                          {['Name','Email','Role','Department','Status','Quick Actions'].map(h => (
                            <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '12px', color: '#555', fontWeight: '700', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, i) => (
                          <tr key={u.email} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: ROLE_CONFIG[u.role||'MEMBER']?.color || '#0066ff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                                  {(u.name||u.email)[0].toUpperCase()}
                                </div>
                                <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.name || '—'}</div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: '#555' }}>{u.email}</td>
                            <td style={{ padding: '12px 14px' }}><RoleBadge role={u.role||'MEMBER'} /></td>
                            <td style={{ padding: '12px 14px', fontSize: '13px', color: '#555' }}>
                              {u.department ? <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>📂 {u.department}</span> : <span style={{ color: '#aaa', fontSize: '12px' }}>—</span>}
                            </td>
                            <td style={{ padding: '12px 14px' }}><StatusBadge status={u.status} /></td>
                            <td style={{ padding: '12px 14px' }}>
                              <select
                                defaultValue={u.role || 'MEMBER'}
                                onChange={e => handleQuickRoleChange(u, e.target.value)}
                                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', cursor: 'pointer', backgroundColor: 'white' }}
                              >
                                <option value="MEMBER">👤 Member</option>
                                <option value="UNIT_HEAD">🔷 Unit Head</option>
                                <option value="DEPT_HEAD">🏢 Dept Head</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: '14px', fontSize: '13px', color: '#888' }}>
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </div>
            )}

            {/* ── SYSTEM TAB ── */}
            {activeTab === 'system' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>⚙️ System Configuration</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {[
                    { title: '🗄️ Database', items: [
                      ['Provider', 'Amazon DynamoDB'],
                      ['Region', 'us-east-1'],
                      ['Tables', 'cloudly-departments, cloudly-files, cloudly-activities, cloudly-role-requests'],
                    ]},
                    { title: '☁️ Storage', items: [
                      ['Provider', 'Amazon S3'],
                      ['Bucket Prefix', 'cloudly-dept-*'],
                      ['Total Files', stats?.totalFiles ?? '—'],
                      ['Total Storage', formatBytes(stats?.storageUsed)],
                    ]},
                    { title: '🔐 Authentication', items: [
                      ['Provider', 'AWS Cognito'],
                      ['User Pool', 'us-east-1_b2tbKQ0Sj'],
                      ['Region', 'us-east-1'],
                      ['Total Users', stats?.totalUsers ?? '—'],
                    ]},
                    { title: '📊 Role Distribution', items: Object.entries(stats?.roleCounts || {}).map(([role, count]) => [role.replace('_',' '), count]) },
                  ].map((section, i) => (
                    <div key={i} style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px' }}>
                      <h4 style={{ marginBottom: '14px', fontSize: '15px', color: '#333' }}>{section.title}</h4>
                      {section.items.map(([key, val], j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: j < section.items.length - 1 ? '1px solid #eee' : 'none' }}>
                          <span style={{ fontSize: '13px', color: '#666' }}>{key}</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#333', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Dept stats */}
                {stats?.departmentStats && Object.keys(stats.departmentStats).length > 0 && (
                  <div style={{ marginTop: '24px', backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px' }}>
                    <h4 style={{ marginBottom: '14px', fontSize: '15px', color: '#333' }}>📁 Files per Department</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      {Object.entries(stats.departmentStats).map(([dept, data]) => (
                        <div key={dept} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '14px', border: '1px solid #eee' }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: '#333' }}>📂 {dept}</div>
                          <div style={{ fontSize: '13px', color: '#666' }}>{data.fileCount} files</div>
                          <div style={{ fontSize: '13px', color: '#888' }}>{formatBytes(data.totalSize)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── LOGS TAB ── */}
            {activeTab === 'logs' && (
              <div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>📋 Activity Logs</h3>
                  <select value={logFilter} onChange={e => setLogFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
                    <option value="ALL">All Actions</option>
                    <option value="UPLOAD">📤 Uploads</option>
                    <option value="CREATE">➕ Created</option>
                    <option value="ROLE">🔄 Role Changes</option>
                    <option value="USER">👤 User Actions</option>
                  </select>
                  <button onClick={loadAll} style={{ ...btn('#888') }}>🔄 Refresh</button>
                  <span style={{ fontSize: '13px', color: '#888', marginLeft: 'auto' }}>{filteredLogs.length} entries</span>
                </div>

                {filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                    <div>No activity logs found.</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                        <tr>
                          {['Time','User','Action','Target','Details'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '12px', color: '#555', fontWeight: '700', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((act, i) => {
                          const icon = ACTION_ICONS[act.action] || '📌';
                          let details = '';
                          try { details = act.details ? JSON.stringify(JSON.parse(act.details)).slice(0, 60) : ''; } catch {}
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                              <td style={{ padding: '10px 14px', fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>{timeAgo(act.createdAt)}</td>
                              <td style={{ padding: '10px 14px', fontSize: '13px', color: '#333', fontWeight: '500' }}>{act.email}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ fontSize: '12px', backgroundColor: '#f0f7ff', color: '#0066ff', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                                  {icon} {(act.action||'').replace(/_/g,' ').toLowerCase()}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', fontSize: '13px', color: '#555', fontWeight: '600' }}>{act.target || '—'}</td>
                              <td style={{ padding: '10px 14px', fontSize: '11px', color: '#aaa', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── SECURITY TAB ── */}
            {activeTab === 'security' && (
              <div>
                <h3 style={{ marginBottom: '20px' }}>🔒 Security & Access Control</h3>

                {/* Pending role requests banner */}
                {pendingCount > 0 ? (
                  <div style={{ backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: '10px', padding: '18px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#e65100', fontSize: '15px' }}>⏳ {pendingCount} Pending Role Request{pendingCount > 1 ? 's' : ''}</div>
                      <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>Role changes proposed by department heads waiting for your approval.</div>
                    </div>
                    <Link to="/role-requests" style={{ ...btn('#ff9800'), textDecoration: 'none', display: 'inline-block' }}>
                      📋 Review Now
                    </Link>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '10px', padding: '18px', marginBottom: '24px' }}>
                    <div style={{ fontWeight: '700', color: '#2e7d32' }}>✅ No pending role requests</div>
                    <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>All role change requests have been processed.</div>
                  </div>
                )}

                {/* Role distribution */}
                {stats?.roleCounts && (
                  <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>👥 User Role Distribution</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
                      {Object.entries(ROLE_CONFIG).filter(([r]) => r !== 'SUPER_ADMIN' || true).map(([role, cfg]) => (
                        <div key={role} style={{ backgroundColor: cfg.bg, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                          <div style={{ fontSize: '28px', fontWeight: '800', color: cfg.color }}>{stats.roleCounts[role] ?? 0}</div>
                          <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>{cfg.icon} {cfg.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AWS Config */}
                <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>☁️ AWS Configuration</h4>
                  {[
                    ['Cognito User Pool',  'us-east-1_b2tbKQ0Sj'],
                    ['Identity Pool',      'us-east-1:144ca3fc-aadf-47c6-b192-994157933ca3'],
                    ['Region',             'us-east-1'],
                    ['S3 Bucket Prefix',   'cloudly-dept-*'],
                    ['DynamoDB Tables',    '4 tables active'],
                  ].map(([key, val], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? '1px solid #eee' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>{key}</span>
                      <code style={{ fontSize: '12px', backgroundColor: '#eee', padding: '2px 8px', borderRadius: '4px', color: '#333' }}>{val}</code>
                    </div>
                  ))}
                </div>

                {/* Quick security actions */}
                <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '20px' }}>
                  <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>⚡ Quick Actions</h4>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link to="/role-requests" style={{ ...btn('#0066ff'), textDecoration: 'none' }}>🔐 Role Requests</Link>
                    <Link to="/departments" style={{ ...btn('#9c27b0'), textDecoration: 'none' }}>🏢 Manage Departments</Link>
                    <button onClick={loadAll} style={btn('#4caf50')}>🔄 Refresh Data</button>
                    <button onClick={() => setActiveTab('logs')} style={btn('#ff9800')}>📋 View Logs</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ CREATE USER MODAL ══ */}
      {showCreateUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '32px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>👤 Create New User</h2>
              {!tempPassword && <button onClick={() => setShowCreateUser(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>}
            </div>

            {!tempPassword ? (
              <>
                {[
                  ['First Name *','firstName','text','e.g., Jean'],
                  ['Last Name','lastName','text','e.g., Dupont'],
                  ['Email *','email','email','e.g., jean@company.com'],
                  ['Department','department','text','e.g., DIP'],
                ].map(([label, key, type, placeholder]) => (
                  <div key={key} style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>{label}</label>
                    <input type={type} placeholder={placeholder} value={newUser[key]} onChange={e => setNewUser(p => ({ ...p, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Role</label>
                  <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} style={inp}>
                    <option value="MEMBER">👤 Member</option>
                    <option value="UNIT_HEAD">🔷 Unit Head</option>
                    <option value="DEPT_HEAD">🏢 Dept Head</option>
                  </select>
                </div>
                {createMsg && !createMsg.includes('✅') && (
                  <div style={{ padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', backgroundColor: '#ffeaea', color: '#c62828' }}>{createMsg}</div>
                )}
                <div style={{ backgroundColor: '#fff3e0', borderRadius: '8px', padding: '10px', marginBottom: '20px', fontSize: '13px', color: '#e65100' }}>
                  ⚠️ A temporary password will be generated and sent to the user's email.
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowCreateUser(false)} style={btn('#888')}>Cancel</button>
                  <button onClick={handleCreateUser} disabled={creating} style={{ ...btn('#4caf50'), opacity: creating ? 0.6 : 1 }}>
                    {creating ? '⏳ Creating…' : '✅ Create User'}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ backgroundColor: '#e8f5e9', border: '2px solid #4caf50', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#2e7d32', marginBottom: '8px' }}>✅ User created successfully!</div>
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>📧 Account: <strong>{newUser.email}</strong></div>
                  <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px' }}>🔑 Temporary password:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <code style={{ flex: 1, padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '7px', fontSize: '15px', fontWeight: '700', letterSpacing: '1px', color: '#333', border: '1px solid #ddd' }}>{tempPassword}</code>
                    <button onClick={() => { navigator.clipboard.writeText(tempPassword); alert('✅ Copied!'); }}
                      style={{ ...btn('#0066ff'), padding: '10px 14px', whiteSpace: 'nowrap' }}>📋 Copy</button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>⚠️ Share this with the user. They'll be asked to change it on first login.</div>
                </div>
                <button onClick={() => { setShowCreateUser(false); setTempPassword(''); setCreateMsg(''); }}
                  style={{ ...btn('#4caf50'), width: '100%' }}>✅ Done — Password Saved</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;