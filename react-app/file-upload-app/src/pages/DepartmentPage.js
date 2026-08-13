// src/pages/DepartmentPage.js
// Visual layer rebuilt on the shared ui/ primitives + design tokens, and the
// top-level list restructured from a table into the card grid shown in the
// Departments reference screenshot. All state, handlers, and API calls are
// byte-for-byte the same as the original — only JSX/markup/styling changed.
import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';
import Avatar from '../components/Avatar';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import {
  IconBuilding, IconLayers, IconUsers, IconCheckCircle, IconPlus,
  IconEdit, IconTrash, IconClose, IconFolder, IconFileText, IconRefresh,
} from '../components/icons';

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', tone: 'brand' },
  DEPT_HEAD:   { label: 'Dept Head',   tone: 'info' },
  UNIT_HEAD:   { label: 'Unit Head',   tone: 'success' },
  MEMBER:      { label: 'Member',      tone: 'neutral' },
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.MEMBER;
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};

const backdrop = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalBox = (w = '560px') => ({ backgroundColor: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '28px', width: '100%', maxWidth: w, maxHeight: '85vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)' });

const Bar = ({ label, value, max }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-brand)', fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: 'var(--c-border)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--c-brand)', borderRadius: '4px' }} />
      </div>
    </div>
  );
};

