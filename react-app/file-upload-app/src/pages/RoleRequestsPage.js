// src/pages/RoleRequestsPage.js
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { IconCheckCircle, IconXCircle, IconFolder, IconClose } from '../components/icons';

const ROLE_TONE = { SUPER_ADMIN: 'brand', DEPT_HEAD: 'info', UNIT_HEAD: 'success', MEMBER: 'neutral' };
const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', DEPT_HEAD: 'Dept Head', UNIT_HEAD: 'Unit Head', MEMBER: 'Member' };
const RoleBadge = ({ role }) => <Badge tone={ROLE_TONE[role] || 'neutral'}>{ROLE_LABEL[role] || role}</Badge>;

const STATUS_TONE = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
const STATUS_LABEL = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'neutral'}>{STATUS_LABEL[status] || status}</Badge>;

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
    } catch (err) { setMessage('Failed to load requests: ' + err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleApprove = async (requestId) => {
    if (!window.confirm('Approve this role change?')) return;
    try {
      setActionLoading(requestId);
      await apiService.approveRoleRequest(requestId);
      setMessage('Role change approved and applied.');
      await loadRequests();
      window.dispatchEvent(new Event('cloudly-notifications-changed'));
    } catch (err) { setMessage('Failed to approve: ' + err.message); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      setActionLoading(rejectModal.requestId);
      await apiService.rejectRoleRequest(rejectModal.requestId, rejectReason);
      setMessage('Role change request rejected.');
      setRejectModal(null);
      setRejectReason('');
      await loadRequests();
      window.dispatchEvent(new Event('cloudly-notifications-changed'));
    } catch (err) { setMessage('Failed to reject: ' + err.message); }
    finally { setActionLoading(null); }
  };

  const filtered = requests.filter(r => filterStatus === 'ALL' || r.status === filterStatus);
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div>
      <PageHeader
        title="Role change requests"
        subtitle={isAdmin ? 'Review and approve role change proposals from department heads.' : 'Track role change proposals you have submitted.'}
      />

      {message && (
        <div className={`ui-banner ui-banner--${message.toLowerCase().includes('fail') ? 'danger' : 'success'}`} style={{ marginBottom: '20px' }}>
          <span>{message}</span>
          <button className="ui-banner-close" onClick={() => setMessage('')}><IconClose size={14} /></button>
        </div>
      )}

      <div className="cl-stat-row-3" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Pending', value: requests.filter(r => r.status === 'PENDING').length, tone: 'warning', key: 'PENDING' },
          { label: 'Approved', value: requests.filter(r => r.status === 'APPROVED').length, tone: 'success', key: 'APPROVED' },
          { label: 'Rejected', value: requests.filter(r => r.status === 'REJECTED').length, tone: 'danger', key: 'REJECTED' },
        ].map((s) => (
          <Card key={s.key} onClick={() => setFilterStatus(s.key)} style={{ cursor: 'pointer', borderColor: filterStatus === s.key ? 'var(--c-brand)' : 'var(--c-border)' }}>
            <div style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--c-text)' }}>{s.value}</div>
            <div style={{ marginTop: '6px' }}><Badge tone={s.tone}>{s.label}</Badge></div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="ui-tabs">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
            <button key={f} type="button" className={`ui-tab ${filterStatus === f ? 'ui-tab--active' : ''}`} onClick={() => setFilterStatus(f)}>
              {f === 'ALL' ? `All (${requests.length})` : f === 'PENDING' ? `Pending (${pendingCount})` : f === 'APPROVED' ? 'Approved' : 'Rejected'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--c-text-muted)' }}>Loading requests…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<IconFolder size={28} />} title={`No ${filterStatus.toLowerCase()} requests found`} />
        ) : (
          <div>
            {filtered.map(req => (
              <div key={req.requestId} className="cl-request-row" style={{ borderLeftColor: req.status === 'PENDING' ? 'var(--c-warning)' : req.status === 'APPROVED' ? 'var(--c-success)' : 'var(--c-danger)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--fs-md)' }}>{req.targetName || req.targetEmail}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-muted)', marginBottom: '6px' }}>{req.targetEmail}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>Role change to:</span>
                      <RoleBadge role={req.newRole} />
                    </div>
                    {req.department && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginBottom: '6px' }}>Department: <strong>{req.department}</strong></div>}
                    {req.reason && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginBottom: '6px', fontStyle: 'italic' }}>"{req.reason}"</div>}
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-faint)', marginTop: '8px' }}>
                      Proposed by <strong>{req.proposedBy}</strong> ({req.proposedByRole}) &middot; {new Date(req.createdAt).toLocaleString()}
                    </div>
                    {req.approvedBy && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-success)', marginTop: '4px' }}>Approved by {req.approvedBy} &middot; {new Date(req.approvedAt).toLocaleString()}</div>}
                    {req.rejectedBy && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-danger)', marginTop: '4px' }}>Rejected by {req.rejectedBy}{req.rejectReason && ` — ${req.rejectReason}`}</div>}
                  </div>

                  {isAdmin && req.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button variant="success" size="sm" icon={<IconCheckCircle size={14} />} loading={actionLoading === req.requestId} onClick={() => handleApprove(req.requestId)}>Approve</Button>
                      <Button variant="danger" size="sm" icon={<IconXCircle size={14} />} disabled={actionLoading === req.requestId} onClick={() => { setRejectModal(req); setRejectReason(''); }}>Reject</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {rejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <Card style={{ width: '100%', maxWidth: '460px' }}>
            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, marginBottom: '16px' }}>Reject role request</h2>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginBottom: '16px' }}>
              Rejecting role change for <strong>{rejectModal.targetName}</strong> &rarr; <strong>{rejectModal.newRole}</strong>
            </p>
            <div className="ui-field">
              <label className="ui-label">Reason (optional)</label>
              <textarea className="ui-textarea" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain why this request is being rejected…" rows={3} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancel</Button>
              <Button variant="danger" loading={!!actionLoading} onClick={handleReject}>Confirm reject</Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`.cl-request-row { border:1px solid var(--c-border); border-left-width:4px; border-radius:var(--radius-md); padding:18px; margin-bottom:12px; }`}</style>
    </div>
  );
};

export default RoleRequestsPage;