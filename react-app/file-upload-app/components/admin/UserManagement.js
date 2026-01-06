import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { useCompany } from '../../contexts/CompanyContext';

const client = generateClient();

const UserManagement = () => {
  const { departments, userRole, hasPermission } = useCompany();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Invitation form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  
  // Edit form state
  const [editRole, setEditRole] = useState('EMPLOYEE');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');

  useEffect(() => {
    if (hasPermission('SUPER_ADMIN')) {
      loadUsers();
    }
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // TODO: Replace with real GraphQL query
      // Mock data for now
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@company.com',
          firstName: 'John',
          lastName: 'Doe',
          departmentId: 'dept-it',
          department: { name: 'IT', code: 'IT' },
          jobTitle: 'System Administrator',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          lastLoginAt: '2024-01-15T10:30:00Z',
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 'user-2',
          email: 'hr.manager@company.com',
          firstName: 'Jane',
          lastName: 'Smith',
          departmentId: 'dept-hr',
          department: { name: 'HR', code: 'HR' },
          jobTitle: 'HR Manager',
          role: 'DEPARTMENT_MANAGER',
          status: 'ACTIVE',
          lastLoginAt: '2024-01-14T09:15:00Z',
          createdAt: '2023-02-15T00:00:00Z'
        },
        {
          id: 'user-3',
          email: 'developer@company.com',
          firstName: 'Mike',
          lastName: 'Johnson',
          departmentId: 'dept-it',
          department: { name: 'IT', code: 'IT' },
          jobTitle: 'Software Developer',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          lastLoginAt: '2024-01-15T08:45:00Z',
          createdAt: '2023-03-10T00:00:00Z'
        },
        {
          id: 'user-4',
          email: 'finance@company.com',
          firstName: 'Sarah',
          lastName: 'Williams',
          departmentId: 'dept-finance',
          department: { name: 'Finance', code: 'FIN' },
          jobTitle: 'Accountant',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          lastLoginAt: '2024-01-12T14:20:00Z',
          createdAt: '2023-04-05T00:00:00Z'
        },
        {
          id: 'user-5',
          email: 'contractor@company.com',
          firstName: 'Alex',
          lastName: 'Brown',
          departmentId: 'dept-it',
          department: { name: 'IT', code: 'IT' },
          jobTitle: 'IT Consultant',
          role: 'CONTRACTOR',
          status: 'ACTIVE',
          lastLoginAt: '2024-01-10T11:10:00Z',
          createdAt: '2023-05-20T00:00:00Z'
        }
      ];
      
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    
    try {
      // TODO: Call GraphQL mutation to invite user
      console.log('Inviting user:', {
        email: inviteEmail,
        departmentId: inviteDepartment,
        role: inviteRole
      });
      
      alert(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteDepartment('');
      setInviteRole('EMPLOYEE');
      
    } catch (error) {
      console.error('Error inviting user:', error);
      alert(`Failed to invite user: ${error.message}`);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      // TODO: Call GraphQL mutation to update user
      console.log('Updating user:', {
        userId: selectedUser.id,
        role: editRole,
        departmentId: editDepartment,
        status: editStatus
      });
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { 
              ...user, 
              role: editRole, 
              departmentId: editDepartment,
              department: departments.find(d => d.id === editDepartment),
              status: editStatus 
            }
          : user
      ));
      
      setShowEditModal(false);
      setSelectedUser(null);
      alert('User updated successfully');
      
    } catch (error) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user? They will no longer be able to access the system.')) {
      return;
    }
    
    try {
      // TODO: Call GraphQL mutation to deactivate user
      console.log('Deactivating user:', userId);
      
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, status: 'INACTIVE' }
          : user
      ));
      
      alert('User deactivated successfully');
      
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert(`Failed to deactivate user: ${error.message}`);
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      'SUPER_ADMIN': '#9c27b0',
      'DEPARTMENT_MANAGER': '#0066ff',
      'TEAM_LEADER': '#00cc66',
      'EMPLOYEE': '#666',
      'VIEWER': '#ff9900',
      'CONTRACTOR': '#ff6600'
    };
    
    const labels = {
      'SUPER_ADMIN': 'Super Admin',
      'DEPARTMENT_MANAGER': 'Dept Manager',
      'TEAM_LEADER': 'Team Leader',
      'EMPLOYEE': 'Employee',
      'VIEWER': 'Viewer',
      'CONTRACTOR': 'Contractor'
    };
    
    return (
      <span style={{
        padding: '4px 10px',
        backgroundColor: colors[role] + '20',
        color: colors[role],
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        {labels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      'ACTIVE': '#00cc66',
      'INACTIVE': '#666',
      'ON_LEAVE': '#ff9900',
      'SUSPENDED': '#ff4444',
      'TERMINATED': '#333'
    };
    
    return (
      <span style={{
        padding: '4px 10px',
        backgroundColor: colors[status] + '20',
        color: colors[status],
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="upload-wrapper">
        <h1 className="section-title" style={{ color: '#333' }}>User Management</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need Super Admin permissions to access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-wrapper">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 className="section-title" style={{ color: '#333', marginBottom: '5px' }}>
            👥 User Management
          </h1>
          <p style={{ color: '#666', margin: 0 }}>
            Manage user accounts, roles, and permissions
          </p>
        </div>
        
        <button 
          className="btn-3d"
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0066ff'
          }}
        >
          📧 Invite New User
        </button>
      </div>
      
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '5px'}}>
            {users.length}
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>Total Users</div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '5px'}}>
            {users.filter(u => u.status === 'ACTIVE').length}
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>Active Users</div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '5px'}}>
            {users.filter(u => u.role === 'SUPER_ADMIN').length}
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>Admins</div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          textAlign: 'center'
        }}>
          <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '5px'}}>
            {departments.length}
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>Departments</div>
        </div>
      </div>
      
      {/* Users Table */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '15px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        marginBottom: '30px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
          padding: '15px 20px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          fontWeight: '600',
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
          color: '#333',
          alignItems: 'center'
        }}>
          <div>User</div>
          <div>Department</div>
          <div>Role</div>
          <div>Status</div>
          <div>Last Login</div>
          <div>Actions</div>
        </div>
        
        {loading ? (
          <div style={{padding: '40px', textAlign: 'center'}}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(0, 0, 0, 0.1)',
              borderTop: '3px solid #0066ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <p style={{color: '#666', margin: 0}}>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center', opacity: 0.5}}>
            <div style={{fontSize: '48px', marginBottom: '15px'}}>👥</div>
            <p style={{color: '#666', margin: 0}}>No users found</p>
          </div>
        ) : (
          users.map(user => (
            <div 
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
                padding: '15px 20px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                alignItems: 'center',
                backgroundColor: user.status === 'ACTIVE' ? 'transparent' : 'rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <div style={{fontWeight: '500', color: '#333', marginBottom: '2px'}}>
                  {user.firstName} {user.lastName}
                </div>
                <div style={{fontSize: '12px', color: '#666'}}>{user.email}</div>
                {user.jobTitle && (
                  <div style={{fontSize: '11px', color: '#999', marginTop: '2px'}}>
                    {user.jobTitle}
                  </div>
                )}
              </div>
              
              <div>
                <span style={{
                  padding: '4px 10px',
                  backgroundColor: (departments.find(d => d.id === user.departmentId)?.color || '#666') + '20',
                  color: departments.find(d => d.id === user.departmentId)?.color || '#666',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {user.department?.code || 'Unknown'}
                </span>
              </div>
              
              <div>{getRoleBadge(user.role)}</div>
              
              <div>{getStatusBadge(user.status)}</div>
              
              <div style={{fontSize: '12px', color: '#666'}}>
                {formatDate(user.lastLoginAt)}
              </div>
              
              <div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setEditRole(user.role);
                      setEditDepartment(user.departmentId);
                      setEditStatus(user.status);
                      setShowEditModal(true);
                    }}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'rgba(0, 102, 255, 0.1)',
                      color: '#0066ff',
                      border: '1px solid rgba(0, 102, 255, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Edit
                  </button>
                  
                  {user.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        color: '#ff4444',
                        border: '1px solid rgba(255, 68, 68, 0.2)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Invite User Modal */}
      {showInviteModal && (
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
            color: '#333',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0}}>📧 Invite New User</h3>
              <button 
                onClick={() => setShowInviteModal(false)}
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
                  placeholder="new.user@company.com"
                />
              </div>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Department
                </label>
                <select
                  value={inviteDepartment}
                  onChange={(e) => setInviteDepartment(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
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
                  <option value="EMPLOYEE">Employee (Default access)</option>
                  <option value="DEPARTMENT_MANAGER">Department Manager (Full department access)</option>
                  <option value="TEAM_LEADER">Team Leader (Extended permissions)</option>
                  <option value="VIEWER">Viewer (Read-only access)</option>
                  <option value="CONTRACTOR">Contractor (Limited access)</option>
                  <option value="SUPER_ADMIN">Super Admin (Full system access)</option>
                </select>
                <div style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                  {inviteRole === 'SUPER_ADMIN' && '⚠️ Use with caution - Full system access'}
                  {inviteRole === 'DEPARTMENT_MANAGER' && 'Can manage their department'}
                  {inviteRole === 'EMPLOYEE' && 'Standard user permissions'}
                </div>
              </div>
              
              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
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
      
      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
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
            color: '#333',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0}}>✏️ Edit User: {selectedUser.firstName} {selectedUser.lastName}</h3>
              <button 
                onClick={() => setShowEditModal(false)}
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
            
            <form onSubmit={handleUpdateUser}>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Email
                </label>
                <input
                  type="text"
                  value={selectedUser.email}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #eee',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: '#f9f9f9',
                    color: '#666'
                  }}
                />
              </div>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Department
                </label>
                <select
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="DEPARTMENT_MANAGER">Department Manager</option>
                  <option value="TEAM_LEADER">Team Leader</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              
              <div style={{marginBottom: '25px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>
              
              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;