// Manager autocomplete
const ManagerInput = ({ value, onChange, onSelect, cognitoUsers }) => {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const filtered = cognitoUsers.filter(u => !value.trim() || (u.name||'').toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input type="text" className="ui-input" placeholder="Type name or pick" value={value} onChange={e => { onChange(e.target.value); setShow(true); }} onFocus={() => setShow(true)} />
      {show && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, backgroundColor: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 999, maxHeight: '200px', overflowY: 'auto' }}>
          {filtered.map(u => (
            <div key={u.email} onClick={() => { onSelect(u); setShow(false); }} className="cl-manager-option">
              <Avatar name={u.name || u.email} email={u.email} size={32} />
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{u.name || u.email}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>{u.email} <RoleBadge role={u.role || 'MEMBER'} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TempPasswordBox = ({ password, email, onDone }) => (
  <div style={{ marginTop: '16px', backgroundColor: 'var(--c-success-bg)', border: '1px solid var(--c-success)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--fs-sm)', fontWeight: 700, color: '#166534', marginBottom: '10px' }}>
      <IconCheckCircle size={16} /> User created in Cognito
    </div>
    {email && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginBottom: '8px' }}>Account: <strong>{email}</strong></div>}
    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginBottom: '8px' }}>Temporary password:</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <code style={{ flex: 1, padding: '10px 14px', backgroundColor: 'var(--c-surface)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--fs-md)', fontWeight: 700, letterSpacing: '1px', color: 'var(--c-text)', border: '1px solid var(--c-border)' }}>{password}</code>
      <Button size="sm" onClick={() => { navigator.clipboard.writeText(password); }}>Copy</Button>
    </div>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', marginBottom: '10px' }}>Save this password and share it with the user.</div>
    <Button variant="success" onClick={onDone} style={{ width: '100%' }}>Done — password saved</Button>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const DepartmentPage = ({ user }) => {
  const [departments, setDepartments]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [initialLoad, setInitialLoad]   = useState(true);
  const [allCognitoUsers, setAllCognitoUsers] = useState([]);
  const [newDept, setNewDept]           = useState({ name: '', manager: '', managerEmail: '', description: '', type: 'department', parentId: '' });
  const [showAddForm, setShowAddForm]   = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData]           = useState({});

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedDept, setSelectedDept]         = useState(null);
  const [cognitoUsers, setCognitoUsers]         = useState([]);
  const [cognitoSearch, setCognitoSearch]       = useState('');
  const [loadingUsers, setLoadingUsers]         = useState(false);
  const [savingMember, setSavingMember]         = useState(false);
  const [membersTab, setMembersTab]             = useState('cognito');
  const [currentMembers, setCurrentMembers]     = useState([]);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleTarget, setRoleTarget]       = useState(null);
  const [proposedRole, setProposedRole]   = useState('MEMBER');
  const [roleReason, setRoleReason]       = useState('');
  const [proposingRole, setProposingRole] = useState(false);
  const [roleMessage, setRoleMessage]     = useState('');

  const [showCreateManager, setShowCreateManager] = useState(false);
  const [pendingDeptData, setPendingDeptData]     = useState(null);
  const [newManager, setNewManager]               = useState({ firstName: '', lastName: '', email: '' });
  const [createManagerMsg, setCreateManagerMsg]   = useState('');
  const [createManagerTempPass, setCreateManagerTempPass] = useState('');

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [resyncingId, setResyncingId] = useState(null);

  const handleResync = async (dept) => {
    try {
      setResyncingId(dept.id);
      const res = await apiService.resyncDepartmentMembers(dept.id);
      alert(res.message);
    } catch (err) {
      alert('Resync failed: ' + err.message);
    } finally {
      setResyncingId(null);
    }
  };

  const isAdmin    = user?.role === 'SUPER_ADMIN';
  const isDeptHead = user?.role === 'DEPT_HEAD';
  const isUnitHead = user?.role === 'UNIT_HEAD';
  const canManage  = isAdmin || isDeptHead || isUnitHead;
  const topLevelDepts = departments.filter(d => d.type === 'department' || !d.type);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const res = await apiService.getDepartments();
      setDepartments(res.departments || []);
    } catch (err) { alert('Failed to load departments: ' + err.message); }
    finally { setLoading(false); setInitialLoad(false); }
  };

  const loadAllUsers = async () => {
    if (!isAdmin) return;
    try { const r = await apiService.getUsers(); setAllCognitoUsers(r.users || []); } catch {}
  };

  useEffect(() => { loadDepartments(); loadAllUsers(); }, []);

  const totalMembers = departments.reduce((s, d) => s + (d.members || 0), 0);
  const activeDepts  = departments.filter(d => d.status === 'Active').length;

  const stats = [
    { label: 'Departments', value: departments.filter(d => !d.type || d.type === 'department').length, icon: <IconBuilding size={18} /> },
    { label: 'Active',      value: activeDepts, icon: <IconCheckCircle size={18} /> },
    { label: 'Units',       value: departments.filter(d => d.type === 'unit').length, icon: <IconLayers size={18} /> },
    { label: 'Members',     value: totalMembers, icon: <IconUsers size={18} /> },
  ];

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.name.trim() || !newDept.manager.trim()) { alert('Name and manager required.'); return; }
    if (newDept.type === 'unit' && !newDept.parentId) { alert('Select a parent department.'); return; }
    if (!newDept.managerEmail) {
      setPendingDeptData({ ...newDept });
      setNewManager({ firstName: newDept.manager.trim().split(' ')[0], lastName: newDept.manager.trim().split(' ').slice(1).join(' '), email: '' });
      setCreateManagerMsg(''); setCreateManagerTempPass('');
      setShowCreateManager(true);
      return;
    }
    await createDept(newDept.name, newDept.manager, newDept.managerEmail, newDept.description, newDept.type, newDept.parentId);
  };

  const createDept = async (name, manager, managerEmail, description, type, parentId) => {
    try {
      setLoading(true);
      await apiService.createDepartment({ name, manager, managerEmail: managerEmail || null, description, type, parentId: parentId || null });
      if (managerEmail) {
        try { await apiService.updateUserDepartment(managerEmail, name); } catch {}
        try {
          await apiService.proposeRoleChange({ targetEmail: managerEmail, targetName: manager, newRole: type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD', department: name, reason: `Auto-assigned as manager of ${name}` });
        } catch {}
      }
      await loadDepartments();
      setNewDept({ name: '', manager: '', managerEmail: '', description: '', type: 'department', parentId: '' });
      setShowAddForm(false);
    } catch (err) { alert('Failed to create: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleCreateManager = async () => {
    if (!newManager.firstName.trim()) { setCreateManagerMsg('First name required.'); return; }
    if (!newManager.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newManager.email)) { setCreateManagerMsg('Valid email required.'); return; }
    try {
      setLoading(true);
      const headRole = pendingDeptData?.type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD';
      const res = await apiService.createUser({
        firstName: newManager.firstName.trim(), lastName: newManager.lastName.trim(),
        email: newManager.email.trim().toLowerCase(), department: pendingDeptData?.name, role: headRole,
      });
      setCreateManagerTempPass(res.tempPassword);
      setCreateManagerMsg('User created.');
      await createDept(pendingDeptData.name, `${newManager.firstName} ${newManager.lastName}`.trim(), newManager.email.trim().toLowerCase(), pendingDeptData.description, pendingDeptData.type, pendingDeptData.parentId);
    } catch (err) { setCreateManagerMsg(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this?')) return;
    try { setLoading(true); await apiService.deleteDepartment(id); await loadDepartments(); }
    catch (err) { alert('Failed: ' + err.message); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (dept) => {
    try { setLoading(true); await apiService.updateDepartment(dept.id, { status: dept.status === 'Active' ? 'Inactive' : 'Active' }); await loadDepartments(); }
    catch (err) { alert('Failed: ' + err.message); }
    finally { setLoading(false); }
  };

  const openEdit = (dept) => { setEditData({ ...dept }); setShowEditModal(true); };
  const handleSaveEdit = async () => {
    if (!editData.name?.trim() || !editData.manager?.trim()) { alert('Name and manager required.'); return; }
    try {
      setLoading(true);
      await apiService.updateDepartment(editData.id, { name: editData.name.trim(), manager: editData.manager.trim(), description: (editData.description||'').trim(), status: editData.status, projects: editData.projects||0, type: editData.type, parentId: editData.parentId||null });
      await loadDepartments(); setShowEditModal(false);
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setLoading(false); }
  };

  const openMembers = async (dept) => {
    setSelectedDept(dept);
    setMembersTab('cognito');
    setCognitoSearch('');
    setCurrentMembers(Array.isArray(dept.membersList) ? dept.membersList : []);
    setShowMembersModal(true);
    setLoadingUsers(true);
    try {
      const res = await apiService.getUsers();
      const allUsers = res.users || [];
      setCognitoUsers(allUsers);
      const existing = Array.isArray(dept.membersList) ? [...dept.membersList] : [];
      const existingEmails = new Set(existing.map(m => m.email));
      const deptLower = (dept.name||'').toLowerCase().trim();
      const autoAdd = allUsers.filter(u => (u.department||'').toLowerCase().trim() === deptLower && !existingEmails.has(u.email));
      if (autoAdd.length > 0) {
        const merged = [...existing, ...autoAdd.map(u => ({ name: u.name||u.email, email: u.email, role: u.role||'MEMBER', source: 'cognito' }))];
        await apiService.updateDepartment(dept.id, { membersList: merged, members: merged.length });
        setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, membersList: merged, members: merged.length } : d));
        setCurrentMembers(merged);
      }
    } catch { setCognitoUsers([]); }
    finally { setLoadingUsers(false); }
  };

  const persistMembers = async (deptId, updated) => {
    await apiService.updateDepartment(deptId, { membersList: updated, members: updated.length });
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, membersList: updated, members: updated.length } : d));
    setCurrentMembers(updated);
  };

  const addCognitoMember = async (u) => {
    if (currentMembers.find(m => m.email === u.email)) { alert('Already added.'); return; }
    try {
      setSavingMember(true);
      await persistMembers(selectedDept.id, [...currentMembers, { name: u.name||u.email, email: u.email, role: u.role||'MEMBER', source: 'cognito' }]);
      try { await apiService.updateUserDepartment(u.email, selectedDept.name); } catch {}
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSavingMember(false); }
  };

  const removeMember = async (email) => {
    try {
      setSavingMember(true);
      const updated = currentMembers.filter(m => m.email !== email);
      await persistMembers(selectedDept.id, updated);
      const removed = currentMembers.find(m => m.email === email);
      if (removed?.source === 'cognito') { try { await apiService.updateUserDepartment(email, ''); } catch {} }
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSavingMember(false); }
  };

  const openRoleModal = (member) => { setRoleTarget(member); setProposedRole(member.role||'MEMBER'); setRoleReason(''); setRoleMessage(''); setShowRoleModal(true); };

  const handleProposeRole = async () => {
    if (!roleTarget || proposedRole === (roleTarget.role||'MEMBER')) { setRoleMessage('Same role — no change needed.'); return; }
    try {
      setProposingRole(true);
      const res = await apiService.proposeRoleChange({
        targetEmail: roleTarget.email, targetName: roleTarget.name,
        newRole: proposedRole, department: selectedDept?.name, reason: roleReason
      });
      if (res.autoApproved) {
        setRoleMessage('Role changed. Updating…');
        setShowRoleModal(false);
        setShowMembersModal(false);

        setDepartments(prev => prev.map(d => {
          const ml = Array.isArray(d.membersList) ? d.membersList : [];
          const isTargetDept = (d.name||'').toLowerCase() === (selectedDept?.name||'').toLowerCase();
          if (!isTargetDept) {
            const hasMember = ml.some(m => m.email === roleTarget.email);
            if (!hasMember) return d;
            const cleaned = ml.filter(m => m.email !== roleTarget.email);
            const wasManager = d.managerEmail === roleTarget.email ||
              (d.manager||'').toLowerCase() === (roleTarget.name||'').toLowerCase();
            return { ...d, membersList: cleaned, members: cleaned.length, ...(wasManager ? { manager: 'Not assigned', managerEmail: null } : {}) };
          }
          const updatedMl = ml.map(m => m.email === roleTarget.email ? { ...m, role: proposedRole } : m);
          const requiredRole = d.type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD';
          const becomingManager = proposedRole === requiredRole;
          return {
            ...d,
            membersList: updatedMl,
            ...(becomingManager ? { manager: roleTarget.name, managerEmail: roleTarget.email } : {})
          };
        }));

        setTimeout(() => window.location.reload(), 3000);
      } else {
        setRoleMessage('Request submitted. Awaiting SUPER_ADMIN approval.');
        setTimeout(() => { setShowRoleModal(false); setRoleMessage(''); }, 2500);
      }
    } catch (err) { setRoleMessage(err.message); }
    finally { setProposingRole(false); }
  };

  const analyticsData = {
    active:     departments.filter(d => d.status === 'Active').length,
    inactive:   departments.filter(d => d.status !== 'Active').length,
    byMembers:  departments.map(d => ({ name: d.name, members: d.members||0 })),
    byProjects: departments.map(d => ({ name: d.name, projects: d.projects||0 })),
  };

  const generatePDFReport = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const rows = departments.map(d => {
      const ml = Array.isArray(d.membersList) ? d.membersList : [];
      return `<tr><td>${d.name}</td><td>${d.type||'department'}</td><td>${d.manager||'—'}</td><td>${d.members||0}</td><td>${d.projects||0}</td>
        <td><span style="padding:3px 10px;border-radius:12px;background:${d.status==='Active'?'#dcfce7':'#fee2e2'};color:${d.status==='Active'?'#166534':'#991b1b'}">${d.status||'Active'}</span></td>
        <td>${ml.map(m=>`${m.name}(${m.role})`).join(', ')||'—'}</td></tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cloudly Report</title>
    <style>body{font-family:Inter,sans-serif;padding:40px}h1{color:#2563eb}
    table{width:100%;border-collapse:collapse;font-size:13px}th{background:#2563eb;color:#fff;padding:10px}
    td{padding:9px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f9f9f9}</style></head>
    <body><h1>Cloudly — Department Report</h1><p>${date}</p>
    <table><thead><tr><th>Name</th><th>Type</th><th>Manager</th><th>Members</th><th>Projects</th><th>Status</th><th>Members List</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
    const win = window.open('','_blank','width=1000,height=700');
    win.document.write(html); win.document.close(); win.onload = () => { win.focus(); win.print(); };
  };

  if (initialLoad) return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>Loading…</div>;

  return (
    <div>
      <PageHeader
        title="Department Management"
        subtitle={isAdmin ? 'Full control — manage all departments and units' : isDeptHead ? `Your department: ${user?.department}` : `Your unit: ${user?.department}`}
        action={isAdmin && (
          <Button icon={<IconPlus size={16} />} onClick={() => setShowAddForm((s) => !s)}>
            {showAddForm ? 'Cancel' : 'Add department'}
          </Button>
        )}
      />

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {stats.map((s, i) => (
          <Card key={i} className="ui-stat-card">
            <div className="ui-stat-top"><span className="ui-stat-label">{s.label}</span><span className="ui-stat-icon">{s.icon}</span></div>
            <div className="ui-stat-value">{s.value}</div>
          </Card>
        ))}
      </div>

      {isAdmin && showAddForm && (
        <Card style={{ marginBottom: '24px' }}>
          <h3 className="cl-settings-heading">Add department or unit</h3>
          <form onSubmit={handleAddDepartment}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: '16px', marginBottom: '8px' }}>
              <div className="ui-field">
                <label className="ui-label">Type</label>
                <select className="ui-select" value={newDept.type} onChange={e => setNewDept({ ...newDept, type: e.target.value, parentId: '' })} disabled={loading}>
                  <option value="department">Dept</option><option value="unit">Unit</option>
                </select>
              </div>
              <div className="ui-field">
                <label className="ui-label">Name</label>
                <input type="text" className="ui-input" placeholder="e.g., DIP" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} required />
              </div>
              <div className="ui-field">
                <label className="ui-label">Manager {newDept.managerEmail && <span style={{ color: 'var(--c-success)', fontWeight: 400 }}>(Cognito)</span>}</label>
                <ManagerInput value={newDept.manager} onChange={v => setNewDept({ ...newDept, manager: v, managerEmail: '' })}
                  onSelect={u => setNewDept({ ...newDept, manager: u.name||u.email, managerEmail: u.email })}
                  cognitoUsers={allCognitoUsers} />
              </div>
              <div className="ui-field">
                <label className="ui-label">{newDept.type === 'unit' ? 'Parent dept.' : 'Description'}</label>
                {newDept.type === 'unit' ? (
                  <select className="ui-select" value={newDept.parentId} onChange={e => setNewDept({ ...newDept, parentId: e.target.value })} required>
                    <option value="">-- Select --</option>
                    {topLevelDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                ) : (
                  <input type="text" className="ui-input" placeholder="Optional" value={newDept.description} onChange={e => setNewDept({ ...newDept, description: e.target.value })} />
                )}
              </div>
            </div>
            {newDept.managerEmail && (
              <div className="ui-banner ui-banner--success" style={{ marginBottom: '16px' }}>
                <strong>{newDept.manager}</strong>&nbsp;will be auto-assigned as {newDept.type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD'}
              </div>
            )}
            <Button type="submit" disabled={loading} loading={loading}>Add {newDept.type === 'unit' ? 'unit' : 'department'}</Button>
          </form>
        </Card>
      )}

      {departments.length === 0 ? (
        <Card>
          <EmptyState icon={<IconFolder size={28} />} title="No departments found" description="Create your first department to get started." />
        </Card>
      ) : (
        <div className="cl-dept-grid">
          {departments.map(dept => {
            const parentName = dept.parentId ? departments.find(d => d.id === dept.parentId)?.name : null;
            return (
              <Card key={dept.id} className="cl-dept-card">
                <div className="cl-dept-card-top">
                  <div className="cl-dept-card-icon">{dept.type === 'unit' ? <IconLayers size={18} /> : <IconBuilding size={18} />}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cl-dept-name">{dept.name}</div>
                    {parentName && <div className="cl-dept-parent">under {parentName}</div>}
                  </div>
                  <Badge tone={dept.status === 'Active' ? 'success' : 'danger'} className="cl-dept-status" onClick={() => isAdmin && toggleStatus(dept)}>
                    {dept.status || 'Active'}
                  </Badge>
                </div>

                {dept.description && <div className="cl-dept-desc">{dept.description}</div>}

                <div className="cl-dept-stats">
                  <div>
                    <div className="cl-dept-stat-label">Members</div>
                    <div className="cl-dept-stat-value cl-dept-link" onClick={() => openMembers(dept)}>{dept.members || 0}</div>
                  </div>
                  <div>
                    <div className="cl-dept-stat-label">Storage used</div>
                    <div className="cl-dept-stat-value">{dept.storageUsed ? formatBytes(dept.storageUsed) : '—'}</div>
                  </div>
                  <div>
                    <div className="cl-dept-stat-label">Projects</div>
                    <div className="cl-dept-stat-value">{dept.projects || 0}</div>
                  </div>
                </div>

                <div className="cl-dept-manager">
                  <span className="cl-dept-manager-label">Manager</span>
                  {dept.manager === 'Not assigned' ? (
                    <span style={{ color: 'var(--c-danger)', fontSize: 'var(--fs-sm)', fontStyle: 'italic' }}>Not assigned</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar name={dept.manager} email={dept.managerEmail} size={26} />
                      <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{dept.manager}</span>
                    </div>
                  )}
                </div>

                <div className="cl-dept-actions">
                  {(isAdmin || isDeptHead) && <Button variant="secondary" size="sm" icon={<IconEdit size={14} />} onClick={() => openEdit(dept)} disabled={loading}>Edit</Button>}
                  <Button variant="secondary" size="sm" icon={<IconUsers size={14} />} onClick={() => openMembers(dept)} disabled={loading}>Members</Button>
                  <Button variant="secondary" size="sm" icon={<IconRefresh size={14} />} loading={resyncingId === dept.id} onClick={() => handleResync(dept)}>Resync</Button>
                  {isAdmin && <Button variant="danger" size="sm" icon={<IconTrash size={14} />} onClick={() => handleDelete(dept.id)} disabled={loading} />}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card style={{ marginTop: '24px' }}>
        <h3 className="cl-settings-heading">Quick actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon={<IconLayers size={16} />} onClick={() => setShowAnalytics(true)}>View analytics</Button>
          <Button variant="secondary" icon={<IconFileText size={16} />} onClick={generatePDFReport}>Generate report (PDF)</Button>
        </div>
      </Card>

      {/* ══ EDIT MODAL ══ */}
      {showEditModal && (
        <div style={backdrop} onClick={() => setShowEditModal(false)}>
          <div style={modalBox('520px')} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">Edit department / unit</h2>
              <button onClick={() => setShowEditModal(false)} className="cl-modal-close"><IconClose size={18} /></button>
            </div>
            {[['Name','name','text'],['Manager','manager','text'],['Description','description','text'],['Projects','projects','number']].map(([label,key,type]) => (
              <div key={key} className="ui-field">
                <label className="ui-label">{label}</label>
                <input type={type} className="ui-input" value={editData[key]||''} onChange={e => setEditData({...editData,[key]:e.target.value})} />
              </div>
            ))}
            <div className="ui-field">
              <label className="ui-label">Status</label>
              <select className="ui-select" value={editData.status||'Active'} onChange={e => setEditData({...editData,status:e.target.value})}>
                <option value="Active">Active</option><option value="Inactive">Inactive</option>
              </select>
            </div>
            {editData.type === 'unit' && (
              <div className="ui-field">
                <label className="ui-label">Parent department</label>
                <select className="ui-select" value={editData.parentId||''} onChange={e => setEditData({...editData,parentId:e.target.value})}>
                  <option value="">-- None --</option>
                  {topLevelDepts.filter(d => d.id !== editData.id).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} loading={loading}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MEMBERS MODAL ══ */}
      {showMembersModal && selectedDept && (
        <div style={backdrop} onClick={() => setShowMembersModal(false)}>
          <div style={modalBox('620px')} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">Members — {selectedDept.name}</h2>
              <button onClick={() => setShowMembersModal(false)} className="cl-modal-close"><IconClose size={18} /></button>
            </div>
            {(savingMember || loadingUsers) && (
              <div className="ui-banner ui-banner--info" style={{ marginBottom: '14px' }}>
                {loadingUsers ? 'Syncing from Cognito…' : 'Saving…'}
              </div>
            )}
            <div style={{ display: 'flex', border: '1px solid var(--c-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '18px' }}>
              {[{ key: 'cognito', label: 'Pick from users' }, { key: 'list', label: `Current (${currentMembers.length})` }].map(tab => (
                <button key={tab.key} type="button" onClick={() => setMembersTab(tab.key)}
                  className={`cl-segment ${membersTab === tab.key ? 'cl-segment--active' : ''}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {membersTab === 'cognito' && (
              <div>
                {!loadingUsers && cognitoUsers.length > 0 && (
                  <input type="text" className="ui-input" placeholder="Search by name…" value={cognitoSearch} onChange={e => setCognitoSearch(e.target.value)} style={{ marginBottom: '14px' }} />
                )}
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: 'var(--c-text-muted)' }}>Loading users…</div>
                ) : cognitoUsers.length === 0 ? (
                  <EmptyState icon={<IconUsers size={26} />} title="No Cognito users found" />
                ) : (
                  <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    {cognitoUsers.filter(u => !cognitoSearch.trim() || (u.name||'').toLowerCase().includes(cognitoSearch.toLowerCase())).map(u => {
                      const already = !!currentMembers.find(m => m.email === u.email);
                      return (
                        <div key={u.email} className={`cl-member-row ${already ? 'cl-member-row--added' : ''}`}>
                          <Avatar name={u.name || u.email} email={u.email} size={34} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>{u.name||u.email} <RoleBadge role={u.role||'MEMBER'} /></div>
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>{u.email}{u.department && <Badge tone="success" className="cl-inline-badge">{u.department}</Badge>}</div>
                          </div>
                          <Button size="sm" variant={already ? 'secondary' : 'success'} disabled={already||savingMember} onClick={() => addCognitoMember(u)}>
                            {already ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {membersTab === 'list' && (
              <div>
                {currentMembers.length === 0 ? (
                  <EmptyState icon={<IconUsers size={26} />} title="No members yet" />
                ) : (
                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {currentMembers.map((m, i) => (
                      <div key={i} className="cl-member-row">
                        <Avatar name={m.name} email={m.email} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>{m.name} <RoleBadge role={m.role||'MEMBER'} /></div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>{m.email} <Badge tone={m.source==='cognito' ? 'info' : 'neutral'} className="cl-inline-badge">{m.source==='cognito'?'Cognito':'Manual'}</Badge></div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {canManage && <Button size="sm" variant="secondary" onClick={() => openRoleModal(m)}>Role</Button>}
                          {canManage && <Button size="sm" variant="danger" icon={<IconTrash size={13} />} disabled={savingMember} onClick={() => removeMember(m.email)} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ marginTop: '18px', textAlign: 'right' }}>
              <Button onClick={() => setShowMembersModal(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ROLE MODAL ══ */}
      {showRoleModal && roleTarget && (
        <div style={backdrop} onClick={() => setShowRoleModal(false)}>
          <div style={modalBox('460px')} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">Change role</h2>
              <button onClick={() => setShowRoleModal(false)} className="cl-modal-close"><IconClose size={18} /></button>
            </div>
            <div style={{ backgroundColor: 'var(--c-bg)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '18px' }}>
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{roleTarget.name}</div>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginBottom: '8px' }}>{roleTarget.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: 'var(--fs-sm)' }}>Current:</span><RoleBadge role={roleTarget.role||'MEMBER'} />
              </div>
            </div>
            <div className="ui-field">
              <label className="ui-label">New role</label>
              <select className="ui-select" value={proposedRole} onChange={e => setProposedRole(e.target.value)}>
                <option value="MEMBER">Member</option>
                <option value="UNIT_HEAD">Unit Head</option>
                {isAdmin && <option value="DEPT_HEAD">Dept Head</option>}
              </select>
            </div>
            <div className="ui-field">
              <label className="ui-label">Reason</label>
              <textarea className="ui-textarea" value={roleReason} onChange={e => setRoleReason(e.target.value)} rows={3} placeholder="Why this role change?" />
            </div>
            {roleMessage && <div className="ui-banner ui-banner--info" style={{ marginBottom: '14px' }}>{roleMessage}</div>}
            {isAdmin ? (
              <div className="ui-banner ui-banner--success" style={{ marginBottom: '16px' }}>As SUPER_ADMIN, applied immediately. Page reloads automatically.</div>
            ) : (
              <div className="ui-banner ui-banner--warning" style={{ marginBottom: '16px' }}>Needs SUPER_ADMIN approval.</div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancel</Button>
              <Button onClick={handleProposeRole} loading={proposingRole}>Submit</Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CREATE MANAGER MODAL ══ */}
      {showCreateManager && (
        <div style={backdrop} onClick={() => !createManagerTempPass && setShowCreateManager(false)}>
          <div style={modalBox('480px')} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">Create manager in Cognito</h2>
              {!createManagerTempPass && <button onClick={() => setShowCreateManager(false)} className="cl-modal-close"><IconClose size={18} /></button>}
            </div>
            {!createManagerTempPass ? (
              <>
                <div className="ui-banner ui-banner--info" style={{ marginBottom: '18px' }}>
                  Creating manager for <strong>{pendingDeptData?.name}</strong> — assigned as {pendingDeptData?.type === 'unit' ? 'UNIT_HEAD' : 'DEPT_HEAD'}.
                </div>
                {[['First name','firstName','text'],['Last name','lastName','text'],['Email','email','email']].map(([label,key,type]) => (
                  <div key={key} className="ui-field">
                    <label className="ui-label">{label}</label>
                    <input type={type} className="ui-input" value={newManager[key]} onChange={e => setNewManager(p => ({ ...p, [key]: e.target.value }))} placeholder={key === 'firstName' ? 'e.g., Jean' : key === 'lastName' ? 'e.g., Dupont' : 'e.g., jean@company.com'} />
                  </div>
                ))}
                {createManagerMsg && !createManagerMsg.includes('created') && (
                  <div className="ui-banner ui-banner--danger" style={{ marginBottom: '14px' }}>{createManagerMsg}</div>
                )}
                <div className="ui-banner ui-banner--warning" style={{ marginBottom: '18px' }}>A temporary password will be auto-generated.</div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" onClick={() => setShowCreateManager(false)}>Cancel</Button>
                  <Button onClick={handleCreateManager} loading={loading}>Create & save</Button>
                </div>
              </>
            ) : (
              <TempPasswordBox password={createManagerTempPass} email={newManager.email}
                onDone={() => { setShowCreateManager(false); setCreateManagerMsg(''); setCreateManagerTempPass(''); setPendingDeptData(null); }} />
            )}
          </div>
        </div>
      )}

      {/* ══ ANALYTICS MODAL ══ */}
      {showAnalytics && (
        <div style={backdrop} onClick={() => setShowAnalytics(false)}>
          <div style={modalBox('720px')} onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2 className="cl-modal-title">Department analytics</h2>
              <button onClick={() => setShowAnalytics(false)} className="cl-modal-close"><IconClose size={18} /></button>
            </div>
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              {[
                { label: 'Active', value: analyticsData.active, tone: 'success' },
                { label: 'Inactive', value: analyticsData.inactive, tone: 'danger' },
                { label: 'Departments', value: departments.filter(d=>!d.type||d.type==='department').length, tone: 'info' },
                { label: 'Units', value: departments.filter(d=>d.type==='unit').length, tone: 'brand' },
              ].map((c, i) => (
                <div key={i} className={`ui-badge ui-badge--${c.tone} cl-analytics-tile`}>
                  <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800 }}>{c.value}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.label}</div>
                </div>
              ))}
            </div>
            {analyticsData.byMembers.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: '14px' }}>Members per department</h3>
                {analyticsData.byMembers.map((d, i) => <Bar key={i} label={d.name} value={d.members} max={Math.max(...analyticsData.byMembers.map(x=>x.members),1)} />)}
              </div>
            )}
            {analyticsData.byProjects.filter(d=>d.projects>0).length > 0 && (
              <div>
                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, marginBottom: '14px' }}>Projects per department</h3>
                {analyticsData.byProjects.map((d, i) => <Bar key={i} label={d.name} value={d.projects} max={Math.max(...analyticsData.byProjects.map(x=>x.projects),1)} />)}
              </div>
            )}
            <div style={{ marginTop: '22px', textAlign: 'right', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={generatePDFReport}>PDF</Button>
              <Button onClick={() => setShowAnalytics(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cl-settings-heading { margin: 0 0 18px; font-size: var(--fs-lg); font-weight: 600; color: var(--c-text); }
        .cl-dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .cl-dept-card { display: flex; flex-direction: column; }
        .cl-dept-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
        .cl-dept-card-icon { width: 34px; height: 34px; border-radius: var(--radius-sm); background: var(--c-brand-tint); color: var(--c-brand); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cl-dept-name { font-weight: 700; font-size: var(--fs-md); color: var(--c-text); }
        .cl-dept-parent { font-size: var(--fs-xs); color: var(--c-text-faint); margin-top: 2px; }
        .cl-dept-status { cursor: pointer; flex-shrink: 0; }
        .cl-dept-desc { font-size: var(--fs-sm); color: var(--c-text-muted); margin-bottom: 14px; }
        .cl-dept-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px 0; border-top: 1px solid var(--c-border); border-bottom: 1px solid var(--c-border); margin-bottom: 14px; }
        .cl-dept-stat-label { font-size: 11px; color: var(--c-text-faint); text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
        .cl-dept-stat-value { font-size: var(--fs-md); font-weight: 700; color: var(--c-text); }
        .cl-dept-link { cursor: pointer; color: var(--c-brand); }
        .cl-dept-manager { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .cl-dept-manager-label { font-size: var(--fs-xs); color: var(--c-text-faint); }
        .cl-dept-actions { display: flex; gap: 8px; margin-top: auto; }
        .cl-manager-option { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid var(--c-border); display: flex; align-items: center; gap: 10px; }
        .cl-manager-option:hover { background: var(--c-bg); }
        .cl-modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .cl-modal-title { font-size: var(--fs-lg); font-weight: 700; color: var(--c-text); margin: 0; }
        .cl-modal-close { background: none; border: none; cursor: pointer; color: var(--c-text-muted); display: flex; }
        .cl-segment { flex: 1; padding: 10px; border: none; cursor: pointer; font-size: var(--fs-sm); font-weight: 600; background: var(--c-surface); color: var(--c-text-secondary); }
        .cl-segment--active { background: var(--c-brand); color: #fff; }
        .cl-member-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 6px; background: var(--c-bg); }
        .cl-member-row--added { background: var(--c-brand-tint); }
        .cl-inline-badge { margin-left: 6px; padding: 1px 7px; font-size: 10px; }
        .cl-analytics-tile { flex-direction: column; align-items: flex-start; padding: 16px; border-radius: var(--radius-md); gap: 4px; }
      `}</style>
    </div>
  );
};

export default DepartmentPage;