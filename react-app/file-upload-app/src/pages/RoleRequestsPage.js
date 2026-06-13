// src/pages/RoleRequestsPage.js
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
    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = {
    PENDING:  { color: '#ff9800', bg: '#fff3e0', label: '⏳ Pending'  },
    APPROVED: { color: '#4caf50', bg: '#e8f5e9', label: '✅ Approved' },
    REJECTED: { color: '#ef5350', bg: '#ffeaea', label: '❌ Rejected' },
  }[status] || { color: '#888', bg: '#f5f5f5', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700', backgroundColor: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

const RoleRequestsPage = ({ user }) => {
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus]   = useState('PENDING');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [message, setMessage]         = useState('');

  const isAdmin = user?.role === 'SUPER_ADMIN';

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await apiService.getRoleRequests();
      setRequests(res.requests || []);
    } catch (err) {
      setMessage('❌ Failed to load requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleApprove = async (requestId) => {
    if (!window.confirm('Approve this role change?')) return;
    try {
      setActionLoading(requestId);
      await apiService.approveRoleRequest(requestId);
      setMessage('✅ Role change approved and applied!');
      await loadRequests();
    } catch (err) {
      setMessage('❌ Failed to approve: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      setActionLoading(rejectModal.requestId);
      await apiService.rejectRoleRequest(rejectModal.requestId, rejectReason);
      setMessage('✅ Role change request rejected.');
      setRejectModal(null);
      setRejectReason('');
      await loadRequests();
    } catch (err) {
      setMessage('❌ Failed to reject: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = requests.filter(r => filterStatus === 'ALL' || r.status === filterStatus);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  const inp = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' };
  const btn = (color = '#0066ff') => ({ padding: '8px 18px', backgroundColor: color, color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ marginBottom: '6px' }}>🔐 Role Change Requests</h1>
      <p className="page-description" style={{ marginBottom: '28px', color: '#666' }}>
        {isAdmin ? 'Review and approve role change proposals from department heads' : 'Track role change proposals you have submitted'}
      </p>

      {message && (
        <div style={{ padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: '500', backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffeaea', color: message.includes('✅') ? '#2e7d32' : '#c62828' }}>
          {message}
          <button onClick={() => setMessage('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Pending',  value: requests.filter(r=>r.status==='PENDING').length,  color: '#ff9800', bg: '#fff3e0', icon: '⏳' },
          { label: 'Approved', value: requests.filter(r=>r.status==='APPROVED').length, color: '#4caf50', bg: '#e8f5e9', icon: '✅' },
          { label: 'Rejected', value: requests.filter(r=>r.status==='REJECTED').length, color: '#ef5350', bg: '#ffeaea', icon: '❌' },
        ].map((s, i) => (
          <div key={i} onClick={() => setFilterStatus(s.label.toUpperCase())}
            style={{ padding: '20px', backgroundColor: s.bg, borderRadius: '12px', cursor: 'pointer', border: `2px solid ${filterStatus === s.label.toUpperCase() ? s.color : 'transparent'}`, transition: 'all 0.2s' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="page-card">
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          {['ALL','PENDING','APPROVED','REJECTED'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} style={{
              flex: 1, padding: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
              backgroundColor: filterStatus === f ? '#0066ff' : 'white',
              color: filterStatus === f ? 'white' : '#555',
            }}>
              {f === 'ALL' ? `All (${requests.length})` : f === 'PENDING' ? `⏳ Pending (${pendingCount})` : f === 'APPROVED' ? `✅ Approved` : `❌ Rejected`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>⏳ Loading requests…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>
            <div style={{ fontSize: '44px', marginBottom: '10px' }}>📋</div>
            <div>No {filterStatus.toLowerCase()} requests found.</div>
          </div>
        ) : (
          <div>
            {filtered.map(req => (
              <div key={req.requestId} style={{
                border: '1px solid #eee', borderRadius: '12px', padding: '20px', marginBottom: '14px',
                backgroundColor: req.status === 'PENDING' ? '#fffbf0' : 'white',
                borderLeft: `4px solid ${req.status === 'PENDING' ? '#ff9800' : req.status === 'APPROVED' ? '#4caf50' : '#ef5350'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  {/* Left side — request info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px' }}>{req.targetName || req.targetEmail}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px' }}>📧 {req.targetEmail}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', color: '#555' }}>Role change to:</span>
                      <RoleBadge role={req.newRole} />
                    </div>
                    {req.department && (
                      <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px' }}>🏢 Department: <strong>{req.department}</strong></div>
                    )}
                    {req.reason && (
                      <div style={{ fontSize: '13px', color: '#555', marginBottom: '6px', fontStyle: 'italic' }}>💬 "{req.reason}"</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>
                      Proposed by <strong>{req.proposedBy}</strong> ({req.proposedByRole}) · {new Date(req.createdAt).toLocaleString()}
                    </div>
                    {req.approvedBy && (
                      <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '4px' }}>✅ Approved by {req.approvedBy} · {new Date(req.approvedAt).toLocaleString()}</div>
                    )}
                    {req.rejectedBy && (
                      <div style={{ fontSize: '12px', color: '#ef5350', marginTop: '4px' }}>❌ Rejected by {req.rejectedBy} · {req.rejectReason && `Reason: ${req.rejectReason}`}</div>
                    )}
                  </div>

                  {/* Right side — actions (SUPER_ADMIN only, PENDING only) */}
                  {isAdmin && req.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleApprove(req.requestId)}
                        disabled={actionLoading === req.requestId}
                        style={{ ...btn('#4caf50'), opacity: actionLoading === req.requestId ? 0.6 : 1 }}
                      >
                        {actionLoading === req.requestId ? '⏳' : '✅ Approve'}
                      </button>
                      <button
                        onClick={() => { setRejectModal(req); setRejectReason(''); }}
                        disabled={actionLoading === req.requestId}
                        style={{ ...btn('#ef5350'), opacity: actionLoading === req.requestId ? 0.6 : 1 }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '32px', width: '90%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '18px' }}>❌ Reject Role Request</h2>
            <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
              Rejecting role change for <strong>{rejectModal.targetName}</strong> → <strong>{rejectModal.newRole}</strong>
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this request is being rejected…"
                rows={3}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModal(null)} style={{ ...btn('#888') }}>Cancel</button>
              <button onClick={handleReject} disabled={!!actionLoading} style={{ ...btn('#ef5350'), opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading ? '⏳' : '❌ Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleRequestsPage;