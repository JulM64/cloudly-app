// src/pages/DepartmentPage.js - WITH ROLE MANAGEMENT IN MEMBERS MODAL
import React, { useState, useEffect } from 'react';
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
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const backdrop = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalBox = (width = '560px') => ({
  backgroundColor: 'white', borderRadius: '14px', padding: '32px',
  width: '90%', maxWidth: width, maxHeight: '85vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
});
const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' };
const btn = (color = '#0066ff') => ({ padding: '10px 22px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' });

const Bar = ({ label, value, max, color = '#0066ff' }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
        <span style={{ fontSize: '13px', color, fontWeight: '700' }}>{value}</span>
      </div>
      <div style={{ height: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '5px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
};

const DepartmentPage = ({ user }) => {
  const [departments, setDepartments]           = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [initialLoad, setInitialLoad]           = useState(true);
  const [newDept, setNewDept]                   = useState({ name: '', manager: '', description: '', type: 'department', parentId: '' });

  const [showEditModal, setShowEditModal]       = useState(false);
  const [editData, setEditData]                 = useState({});

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedDept, setSelectedDept]         = useState(null);
  const [cognitoUsers, setCognitoUsers]         = useState([]);
  const [loadingUsers, setLoadingUsers]         = useState(false);
  const [savingMember, setSavingMember]         = useState(false);
  const [membersTab, setMembersTab]             = useState('manual');
  const [manualMember, setManualMember]         = useState({ name: '', email: '', role: 'MEMBER' });
  const [currentMembers, setCurrentMembers]     = useState([]);

  // Role proposal modal
  const [showRoleModal, setShowRoleModal]       = useState(false);
  const [roleTarget, setRoleTarget]             = useState(null);
  const [proposedRole, setProposedRole]         = useState('MEMBER');
  const [roleReason, setRoleReason]             = useState('');
  const [proposingRole, setProposingRole]       = useState(false);
  const [roleMessage, setRoleMessage]           = useState('');

  const [showAnalytics, setShowAnalytics]       = useState(false);

  const isAdmin    = user?.role === 'SUPER_ADMIN';
  const isDeptHead = user?.role === 'DEPT_HEAD';
  const isUnitHead = user?.role === 'UNIT_HEAD';
  const canManage  = isAdmin || isDeptHead || isUnitHead;

  const topLevelDepts = departments.filter(d => d.type === 'department' || !d.type);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await apiService.getDepartments();
      let depts = res.departments || [];

      // Frontend safety filter — DEPT_HEAD sees only their dept + its units
      if (user?.role === 'DEPT_HEAD' && user?.department) {
        const userDept = user.department.toLowerCase().trim();
        const myDept = depts.find(d =>
          (d.name || '').toLowerCase().trim() === userDept &&
          (!d.type || d.type === 'department')
        );
        if (myDept) {
          depts = depts.filter(d => d.id === myDept.id || d.parentId === myDept.id);
        } else {
          depts = depts.filter(d => (d.name || '').toLowerCase().trim() === userDept);
        }
      }

      // UNIT_HEAD sees only their unit
      if (user?.role === 'UNIT_HEAD' && user?.department) {
        const userDept = user.department.toLowerCase().trim();
        depts = depts.filter(d => (d.name || '').toLowerCase().trim() === userDept);
      }

      setDepartments(depts);
    } catch (err) { alert('Failed to load departments: ' + err.message); }
    finally { setLoading(false); setInitialLoad(false); }
  };

  useEffect(() => { loadDepartments(); }, []);

  const totalMembers = departments.reduce((s, d) => s + (d.members || 0), 0);
  const activeDepts  = departments.filter(d => d.status === 'Active').length;

  const stats = [
    { label: 'Departments', value: departments.filter(d => !d.type || d.type === 'department').length, icon: '🏢', color: '#0066ff' },
    { label: 'Active',      value: activeDepts,   icon: '✅', color: '#4caf50' },
    { label: 'Units',       value: departments.filter(d => d.type === 'unit').length, icon: '🔷', color: '#9c27b0' },
    { label: 'Members',     value: totalMembers,  icon: '👥', color: '#ff9800' },
  ];

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.name.trim() || !newDept.manager.trim()) { alert('Name and manager required.'); return; }
    if (newDept.type === 'unit' && !newDept.parentId) { alert('Please select a parent department.'); return; }
    try {
      setLoading(true);
      await apiService.createDepartment({ name: newDept.name.trim(), manager: newDept.manager.trim(), description: newDept.description.trim(), type: newDept.type, parentId: newDept.parentId || null });
      await loadDepartments();
      setNewDept({ name: '', manager: '', description: '', type: 'department', parentId: '' });
    } catch (err) { alert('Failed to create: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department/unit?')) return;
    try { setLoading(true); await apiService.deleteDepartment(id); await loadDepartments(); }
    catch (err) { alert('Failed to delete: ' + err.message); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (dept) => {
    const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    try { setLoading(true); await apiService.updateDepartment(dept.id, { status: newStatus }); await loadDepartments(); }
    catch (err) { alert('Failed to update: ' + err.message); }
    finally { setLoading(false); }
  };

  const openEdit = (dept) => { setEditData({ ...dept }); setShowEditModal(true); };

  const handleSaveEdit = async () => {
    if (!editData.name?.trim() || !editData.manager?.trim()) { alert('Name and manager required.'); return; }
    try {
      setLoading(true);
      await apiService.updateDepartment(editData.id, { name: editData.name.trim(), manager: editData.manager.trim(), description: (editData.description || '').trim(), status: editData.status, projects: editData.projects || 0, type: editData.type, parentId: editData.parentId || null });
      await loadDepartments(); setShowEditModal(false);
    } catch (err) { alert('Failed to save: ' + err.message); }
    finally { setLoading(false); }
  };

  // ── Members ──────────────────────────────────────────────────────────────
  const openMembers = async (dept) => {
    setSelectedDept(dept);
    setMembersTab('manual');
    setManualMember({ name: '', email: '', role: 'MEMBER' });
    setCurrentMembers(Array.isArray(dept.membersList) ? dept.membersList : []);
    setShowMembersModal(true);
    setLoadingUsers(true);
    try { const res = await apiService.getUsers(); setCognitoUsers(res.users || []); }
    catch { setCognitoUsers([]); }
    finally { setLoadingUsers(false); }
  };

  const persistMembers = async (deptId, updatedMembers) => {
    await apiService.updateDepartment(deptId, { membersList: updatedMembers, members: updatedMembers.length });
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, membersList: updatedMembers, members: updatedMembers.length } : d));
    setCurrentMembers(updatedMembers);
  };

  const addManualMember = async () => {
    if (!manualMember.name.trim()) { alert('Please enter a name.'); return; }
    if (!manualMember.email.trim()) { alert('Please enter an email.'); return; }
    if (currentMembers.find(m => m.email === manualMember.email.trim())) { alert('Already in list.'); return; }
    const newMember = { name: manualMember.name.trim(), email: manualMember.email.trim(), role: manualMember.role, source: 'manual' };
    try {
      setSavingMember(true);
      await persistMembers(selectedDept.id, [...currentMembers, newMember]);
      setManualMember({ name: '', email: '', role: 'MEMBER' });
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSavingMember(false); }
  };

  const addCognitoMember = async (user) => {
    if (currentMembers.find(m => m.email === user.email)) { alert('Already added.'); return; }
    const newMember = { name: user.name || user.email, email: user.email, role: 'MEMBER', source: 'cognito' };
    try {
      setSavingMember(true);
      await persistMembers(selectedDept.id, [...currentMembers, newMember]);
      try { await apiService.updateUserDepartment(user.email, selectedDept.name); } catch {}
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSavingMember(false); }
  };

  const removeMember = async (email) => {
    const updated = currentMembers.filter(m => m.email !== email);
    try {
      setSavingMember(true);
      await persistMembers(selectedDept.id, updated);
      const removed = currentMembers.find(m => m.email === email);
      if (removed?.source === 'cognito') { try { await apiService.updateUserDepartment(email, ''); } catch {} }
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSavingMember(false); }
  };

  // ── Role proposal ────────────────────────────────────────────────────────
  const openRoleModal = (member) => {
    setRoleTarget(member);
    setProposedRole(member.role || 'MEMBER');
    setRoleReason('');
    setRoleMessage('');
    setShowRoleModal(true);
  };

  const handleProposeRole = async () => {
    if (!roleTarget) return;
    if (proposedRole === (roleTarget.role || 'MEMBER')) { setRoleMessage('⚠️ Same role — no change needed.'); return; }
    try {
      setProposingRole(true);
      await apiService.proposeRoleChange({
        targetEmail: roleTarget.email,
        targetName:  roleTarget.name,
        newRole:     proposedRole,
        department:  selectedDept?.name,
        reason:      roleReason,
      });
      setRoleMessage('✅ Role change request submitted! Awaiting SUPER_ADMIN approval.');
      setTimeout(() => { setShowRoleModal(false); setRoleMessage(''); }, 2500);
    } catch (err) { setRoleMessage('❌ Failed: ' + err.message); }
    finally { setProposingRole(false); }
  };

  // ── Analytics ────────────────────────────────────────────────────────────
  const analyticsData = {
    active:     departments.filter(d => d.status === 'Active').length,
    inactive:   departments.filter(d => d.status !== 'Active').length,
    byMembers:  departments.map(d => ({ name: d.name, members: d.members || 0 })),
    byProjects: departments.map(d => ({ name: d.name, projects: d.projects || 0 })),
  };

  // ── PDF ──────────────────────────────────────────────────────────────────
  const generatePDFReport = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const deptRows = departments.map(d => {
      const mList = Array.isArray(d.membersList) ? d.membersList : [];
      const memberNames = mList.map(m => `${m.name} (${m.role})`).join(', ') || '—';
      return `<tr><td>${d.name}</td><td>${d.type||'department'}</td><td>${d.manager||'—'}</td><td>${d.members||0}</td><td>${d.projects||0}</td>
        <td><span style="padding:3px 10px;border-radius:12px;background:${d.status==='Active'?'#e7f7ef':'#ffeaea'};color:${d.status==='Active'?'#2e7d32':'#c62828'};font-size:12px;font-weight:600">${d.status||'Active'}</span></td>
        <td>${memberNames}</td><td style="font-size:11px;color:#666">${d.description||'—'}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cloudly Report</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:40px}
    header{display:flex;justify-content:space-between;margin-bottom:32px;border-bottom:3px solid #0066ff;padding-bottom:20px}
    h1{font-size:28px;color:#0066ff}.summary{display:flex;gap:20px;margin-bottom:32px}
    .card{flex:1;background:#f0f7ff;border-radius:10px;padding:18px;text-align:center}
    .card .num{font-size:32px;font-weight:800;color:#0066ff}.card .lbl{font-size:12px;color:#555;margin-top:4px;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;font-size:13px}th{background:#0066ff;color:#fff;padding:10px 12px;text-align:left}
    td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:top}tr:nth-child(even) td{background:#f9f9f9}
    footer{margin-top:40px;font-size:12px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:16px}</style></head>
    <body><header><div><h1>🏢 Cloudly – Department Report</h1></div><div style="font-size:13px;color:#555;text-align:right"><div><b>Date:</b> ${date}</div></div></header>
    <div class="summary">
      <div class="card"><div class="num">${departments.filter(d=>!d.type||d.type==='department').length}</div><div class="lbl">Departments</div></div>
      <div class="card"><div class="num">${departments.filter(d=>d.type==='unit').length}</div><div class="lbl">Units</div></div>
      <div class="card" style="background:#e7f7ef"><div class="num" style="color:#2e7d32">${analyticsData.active}</div><div class="lbl">Active</div></div>
      <div class="card" style="background:#ffeaea"><div class="num" style="color:#c62828">${analyticsData.inactive}</div><div class="lbl">Inactive</div></div>
      <div class="card" style="background:#fff3e0"><div class="num" style="color:#e65100">${totalMembers}</div><div class="lbl">Members</div></div>
    </div>
    <table><thead><tr><th>Name</th><th>Type</th><th>Manager</th><th>Members</th><th>Projects</th><th>Status</th><th>Member List</th><th>Description</th></tr></thead>
    <tbody>${deptRows}</tbody></table>
    <footer>Generated by Cloudly • ${date} • Confidential</footer></body></html>`;
    const win = window.open('', '_blank', 'width=1000,height=700');
    win.document.write(html); win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ marginBottom: '6px' }}>🏢 Department Management</h1>
      <p className="page-description" style={{ marginBottom: '36px', color: '#666' }}>
        {isAdmin ? 'Full control — create, manage, and organize all departments and units' :
         isDeptHead ? `Managing your department: ${user?.department}` :
         `Your unit: ${user?.department}`}
      </p>

      {initialLoad ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666', fontSize: '22px' }}>⏳ Loading…</div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '28px' }}>
            {stats.map((s, i) => (
              <div key={i} className="hover-card" style={{ padding: '22px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', borderTop: `4px solid ${s.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '30px', fontWeight: '800' }}>{s.value}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{s.label}</div>
                  </div>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', backgroundColor: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Form — Admin only */}
          {isAdmin && (
            <div className="page-card" style={{ marginBottom: '28px' }}>
              <h3 style={{ marginBottom: '18px' }}>➕ Add Department or Unit</h3>
              <form onSubmit={handleAddDepartment}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 180px auto', gap: '14px', alignItems: 'end' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>Type *</label>
                    <select value={newDept.type} onChange={e => setNewDept({ ...newDept, type: e.target.value, parentId: '' })} style={inp} disabled={loading}>
                      <option value="department">Department</option>
                      <option value="unit">Unit (child of dept.)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>Name *</label>
                    <input type="text" placeholder="e.g., DIP" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} style={inp} disabled={loading} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>Manager *</label>
                    <input type="text" placeholder="e.g., Jean Dupont" value={newDept.manager} onChange={e => setNewDept({ ...newDept, manager: e.target.value })} style={inp} disabled={loading} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>
                      {newDept.type === 'unit' ? 'Parent Dept. *' : 'Description'}
                    </label>
                    {newDept.type === 'unit' ? (
                      <select value={newDept.parentId} onChange={e => setNewDept({ ...newDept, parentId: e.target.value })} style={inp} disabled={loading} required>
                        <option value="">-- Select dept --</option>
                        {topLevelDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" placeholder="Optional" value={newDept.description} onChange={e => setNewDept({ ...newDept, description: e.target.value })} style={inp} disabled={loading} />
                    )}
                  </div>
                  <button type="submit" className="btn-3d" disabled={loading} style={{ padding: '10px 20px', opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                    {loading ? '⏳' : '➕'} Add
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table */}
          <div className="page-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📋 Department & Unit List</h3>
              <span style={{ fontSize: '13px', color: '#888' }}>{departments.length} total</span>
            </div>
            {departments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>
                <div style={{ fontSize: '44px', marginBottom: '10px' }}>📂</div>
                <div>No departments found.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      {['Name','Type','Manager','S3 Bucket','Members','Projects','Status','Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '13px', color: '#555', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => {
                      const parentName = dept.parentId ? departments.find(d => d.id === dept.parentId)?.name : null;
                      return (
                        <tr key={dept.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {dept.type === 'unit' && <span style={{ color: '#9c27b0', fontSize: '11px' }}>↳</span>}
                              {dept.name}
                            </div>
                            {parentName && <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>under {parentName}</div>}
                            {dept.description && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{dept.description}</div>}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', backgroundColor: dept.type === 'unit' ? '#f3e5f5' : '#e3f2fd', color: dept.type === 'unit' ? '#7b1fa2' : '#1565c0' }}>
                              {dept.type === 'unit' ? '🔷 Unit' : '🏢 Dept'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '14px' }}>{dept.manager}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <code style={{ fontSize: '11px', backgroundColor: '#f5f5f5', padding: '3px 7px', borderRadius: '4px', color: '#666' }}>{dept.s3Bucket || '—'}</code>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span onClick={() => openMembers(dept)} style={{ cursor: 'pointer', fontWeight: '700', color: '#0066ff', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                              👥 {dept.members || 0}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>{dept.projects || 0}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span onClick={() => isAdmin && toggleStatus(dept)} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: isAdmin ? 'pointer' : 'default', backgroundColor: dept.status === 'Active' ? '#e7f7ef' : '#ffeaea', color: dept.status === 'Active' ? '#2e7d32' : '#c62828', userSelect: 'none' }}>
                              {dept.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(isAdmin || isDeptHead) && (
                                <button onClick={() => openEdit(dept)} disabled={loading} style={{ ...btn('#0066ff'), padding: '6px 12px', fontSize: '12px' }}>✏️ Edit</button>
                              )}
                              <button onClick={() => openMembers(dept)} disabled={loading} style={{ ...btn('#9c27b0'), padding: '6px 12px', fontSize: '12px' }}>👥 Members</button>
                              {isAdmin && (
                                <button onClick={() => handleDelete(dept.id)} disabled={loading} style={{ ...btn('#ef5350'), padding: '6px 12px', fontSize: '12px' }}>🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ marginTop: '28px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '10px' }}>
              <h3 style={{ marginBottom: '14px' }}>🚀 Quick Actions</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#4caf50' }} onClick={() => setShowAnalytics(true)}>📊 View Analytics</button>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#ff9800' }} onClick={generatePDFReport}>📋 Generate Report (PDF)</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ EDIT MODAL ══ */}
      {showEditModal && (
        <div style={backdrop} onClick={() => setShowEditModal(false)}>
          <div style={modalBox('540px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>✏️ Edit Department / Unit</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'Name *', key: 'name', type: 'text', placeholder: 'Department name' },
              { label: 'Manager *', key: 'manager', type: 'text', placeholder: 'Manager name' },
              { label: 'Description', key: 'description', type: 'text', placeholder: 'Optional' },
              { label: 'Projects', key: 'projects', type: 'number', placeholder: '0' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={editData[f.key] || ''} onChange={e => setEditData({ ...editData, [f.key]: e.target.value })} style={inp} />
              </div>
            ))}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Status</label>
              <select value={editData.status || 'Active'} onChange={e => setEditData({ ...editData, status: e.target.value })} style={inp}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            {editData.type === 'unit' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Parent Department</label>
                <select value={editData.parentId || ''} onChange={e => setEditData({ ...editData, parentId: e.target.value })} style={inp}>
                  <option value="">-- None --</option>
                  {topLevelDepts.filter(d => d.id !== editData.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowEditModal(false)} style={btn('#888')}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={loading} style={{ ...btn('#0066ff'), opacity: loading ? 0.6 : 1 }}>
                {loading ? '⏳ Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MEMBERS MODAL ══ */}
      {showMembersModal && selectedDept && (
        <div style={backdrop} onClick={() => setShowMembersModal(false)}>
          <div style={modalBox('660px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>👥 Members — {selectedDept.name}</h2>
              <button onClick={() => setShowMembersModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {savingMember && (
              <div style={{ backgroundColor: '#e3f2fd', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#1565c0' }}>⏳ Saving to database…</div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              {[
                { key: 'manual',  label: '✍️ Add Manually' },
                { key: 'cognito', label: '☁️ Pick from Users' },
                { key: 'list',    label: `📋 Current (${currentMembers.length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setMembersTab(tab.key)} style={{
                  flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                  backgroundColor: membersTab === tab.key ? '#0066ff' : 'white',
                  color: membersTab === tab.key ? 'white' : '#555',
                }}>{tab.label}</button>
              ))}
            </div>

            {/* Manual tab */}
            {membersTab === 'manual' && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Full Name *</label>
                  <input type="text" placeholder="e.g., Jean Dupont" value={manualMember.name} onChange={e => setManualMember(prev => ({ ...prev, name: e.target.value }))} style={inp} />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Email *</label>
                  <input type="email" placeholder="e.g., jean@company.com" value={manualMember.email} onChange={e => setManualMember(prev => ({ ...prev, email: e.target.value }))} style={inp} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Initial Role</label>
                  <select value={manualMember.role} onChange={e => setManualMember(prev => ({ ...prev, role: e.target.value }))} style={inp}>
                    <option value="MEMBER">👤 Member</option>
                    <option value="UNIT_HEAD">🔷 Unit Head</option>
                    {isAdmin && <option value="DEPT_HEAD">🏢 Dept Head</option>}
                  </select>
                </div>
                <button onClick={addManualMember} disabled={savingMember} style={{ ...btn('#0066ff'), width: '100%', opacity: savingMember ? 0.6 : 1 }}>
                  {savingMember ? '⏳ Saving…' : '➕ Add Member'}
                </button>
              </div>
            )}

            {/* Cognito tab */}
            {membersTab === 'cognito' && (
              <div>
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>⏳ Loading users…</div>
                ) : cognitoUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>☁️</div>
                    <div>No Cognito users found.</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {cognitoUsers.map(u => {
                      const already = !!currentMembers.find(m => m.email === u.email);
                      return (
                        <div key={u.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', marginBottom: '6px', backgroundColor: already ? '#f0f7ff' : '#fafafa', border: `1px solid ${already ? '#bbdefb' : '#eee'}` }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {u.name || u.email}
                              <RoleBadge role={u.role || 'MEMBER'} />
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                              {u.email}
                              {u.department && <span style={{ marginLeft: '6px', fontSize: '11px', backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: '10px' }}>📂 {u.department}</span>}
                            </div>
                          </div>
                          <button onClick={() => addCognitoMember(u)} disabled={already || savingMember}
                            style={{ ...btn(already ? '#aaa' : '#4caf50'), padding: '6px 14px', fontSize: '12px', cursor: (already || savingMember) ? 'default' : 'pointer' }}>
                            {already ? '✅ Added' : savingMember ? '⏳' : '➕ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Current members tab */}
            {membersTab === 'list' && (
              <div>
                {currentMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>👤</div>
                    <div>No members added yet.</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {currentMembers.map((m, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', marginBottom: '6px', backgroundColor: '#fafafa', border: '1px solid #eee' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.name}
                            <RoleBadge role={m.role || 'MEMBER'} />
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                            {m.email}
                            {m.source === 'cognito' && <span style={{ marginLeft: '6px', fontSize: '11px', backgroundColor: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: '10px' }}>Cognito</span>}
                            {m.source === 'manual'  && <span style={{ marginLeft: '6px', fontSize: '11px', backgroundColor: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: '10px' }}>Manual</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {canManage && (
                            <button onClick={() => openRoleModal(m)} style={{ ...btn('#0066ff'), padding: '5px 10px', fontSize: '12px' }}>
                              🔄 Role
                            </button>
                          )}
                          {canManage && (
                            <button onClick={() => removeMember(m.email)} disabled={savingMember} style={{ ...btn('#ef5350'), padding: '5px 10px', fontSize: '12px', opacity: savingMember ? 0.6 : 1 }}>
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setShowMembersModal(false)} style={btn('#0066ff')}>✅ Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ROLE PROPOSAL MODAL ══ */}
      {showRoleModal && roleTarget && (
        <div style={backdrop} onClick={() => setShowRoleModal(false)}>
          <div style={modalBox('480px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>🔄 Propose Role Change</h2>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>{roleTarget.name}</div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{roleTarget.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#555' }}>Current role:</span>
                <RoleBadge role={roleTarget.role || 'MEMBER'} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>New Role *</label>
              <select value={proposedRole} onChange={e => setProposedRole(e.target.value)} style={inp}>
                <option value="MEMBER">👤 Member</option>
                <option value="UNIT_HEAD">🔷 Unit Head</option>
                {isAdmin && <option value="DEPT_HEAD">🏢 Dept Head</option>}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Reason (recommended)</label>
              <textarea value={roleReason} onChange={e => setRoleReason(e.target.value)} placeholder="Why should this role change be approved?" rows={3} style={{ ...inp, resize: 'vertical' }} />
            </div>

            {roleMessage && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '500', backgroundColor: roleMessage.includes('✅') ? '#e8f5e9' : roleMessage.includes('⚠️') ? '#fff3e0' : '#ffeaea', color: roleMessage.includes('✅') ? '#2e7d32' : roleMessage.includes('⚠️') ? '#e65100' : '#c62828' }}>
                {roleMessage}
              </div>
            )}

            <div style={{ backgroundColor: '#fff3e0', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: '#e65100' }}>
              ⚠️ This request will be sent to <strong>SUPER_ADMIN</strong> for approval. The role will only change after approval.
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowRoleModal(false)} style={btn('#888')}>Cancel</button>
              <button onClick={handleProposeRole} disabled={proposingRole} style={{ ...btn('#0066ff'), opacity: proposingRole ? 0.6 : 1 }}>
                {proposingRole ? '⏳ Submitting…' : '📋 Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ANALYTICS MODAL ══ */}
      {showAnalytics && (
        <div style={backdrop} onClick={() => setShowAnalytics(false)}>
          <div style={modalBox('760px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700' }}>📊 Department Analytics</h2>
              <button onClick={() => setShowAnalytics(false)} style={{ ...btn('#ef5350'), padding: '6px 16px', fontSize: '13px' }}>✕ Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '28px' }}>
              {[
                { label: 'Active',      value: analyticsData.active,   color: '#4caf50', bg: '#e7f7ef' },
                { label: 'Inactive',    value: analyticsData.inactive, color: '#ef5350', bg: '#ffeaea' },
                { label: 'Departments', value: departments.filter(d=>!d.type||d.type==='department').length, color: '#0066ff', bg: '#e3f2fd' },
                { label: 'Units',       value: departments.filter(d=>d.type==='unit').length, color: '#9c27b0', bg: '#f3e5f5' },
              ].map((c, i) => (
                <div key={i} style={{ backgroundColor: c.bg, borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', textTransform: 'uppercase' }}>{c.label}</div>
                </div>
              ))}
            </div>
            {analyticsData.byMembers.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>👥 Members per Department</h3>
                {analyticsData.byMembers.map((d, i) => <Bar key={i} label={d.name} value={d.members} max={Math.max(...analyticsData.byMembers.map(x => x.members), 1)} color="#0066ff" />)}
              </div>
            )}
            {analyticsData.byProjects.filter(d => d.projects > 0).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>📋 Projects per Department</h3>
                {analyticsData.byProjects.map((d, i) => <Bar key={i} label={d.name} value={d.projects} max={Math.max(...analyticsData.byProjects.map(x => x.projects), 1)} color="#9c27b0" />)}
              </div>
            )}
            <div style={{ marginTop: '22px', textAlign: 'right' }}>
              <button onClick={generatePDFReport} style={{ ...btn('#ff9800'), marginRight: '10px' }}>📋 Generate PDF</button>
              <button onClick={() => setShowAnalytics(false)} style={btn('#0066ff')}>✅ Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentPage;