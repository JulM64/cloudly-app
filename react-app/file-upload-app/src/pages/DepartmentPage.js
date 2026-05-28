// src/pages/DepartmentPage.js - COMPLETE VERSION WITH ALL FEATURES
// Features:
//   ✅ Edit department modal
//   ✅ Members management (add manually OR pick from Cognito users)
//   ✅ View Analytics modal with charts
//   ✅ Generate Report as PDF download
//   ✅ Hierarchy support (department / unit)

import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';

// ─── Modal backdrop style ────────────────────────────────────────────────────
const backdrop = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
};

const modalBox = (width = '560px') => ({
  backgroundColor: 'white',
  borderRadius: '14px',
  padding: '32px',
  width: '90%',
  maxWidth: width,
  maxHeight: '85vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
});

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '7px',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const btnStyle = (color = '#0066ff') => ({
  padding: '10px 22px',
  backgroundColor: color,
  color: 'white',
  border: 'none',
  borderRadius: '7px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  transition: 'opacity 0.2s',
});

// ─── Simple bar component used in Analytics ──────────────────────────────────
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

// ─── Main component ──────────────────────────────────────────────────────────
const DepartmentPage = () => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Add form
  const [newDept, setNewDept] = useState({ name: '', manager: '', description: '', type: 'department', parentId: '' });

  // Edit modal
  const [showEditModal, setShowEditModal]   = useState(false);
  const [editData, setEditData]             = useState({});

  // Members modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedDept, setSelectedDept]         = useState(null);
  const [cognitoUsers, setCognitoUsers]          = useState([]);
  const [loadingUsers, setLoadingUsers]          = useState(false);
  const [membersTab, setMembersTab]              = useState('manual'); // 'manual' | 'cognito'
  const [manualMember, setManualMember]          = useState({ name: '', email: '', role: 'Member' });
  const [membersList, setMembersList]            = useState({}); // { deptId: [{name,email,role}] }

  // Analytics modal
  const [showAnalytics, setShowAnalytics] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const topLevelDepts = departments.filter(d => d.type === 'department' || !d.type);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDepartments();
      setDepartments(response.departments || []);
    } catch (err) {
      console.error('❌ Error loading departments:', err);
      alert('Failed to load departments: ' + err.message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => { loadDepartments(); }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalMembers   = departments.reduce((s, d) => s + ((membersList[d.id] || []).length + (d.members || 0)), 0);
  const activeDepts    = departments.filter(d => d.status === 'Active').length;

  const stats = [
    { label: 'Total Departments', value: departments.filter(d => !d.type || d.type === 'department').length, icon: '🏢', color: '#0066ff' },
    { label: 'Active',            value: activeDepts,   icon: '✅', color: '#4caf50' },
    { label: 'Units',             value: departments.filter(d => d.type === 'unit').length, icon: '🔷', color: '#9c27b0' },
    { label: 'Total Members',     value: totalMembers,  icon: '👥', color: '#ff9800' },
  ];

  // ── Add Department ─────────────────────────────────────────────────────────
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.name.trim() || !newDept.manager.trim()) {
      alert('Please enter name and manager.');
      return;
    }
    if (newDept.type === 'unit' && !newDept.parentId) {
      alert('Please select a parent department for this unit.');
      return;
    }
    try {
      setLoading(true);
      await apiService.createDepartment({
        name: newDept.name.trim(),
        manager: newDept.manager.trim(),
        description: newDept.description.trim(),
        type: newDept.type,
        parentId: newDept.parentId || null,
      });
      await loadDepartments();
      setNewDept({ name: '', manager: '', description: '', type: 'department', parentId: '' });
    } catch (err) {
      alert('Failed to create: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department/unit? This cannot be undone.')) return;
    try {
      setLoading(true);
      await apiService.deleteDepartment(id);
      await loadDepartments();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle Status ──────────────────────────────────────────────────────────
  const toggleStatus = async (dept) => {
    const newStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    try {
      setLoading(true);
      await apiService.updateDepartment(dept.id, { status: newStatus });
      await loadDepartments();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Open Edit Modal ────────────────────────────────────────────────────────
  const openEdit = (dept) => {
    setEditData({ ...dept });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editData.name?.trim() || !editData.manager?.trim()) {
      alert('Name and manager are required.');
      return;
    }
    try {
      setLoading(true);
      await apiService.updateDepartment(editData.id, {
        name:        editData.name.trim(),
        manager:     editData.manager.trim(),
        description: (editData.description || '').trim(),
        status:      editData.status,
        projects:    editData.projects || 0,
        type:        editData.type,
        parentId:    editData.parentId || null,
      });
      await loadDepartments();
      setShowEditModal(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Open Members Modal ─────────────────────────────────────────────────────
  const openMembers = async (dept) => {
    setSelectedDept(dept);
    setMembersTab('manual');
    setManualMember({ name: '', email: '', role: 'Member' });
    setShowMembersModal(true);

    // Try to load Cognito users (may fail if no endpoint yet — handled gracefully)
    setLoadingUsers(true);
    try {
      const res = await apiService.getUsers();          // see apiService additions below
      setCognitoUsers(res.users || []);
    } catch {
      setCognitoUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const membersOfDept = (id) => membersList[id] || [];

  const addManualMember = () => {
    if (!manualMember.name.trim() || !manualMember.email.trim()) {
      alert('Please enter name and email.');
      return;
    }
    const existing = membersOfDept(selectedDept.id);
    if (existing.find(m => m.email === manualMember.email)) {
      alert('This member is already added.');
      return;
    }
    setMembersList(prev => ({
      ...prev,
      [selectedDept.id]: [...existing, { ...manualMember, source: 'manual' }],
    }));
    setManualMember({ name: '', email: '', role: 'Member' });
  };

  const addCognitoMember = (user) => {
    const existing = membersOfDept(selectedDept.id);
    if (existing.find(m => m.email === user.email)) {
      alert('Already added.');
      return;
    }
    setMembersList(prev => ({
      ...prev,
      [selectedDept.id]: [...existing, { name: user.name || user.email, email: user.email, role: 'Member', source: 'cognito' }],
    }));
  };

  const removeMember = (deptId, email) => {
    setMembersList(prev => ({
      ...prev,
      [deptId]: (prev[deptId] || []).filter(m => m.email !== email),
    }));
  };

  // ── Analytics data ─────────────────────────────────────────────────────────
  const analyticsData = {
    active:   departments.filter(d => d.status === 'Active').length,
    inactive: departments.filter(d => d.status !== 'Active').length,
    byMembers: departments.map(d => ({ name: d.name, members: (membersList[d.id] || []).length + (d.members || 0) })),
    byProjects: departments.map(d => ({ name: d.name, projects: d.projects || 0 })),
  };

  // ── Generate PDF Report ────────────────────────────────────────────────────
  const generatePDFReport = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build HTML content for the PDF
    const deptRows = departments.map(d => {
      const mList = membersOfDept(d.id);
      const memberNames = mList.map(m => `${m.name} (${m.role})`).join(', ') || '—';
      return `
        <tr>
          <td>${d.name}</td>
          <td>${d.type || 'department'}</td>
          <td>${d.manager || '—'}</td>
          <td>${mList.length + (d.members || 0)}</td>
          <td>${d.projects || 0}</td>
          <td>
            <span style="
              padding: 3px 10px;
              border-radius: 12px;
              background: ${d.status === 'Active' ? '#e7f7ef' : '#ffeaea'};
              color: ${d.status === 'Active' ? '#2e7d32' : '#c62828'};
              font-size: 12px;
              font-weight: 600;
            ">${d.status || 'Active'}</span>
          </td>
          <td>${memberNames}</td>
          <td style="font-size:11px;color:#666;">${d.description || '—'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Cloudly – Department Report</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #222; background: #fff; padding: 40px; }
          header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #0066ff; padding-bottom: 20px; }
          header h1 { font-size: 28px; color: #0066ff; }
          header .meta { font-size: 13px; color: #555; text-align: right; }
          .summary { display: flex; gap: 20px; margin-bottom: 32px; }
          .card { flex: 1; background: #f0f7ff; border-radius: 10px; padding: 18px; text-align: center; }
          .card .num { font-size: 32px; font-weight: 800; color: #0066ff; }
          .card .lbl { font-size: 12px; color: #555; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
          th { background: #0066ff; color: white; padding: 10px 12px; text-align: left; font-weight: 600; }
          td { padding: 9px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
          tr:nth-child(even) td { background: #f9f9f9; }
          footer { margin-top: 40px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
          h2 { font-size: 18px; margin-bottom: 14px; color: #333; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>🏢 Cloudly – Department Report</h1>
            <p style="color:#555;margin-top:6px;font-size:14px;">Organizational Structure Management System</p>
          </div>
          <div class="meta">
            <div><strong>Date:</strong> ${date}</div>
            <div><strong>Total Records:</strong> ${departments.length}</div>
          </div>
        </header>

        <div class="summary">
          <div class="card"><div class="num">${departments.filter(d=>!d.type||d.type==='department').length}</div><div class="lbl">Departments</div></div>
          <div class="card"><div class="num">${departments.filter(d=>d.type==='unit').length}</div><div class="lbl">Units</div></div>
          <div class="card" style="background:#e7f7ef"><div class="num" style="color:#2e7d32">${analyticsData.active}</div><div class="lbl">Active</div></div>
          <div class="card" style="background:#ffeaea"><div class="num" style="color:#c62828">${analyticsData.inactive}</div><div class="lbl">Inactive</div></div>
          <div class="card" style="background:#fff3e0"><div class="num" style="color:#e65100">${departments.reduce((s,d)=>s+(membersList[d.id]||[]).length+(d.members||0),0)}</div><div class="lbl">Members</div></div>
        </div>

        <h2>📋 Department & Unit Details</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Type</th><th>Manager</th><th>Members</th><th>Projects</th><th>Status</th><th>Member List</th><th>Description</th>
            </tr>
          </thead>
          <tbody>${deptRows}</tbody>
        </table>

        <footer>Generated by Cloudly &nbsp;•&nbsp; ${date} &nbsp;•&nbsp; Confidential</footer>
      </body>
      </html>
    `;

    // Open print dialog in a new window = PDF save
    const win = window.open('', '_blank', 'width=1000,height=700');
    win.document.write(html);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
      // win.close(); // optionally close after print
    };
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>

      {/* ── Page header ── */}
      <h1 className="section-title" style={{ marginBottom: '6px' }}>🏢 Department Management</h1>
      <p className="page-description" style={{ marginBottom: '36px', color: '#666' }}>
        Create, manage, and organize departments and units within your organization
      </p>

      {/* ── Initial loading ── */}
      {initialLoad && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '22px', color: '#666' }}>⏳ Loading departments…</div>
        </div>
      )}

      {!initialLoad && (
        <>
          {/* ── Stats ── */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '28px' }}>
            {stats.map((s, i) => (
              <div key={i} className="hover-card" style={{
                padding: '22px', backgroundColor: 'white', borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)', borderTop: `4px solid ${s.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '30px', fontWeight: '800', color: '#222' }}>{s.value}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{s.label}</div>
                  </div>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    backgroundColor: `${s.color}18`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '22px',
                  }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Add Form ── */}
          <div className="page-card" style={{ marginBottom: '28px' }}>
            <h3 style={{ marginBottom: '18px' }}>➕ Add Department or Unit</h3>
            <form onSubmit={handleAddDepartment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 180px auto', gap: '14px', alignItems: 'end' }}>

                {/* Type */}
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>Type *</label>
                  <select
                    value={newDept.type}
                    onChange={e => setNewDept({ ...newDept, type: e.target.value, parentId: '' })}
                    style={inputStyle}
                    disabled={loading}
                  >
                    <option value="department">Department</option>
                    <option value="unit">Unit (child of dept.)</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., DIP"
                    value={newDept.name}
                    onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                    style={inputStyle}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Manager */}
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>Manager *</label>
                  <input
                    type="text"
                    placeholder="e.g., Jean Dupont"
                    value={newDept.manager}
                    onChange={e => setNewDept({ ...newDept, manager: e.target.value })}
                    style={inputStyle}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Parent (only for unit) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '7px', fontSize: '13px', color: '#555', fontWeight: '600' }}>
                    {newDept.type === 'unit' ? 'Parent Dept. *' : 'Description'}
                  </label>
                  {newDept.type === 'unit' ? (
                    <select
                      value={newDept.parentId}
                      onChange={e => setNewDept({ ...newDept, parentId: e.target.value })}
                      style={inputStyle}
                      disabled={loading}
                      required
                    >
                      <option value="">-- Select dept --</option>
                      {topLevelDepts.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Optional"
                      value={newDept.description}
                      onChange={e => setNewDept({ ...newDept, description: e.target.value })}
                      style={inputStyle}
                      disabled={loading}
                    />
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="btn-3d"
                  disabled={loading}
                  style={{ padding: '10px 20px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {loading ? '⏳' : '➕'} Add
                </button>
              </div>
            </form>
          </div>

          {/* ── Departments Table ── */}
          <div className="page-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📋 Department & Unit List</h3>
              <span style={{ fontSize: '13px', color: '#888' }}>{departments.length} total</span>
            </div>

            {departments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>
                <div style={{ fontSize: '44px', marginBottom: '10px' }}>📂</div>
                <div style={{ fontSize: '17px' }}>No departments yet — add one above</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      {['Name', 'Type', 'Manager', 'S3 Bucket', 'Members', 'Projects', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '2px solid #eee', fontSize: '13px', color: '#555', fontWeight: '700' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => {
                      const mCount = (membersList[dept.id] || []).length + (dept.members || 0);
                      const parentName = dept.parentId ? (departments.find(d => d.id === dept.parentId)?.name || '—') : null;
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
                            <span style={{
                              padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600',
                              backgroundColor: dept.type === 'unit' ? '#f3e5f5' : '#e3f2fd',
                              color: dept.type === 'unit' ? '#7b1fa2' : '#1565c0',
                            }}>
                              {dept.type === 'unit' ? '🔷 Unit' : '🏢 Dept'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '14px' }}>{dept.manager}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <code style={{ fontSize: '11px', backgroundColor: '#f5f5f5', padding: '3px 7px', borderRadius: '4px', color: '#666' }}>
                              {dept.s3Bucket || '—'}
                            </code>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              onClick={() => openMembers(dept)}
                              title="Manage members"
                              style={{
                                cursor: 'pointer',
                                fontWeight: '700',
                                color: '#0066ff',
                                textDecoration: 'underline',
                                textDecorationStyle: 'dotted',
                              }}
                            >
                              👥 {mCount}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>{dept.projects || 0}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              onClick={() => !loading && toggleStatus(dept)}
                              title="Click to toggle"
                              style={{
                                padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: loading ? 'default' : 'pointer',
                                backgroundColor: dept.status === 'Active' ? '#e7f7ef' : '#ffeaea',
                                color: dept.status === 'Active' ? '#2e7d32' : '#c62828',
                                userSelect: 'none',
                              }}
                            >
                              {dept.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {/* Edit */}
                              <button
                                onClick={() => openEdit(dept)}
                                disabled={loading}
                                style={{ ...btnStyle('#0066ff'), padding: '6px 12px', fontSize: '12px' }}
                              >✏️ Edit</button>
                              {/* Members */}
                              <button
                                onClick={() => openMembers(dept)}
                                disabled={loading}
                                style={{ ...btnStyle('#9c27b0'), padding: '6px 12px', fontSize: '12px' }}
                              >👥 Members</button>
                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(dept.id)}
                                disabled={loading}
                                style={{ ...btnStyle('#ef5350'), padding: '6px 12px', fontSize: '12px' }}
                              >🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div style={{ marginTop: '28px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '10px' }}>
              <h3 style={{ marginBottom: '14px', color: '#333' }}>🚀 Quick Actions</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#4caf50' }} onClick={() => setShowAnalytics(true)}>
                  📊 View Analytics
                </button>
                <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#ff9800' }} onClick={generatePDFReport}>
                  📋 Generate Report (PDF)
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          EDIT MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {showEditModal && (
        <div style={backdrop} onClick={() => setShowEditModal(false)}>
          <div style={modalBox('540px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>✏️ Edit Department / Unit</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            {[
              { label: 'Name *',       key: 'name',        type: 'text',     placeholder: 'Department name' },
              { label: 'Manager *',    key: 'manager',     type: 'text',     placeholder: 'Manager name'    },
              { label: 'Description',  key: 'description', type: 'text',     placeholder: 'Optional'        },
              { label: 'Projects',     key: 'projects',    type: 'number',   placeholder: '0'               },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={editData[f.key] || ''}
                  onChange={e => setEditData({ ...editData, [f.key]: e.target.value })}
                  style={inputStyle}
                />
              </div>
            ))}

            {/* Status */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Status</label>
              <select value={editData.status || 'Active'} onChange={e => setEditData({ ...editData, status: e.target.value })} style={inputStyle}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* If unit, allow changing parent */}
            {editData.type === 'unit' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Parent Department</label>
                <select value={editData.parentId || ''} onChange={e => setEditData({ ...editData, parentId: e.target.value })} style={inputStyle}>
                  <option value="">-- None --</option>
                  {topLevelDepts.filter(d => d.id !== editData.id).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button onClick={() => setShowEditModal(false)} style={{ ...btnStyle('#888') }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={loading} style={{ ...btnStyle('#0066ff'), opacity: loading ? 0.6 : 1 }}>
                {loading ? '⏳ Saving…' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MEMBERS MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {showMembersModal && selectedDept && (
        <div style={backdrop} onClick={() => setShowMembersModal(false)}>
          <div style={modalBox('620px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>👥 Members — {selectedDept.name}</h2>
              <button onClick={() => setShowMembersModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            {/* ── Tab selector ── */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              {[
                { key: 'manual',  label: '✍️ Add Manually'     },
                { key: 'cognito', label: '☁️ Pick from Users'   },
                { key: 'list',    label: `📋 Current (${membersOfDept(selectedDept.id).length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setMembersTab(tab.key)}
                  style={{
                    flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                    backgroundColor: membersTab === tab.key ? '#0066ff' : 'white',
                    color: membersTab === tab.key ? 'white' : '#555',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Manual tab ── */}
            {membersTab === 'manual' && (
              <div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Full Name *</label>
                  <input
                    type="text" placeholder="e.g., Jean Dupont"
                    value={manualMember.name}
                    onChange={e => setManualMember({ ...manualMember, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Email *</label>
                  <input
                    type="email" placeholder="e.g., jean@company.com"
                    value={manualMember.email}
                    onChange={e => setManualMember({ ...manualMember, email: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Role</label>
                  <select value={manualMember.role} onChange={e => setManualMember({ ...manualMember, role: e.target.value })} style={inputStyle}>
                    <option>Member</option>
                    <option>Head</option>
                    <option>Deputy</option>
                    <option>Coordinator</option>
                    <option>Observer</option>
                  </select>
                </div>
                <button onClick={addManualMember} style={{ ...btnStyle('#0066ff'), width: '100%' }}>
                  ➕ Add Member
                </button>
              </div>
            )}

            {/* ── Cognito users tab ── */}
            {membersTab === 'cognito' && (
              <div>
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>⏳ Loading users…</div>
                ) : cognitoUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>☁️</div>
                    <div style={{ marginBottom: '8px' }}>No Cognito users found.</div>
                    <div style={{ fontSize: '12px' }}>Make sure the <code>/api/users</code> endpoint is added to your backend (see instructions below).</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {cognitoUsers.map(u => {
                      const already = !!membersOfDept(selectedDept.id).find(m => m.email === u.email);
                      return (
                        <div key={u.email} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 14px', borderRadius: '8px', marginBottom: '6px',
                          backgroundColor: already ? '#f0f7ff' : '#fafafa',
                          border: `1px solid ${already ? '#bbdefb' : '#eee'}`,
                        }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{u.name || u.email}</div>
                            <div style={{ fontSize: '12px', color: '#888' }}>{u.email} · {u.groups?.join(', ') || 'User'}</div>
                          </div>
                          <button
                            onClick={() => addCognitoMember(u)}
                            disabled={already}
                            style={{ ...btnStyle(already ? '#aaa' : '#4caf50'), padding: '6px 14px', fontSize: '12px', cursor: already ? 'default' : 'pointer' }}
                          >
                            {already ? '✅ Added' : '➕ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Current members list tab ── */}
            {membersTab === 'list' && (
              <div>
                {membersOfDept(selectedDept.id).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>👤</div>
                    <div>No members added yet.</div>
                  </div>
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {membersOfDept(selectedDept.id).map((m, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '6px',
                        backgroundColor: '#fafafa', border: '1px solid #eee',
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px' }}>{m.name}</div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            {m.email} · <span style={{ color: '#0066ff' }}>{m.role}</span>
                            {m.source === 'cognito' && <span style={{ marginLeft: '6px', fontSize: '11px', backgroundColor: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: '10px' }}>Cognito</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => removeMember(selectedDept.id, m.email)}
                          style={{ ...btnStyle('#ef5350'), padding: '5px 12px', fontSize: '12px' }}
                        >🗑️ Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setShowMembersModal(false)} style={{ ...btnStyle('#0066ff') }}>✅ Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ANALYTICS MODAL
      ═════════════════════════════════════════════════════════════════════ */}
      {showAnalytics && (
        <div style={backdrop} onClick={() => setShowAnalytics(false)}>
          <div style={modalBox('760px')} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700' }}>📊 Department Analytics</h2>
              <button onClick={() => setShowAnalytics(false)} style={{ ...btnStyle('#ef5350'), padding: '6px 16px', fontSize: '13px' }}>✕ Close</button>
            </div>

            {/* Status summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '28px' }}>
              {[
                { label: 'Active',       value: analyticsData.active,                                                        color: '#4caf50', bg: '#e7f7ef' },
                { label: 'Inactive',     value: analyticsData.inactive,                                                       color: '#ef5350', bg: '#ffeaea' },
                { label: 'Departments',  value: departments.filter(d=>!d.type||d.type==='department').length,                  color: '#0066ff', bg: '#e3f2fd' },
                { label: 'Units',        value: departments.filter(d=>d.type==='unit').length,                                 color: '#9c27b0', bg: '#f3e5f5' },
              ].map((c, i) => (
                <div key={i} style={{ backgroundColor: c.bg, borderRadius: '10px', padding: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Members by department */}
            {analyticsData.byMembers.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#333' }}>👥 Members per Department / Unit</h3>
                {analyticsData.byMembers.map((d, i) => (
                  <Bar key={i} label={d.name} value={d.members} max={Math.max(...analyticsData.byMembers.map(x => x.members), 1)} color="#0066ff" />
                ))}
              </div>
            )}

            {/* Projects by department */}
            {analyticsData.byProjects.filter(d => d.projects > 0).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', color: '#333' }}>📋 Projects per Department / Unit</h3>
                {analyticsData.byProjects.map((d, i) => (
                  <Bar key={i} label={d.name} value={d.projects} max={Math.max(...analyticsData.byProjects.map(x => x.projects), 1)} color="#9c27b0" />
                ))}
              </div>
            )}

            {/* Visual status donut representation */}
            <div style={{ marginTop: '24px', padding: '18px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>📈 Status Overview</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {departments.length > 0 && (
                  <div style={{ flex: 1, height: '24px', borderRadius: '12px', overflow: 'hidden', display: 'flex' }}>
                    {analyticsData.active > 0 && (
                      <div style={{
                        width: `${(analyticsData.active / departments.length) * 100}%`,
                        backgroundColor: '#4caf50',
                        transition: 'width 0.6s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: '700',
                      }}>
                        {Math.round((analyticsData.active / departments.length) * 100)}%
                      </div>
                    )}
                    {analyticsData.inactive > 0 && (
                      <div style={{
                        flex: 1, backgroundColor: '#ef5350',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: '700',
                      }}>
                        {Math.round((analyticsData.inactive / departments.length) * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '18px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#4caf50' }} />
                  Active ({analyticsData.active})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef5350' }} />
                  Inactive ({analyticsData.inactive})
                </div>
              </div>
            </div>

            <div style={{ marginTop: '22px', textAlign: 'right' }}>
              <button onClick={generatePDFReport} style={{ ...btnStyle('#ff9800'), marginRight: '10px' }}>📋 Generate PDF Report</button>
              <button onClick={() => setShowAnalytics(false)} style={{ ...btnStyle('#0066ff') }}>✅ Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentPage;