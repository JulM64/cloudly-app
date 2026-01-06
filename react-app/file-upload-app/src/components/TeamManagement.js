import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useSaaS } from '../contexts/SaaSContext';

const client = generateClient();

const TeamManagement = () => {
  const { currentCompany, userRole, hasPermission } = useSaaS();
  const [teamMembers, setTeamMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('USER');

  useEffect(() => {
    if (currentCompany && hasPermission('MANAGER')) {
      loadTeamData();
    }
  }, [currentCompany]);

  const loadTeamData = async () => {
    try {
      // TODO: Fetch real data from GraphQL
      // Mock data for now
      setTeamMembers([
        { id: '1', email: 'admin@company.com', role: 'ADMIN', status: 'ACTIVE', lastLogin: '2024-01-15' },
        { id: '2', email: 'manager@company.com', role: 'MANAGER', status: 'ACTIVE', lastLogin: '2024-01-14' },
        { id: '3', email: 'user1@company.com', role: 'USER', status: 'ACTIVE', lastLogin: '2024-01-13' },
        { id: '4', email: 'user2@company.com', role: 'USER', status: 'INACTIVE', lastLogin: '2024-01-10' }
      ]);
      
      setInvitations([
        { id: '1', email: 'invite1@company.com', role: 'USER', status: 'PENDING', sentAt: '2024-01-12' }
      ]);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('MANAGER')) {
      alert('You need manager permissions to invite team members');
      return;
    }

    // TODO: Send real invitation via GraphQL
    console.log('Inviting:', { email: inviteEmail, role: inviteRole });
    
    // Mock invitation
    setInvitations(prev => [...prev, {
      id: Date.now().toString(),
      email: inviteEmail,
      role: inviteRole,
      status: 'PENDING',
      sentAt: new Date().toISOString().split('T')[0]
    }]);
    
    setInviteEmail('');
    setInviteRole('USER');
    setShowInviteForm(false);
    
    alert(`Invitation sent to ${inviteEmail}`);
  };

  const getRoleBadge = (role) => {
    const colors = {
      'ADMIN': '#dc3545',
      'MANAGER': '#9c27b0',
      'USER': '#0066ff',
      'VIEWER': '#666'
    };
    
    return (
      <span style={{
        padding: '4px 12px',
        backgroundColor: colors[role] + '20',
        color: colors[role],
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      'ACTIVE': '#00cc66',
      'INACTIVE': '#ff9900',
      'SUSPENDED': '#ff4444',
      'PENDING': '#666'
    };
    
    return (
      <span style={{
        padding: '4px 12px',
        backgroundColor: colors[status] + '20',
        color: colors[status],
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {status}
      </span>
    );
  };

  if (!hasPermission('MANAGER')) {
    return (
      <div className="upload-wrapper">
        <h1 className="section-title">Team Management</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need manager or admin permissions to access team management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-wrapper">
      <h1 className="section-title">Team Management</h1>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div>
          <h2 style={{margin: 0}}>{currentCompany?.name} Team</h2>
          <p style={{opacity: 0.7, margin: '5px 0 0 0'}}>
            Manage team members and permissions
          </p>
        </div>
        
        {hasPermission('ADMIN') && (
          <button 
            className="btn-3d"
            onClick={() => setShowInviteForm(true)}
            style={{padding: '12px 24px'}}
          >
            👥 Invite Team Member
          </button>
        )}
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '15px',
            width: '90%',
            maxWidth: '500px',
            color: '#333'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0}}>Invite Team Member</h3>
              <button 
                onClick={() => setShowInviteForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleInvite}>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                  placeholder="team.member@company.com"
                />
              </div>
              
              <div style={{marginBottom: '25px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="USER">User (Can upload & manage own files)</option>
                  <option value="MANAGER">Manager (Can manage team & files)</option>
                  <option value="ADMIN">Admin (Full access)</option>
                  <option value="VIEWER">Viewer (Read-only access)</option>
                </select>
              </div>
              
              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-3d"
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#0066ff'
                  }}
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div style={{marginBottom: '40px'}}>
        <h3>Team Members ({teamMembers.length})</h3>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            padding: '15px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontWeight: '600',
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }}>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Last Login</div>
            <div>Actions</div>
          </div>
          
          {teamMembers.map(member => (
            <div 
              key={member.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '15px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                alignItems: 'center'
              }}
            >
              <div style={{fontWeight: '500'}}>{member.email}</div>
              <div>{getRoleBadge(member.role)}</div>
              <div>{getStatusBadge(member.status)}</div>
              <div style={{fontSize: '14px', opacity: '0.8'}}>{member.lastLogin}</div>
              <div>
                {hasPermission('ADMIN') && member.role !== 'ADMIN' && (
                  <button 
                    className="btn-3d"
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      backgroundColor: '#ff4444',
                      opacity: member.status === 'ACTIVE' ? 1 : 0.5
                    }}
                    disabled={member.status !== 'ACTIVE'}
                  >
                    {member.status === 'ACTIVE' ? 'Suspend' : 'Suspended'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      <div>
        <h3>Pending Invitations ({invitations.length})</h3>
        {invitations.length > 0 ? (
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '15px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              fontWeight: '600',
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }}>
              <div>Email</div>
              <div>Role</div>
              <div>Sent On</div>
              <div>Actions</div>
            </div>
            
            {invitations.map(invite => (
              <div 
                key={invite.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '15px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  alignItems: 'center'
                }}
              >
                <div style={{fontWeight: '500'}}>{invite.email}</div>
                <div>{getRoleBadge(invite.role)}</div>
                <div style={{fontSize: '14px', opacity: '0.8'}}>{invite.sentAt}</div>
                <div>
                  {hasPermission('ADMIN') && (
                    <button 
                      className="btn-3d"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#ff4444'
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.2)'
          }}>
            <p style={{opacity: 0.7, margin: 0}}>No pending invitations</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;