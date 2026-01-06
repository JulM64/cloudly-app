import React, { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';

const UserManagement = () => {
  const { departments, roles, currentUser, hasPermission, getRoleColor } = useCompany();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form states
  const [userData, setUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    departmentId: '',
    roleId: '',
    jobTitle: '',
    phone: '',
    extension: '',
    employeeId: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (hasPermission('SUPER_ADMIN')) {
      loadUsers();
    }
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Mock users - in real app, fetch from GraphQL
      const mockUsers = [
        {
          id: 'user-julien',
          email: 'julienmveng6@gmail.com',
          username: 'julienmveng6',
          firstName: 'Julien',
          lastName: 'Mveng',
          departmentId: 'dept-it',
          department: { name: 'IT', code: 'IT', color: '#45B7D1' },
          roleId: 'role-super-admin',
          role: { name: 'Super Administrator', color: '#9c27b0' },
          jobTitle: 'System Administrator',
          status: 'ACTIVE',
          phone: '+1234567890',
          extension: '1001',
          employeeId: 'EMP001',
          hireDate: '2024-01-01',
          lastLoginAt: new Date().toISOString(),
          createdAt: '2024-01-01T00:00:00Z',
          avatar: null
        },
        {
          id: 'user-hr-manager',
          email: 'hr.manager@cloudly.com',
          username: 'hr.manager',
          firstName: 'Sarah',
          lastName: 'Johnson',
          departmentId: 'dept-hr',
          department: { name: 'Human Resources', code: 'HR', color: '#FF6B6B' },
          roleId: 'role-department-manager',
          role: { name: 'Department Manager', color: '#0066ff' },
          jobTitle: 'HR Manager',
          status: 'ACTIVE',
          phone: '+1234567891',
          extension: '2001',
          employeeId: 'EMP002',
          hireDate: '2024-01-15',
          lastLoginAt: new Date().toISOString(),
          createdAt: '2024-01-15T00:00:00Z',
          avatar: null
        },
        {
          id: 'user-finance-emp',
          email: 'finance.emp@cloudly.com',
          username: 'finance.emp',
          firstName: 'Michael',
          lastName: 'Chen',
          departmentId: 'dept-finance',
          department: { name: 'Finance', code: 'FIN', color: '#4ECDC4' },
          roleId: 'role-employee',
          role: { name: 'Employee', color: '#666' },
          jobTitle: 'Accountant',
          status: 'ACTIVE',
          phone: '+1234567892',
          extension: '3001',
          employeeId: 'EMP003',
          hireDate: '2024-02-01',
          lastLoginAt: new Date().toISOString(),
          createdAt: '2024-02-01T00:00:00Z',
          avatar: null
        },
        {
          id: 'user-marketing-lead',
          email: 'marketing.lead@cloudly.com',
          username: 'marketing.lead',
          firstName: 'Jessica',
          lastName: 'Williams',
          departmentId: 'dept-marketing',
          department: { name: 'Marketing', code: 'MKT', color: '#96CEB4' },
          roleId: 'role-team-leader',
          role: { name: 'Team Leader', color: '#00cc66' },
          jobTitle: 'Marketing Lead',
          status: 'ACTIVE',
          phone: '+1234567893',
          extension: '4001',
          employeeId: 'EMP004',
          hireDate: '2024-02-15',
          lastLoginAt: new Date().toISOString(),
          createdAt: '2024-02-15T00:00:00Z',
          avatar: null
        },
        {
          id: 'user-sales-viewer',
          email: 'sales.viewer@cloudly.com',
          username: 'sales.viewer',
          firstName: 'David',
          lastName: 'Brown',
          departmentId: 'dept-sales',
          department: { name: 'Sales', code: 'SALES', color: '#FFEAA7' },
          roleId: 'role-viewer',
          role: { name: 'Viewer', color: '#ff9900' },
          jobTitle: 'Sales Analyst',
          status: 'ACTIVE',
          phone: '+1234567894',
          extension: '5001',
          employeeId: 'EMP005',
          hireDate: '2024-03-01',
          lastLoginAt: new Date().toISOString(),
          createdAt: '2024-03-01T00:00:00Z',
          avatar: null
        },
        {
          id: 'user-contractor',
          email: 'contractor@external.com',
          username: 'contractor.ext',
          firstName: 'Alex',
          lastName: 'Smith',
          departmentId: 'dept-it',
          department: { name: 'IT', code: 'IT', color: '#45B7D1' },
          roleId: 'role-contractor',
          role: { name: 'Contractor', color: '#ff6600' },
          jobTitle: 'External Consultant',
          status: 'ACTIVE',
          phone: '+1234567895',
          extension: '1002',
          employeeId: 'CON001',
          hireDate: '2024-03-15',
          lastLoginAt: new Date().toISOString(),
          createdAt: '2024-03-15T00:00:00Z',
          avatar: null
        }
      ];

      setTimeout(() => {
        setUsers(mockUsers);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading users:', error);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    if (searchQuery && !user.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !user.lastName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Department filter
    if (filterDepartment !== 'all' && user.departmentId !== filterDepartment) {
      return false;
    }
    
    // Role filter
    if (filterRole !== 'all' && user.roleId !== filterRole) {
      return false;
    }
    
    // Status filter
    if (filterStatus !== 'all' && user.status !== filterStatus) {
      return false;
    }
    
    return true;
  });

  const handleCreateUser = (e) => {
    e.preventDefault();
    
    const newUser = {
      id: `user-${Date.now()}`,
      email: userData.email,
      username: userData.email.split('@')[0],
      firstName: userData.firstName,
      lastName: userData.lastName,
      departmentId: userData.departmentId,
      department: departments.find(d => d.id === userData.departmentId),
      roleId: userData.roleId,
      role: roles.find(r => r.id === userData.roleId),
      jobTitle: userData.jobTitle,
      status: userData.status,
      phone: userData.phone,
      extension: userData.extension,
      employeeId: userData.employeeId,
      hireDate: new Date().toISOString().split('T')[0],
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
      avatar: null
    };
    
    setUsers([...users, newUser]);
    setShowCreateModal(false);
    resetForm();
    
    alert(`User "${userData.email}" created successfully!`);
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    
    setUsers(users.map(user => 
      user.id === selectedUser.id 
        ? { 
            ...user, 
            firstName: userData.firstName,
            lastName: userData.lastName,
            departmentId: userData.departmentId,
            department: departments.find(d => d.id === userData.departmentId),
            roleId: userData.roleId,
            role: roles.find(r => r.id === userData.roleId),
            jobTitle: userData.jobTitle,
            status: userData.status,
            phone: userData.phone,
            extension: userData.extension,
            employeeId: userData.employeeId
          }
        : user
    ));
    
    setShowEditModal(false);
    resetForm();
    
    alert(`User "${selectedUser.email}" updated successfully!`);
  };

  const handleDeleteUser = (userId) => {
    if (userId === currentUser?.id) {
      alert('Cannot delete your own account!');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    setUsers(users.filter(user => user.id !== userId));
    alert('User deleted successfully!');
  };

  const handleDeactivateUser = (userId) => {
    if (userId === currentUser?.id) {
      alert('Cannot deactivate your own account!');
      return;
    }
    
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
        : user
    ));
    
    const user = users.find(u => u.id === userId);
    alert(`User "${user.email}" ${user.status === 'ACTIVE' ? 'deactivated' : 'activated'} successfully!`);
  };

  const resetForm = () => {
    setUserData({
      email: '',
      firstName: '',
      lastName: '',
      departmentId: '',
      roleId: '',
      jobTitle: '',
      phone: '',
      extension: '',
      employeeId: '',
      status: 'ACTIVE'
    });
    setSelectedUser(null);
  };

  const editUser = (user) => {
    setSelectedUser(user);
    setUserData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId: user.departmentId,
      roleId: user.roleId,
      jobTitle: user.jobTitle || '',
      phone: user.phone || '',
      extension: user.extension || '',
      employeeId: user.employeeId || '',
      status: user.status
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: '#00cc66',
      INACTIVE: '#ff9900',
      ON_LEAVE: '#0066ff',
      SUSPENDED: '#ff4444',
      TERMINATED: '#666'
    };
    return colors[status] || '#666';
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
        <h1 className="section-title">User Management</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need Super Admin permissions to manage users.</p>
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
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#0066ff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>➕</span> Invite User
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
            {users.filter(u => u.role?.name === 'Department Manager').length}
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>Department Managers</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '25px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div>
            <label style={filterLabelStyle}>Search Users</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              style={filterInputStyle}
            />
          </div>
          
          <div>
            <label style={filterLabelStyle}>Department</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              style={filterInputStyle}
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={filterLabelStyle}>Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={filterInputStyle}
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={filterLabelStyle}>Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={filterInputStyle}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '15px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          padding: '20px',
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
          <div style={{textAlign: 'center'}}>Actions</div>
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
        ) : filteredUsers.length === 0 ? (
          <div style={{padding: '40px', textAlign: 'center'}}>
            <div style={{fontSize: '48px', marginBottom: '15px', opacity: 0.5}}>👤</div>
            <p style={{color: '#666', margin: 0}}>No users found</p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div 
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                padding: '20px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                alignItems: 'center',
                backgroundColor: user.id === currentUser?.id ? 'rgba(0, 102, 255, 0.05)' : 'transparent'
              }}
            >
              {/* User Info */}
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: getRoleColor(user.role?.name || 'EMPLOYEE'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{fontWeight: '600', color: '#333'}}>
                      {user.firstName} {user.lastName}
                      {user.id === currentUser?.id && (
                        <span style={{marginLeft: '8px', fontSize: '12px', color: '#0066ff'}}>(You)</span>
                      )}
                    </div>
                    <div style={{fontSize: '13px', color: '#666', marginTop: '4px'}}>
                      {user.email}
                    </div>
                    <div style={{fontSize: '12px', color: '#888', marginTop: '2px'}}>
                      {user.jobTitle}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Department */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: `${user.department?.color || '#666'}15`,
                  color: user.department?.color || '#666',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  <span style={{fontSize: '12px'}}>🏢</span>
                  {user.department?.code || 'N/A'}
                </div>
              </div>
              
              {/* Role */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: `${user.role?.color || '#666'}15`,
                  color: user.role?.color || '#666',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: user.role?.color || '#666'
                  }}></div>
                  {user.role?.name || 'Employee'}
                </div>
              </div>
              
              {/* Status */}
              <div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: `${getStatusColor(user.status)}15`,
                  color: getStatusColor(user.status),
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(user.status)
                  }}></div>
                  {user.status}
                </div>
                <div style={{fontSize: '11px', color: '#888', marginTop: '4px'}}>
                  Last login: {formatDate(user.lastLoginAt)}
                </div>
              </div>
              
              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => editUser(user)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    color: '#0066ff',
                    border: '1px solid rgba(0, 102, 255, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span>✏️</span> Edit
                </button>
                
                <button
                  onClick={() => handleDeactivateUser(user.id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: user.status === 'ACTIVE' 
                      ? 'rgba(255, 153, 0, 0.1)' 
                      : 'rgba(0, 204, 102, 0.1)',
                    color: user.status === 'ACTIVE' ? '#ff9900' : '#00cc66',
                    border: `1px solid ${user.status === 'ACTIVE' ? 'rgba(255, 153, 0, 0.2)' : 'rgba(0, 204, 102, 0.2)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span>{user.status === 'ACTIVE' ? '⏸️' : '▶️'}</span>
                  {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
                
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  disabled={user.id === currentUser?.id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    color: user.id === currentUser?.id ? '#aaa' : '#ff4444',
                    border: `1px solid ${user.id === currentUser?.id ? 'rgba(170, 170, 170, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`,
                    borderRadius: '6px',
                    cursor: user.id === currentUser?.id ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <UserModal
          title="Invite New User"
          onSubmit={handleCreateUser}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          userData={userData}
          setUserData={setUserData}
          departments={departments}
          roles={roles}
          isEditing={false}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <UserModal
          title={`Edit User: ${selectedUser.firstName} ${selectedUser.lastName}`}
          onSubmit={handleUpdateUser}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
          }}
          userData={userData}
          setUserData={setUserData}
          departments={departments}
          roles={roles}
          isEditing={true}
        />
      )}
    </div>
  );
};

// User Modal Component
const UserModal = ({
  title,
  onSubmit,
  onClose,
  userData,
  setUserData,
  departments,
  roles,
  isEditing
}) => {
  const handleChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <h3 style={{margin: 0}}>{title}</h3>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>
        
        <form onSubmit={onSubmit}>
          {/* Basic Info */}
          <div style={formSectionStyle}>
            <h4 style={sectionTitleStyle}>Basic Information</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  value={userData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="John"
                />
              </div>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  value={userData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                value={userData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                disabled={isEditing}
                style={inputStyle}
                placeholder="john.doe@company.com"
              />
            </div>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Job Title</label>
              <input
                type="text"
                value={userData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                style={inputStyle}
                placeholder="e.g., Software Developer, HR Manager"
              />
            </div>
          </div>
          
          {/* Department & Role */}
          <div style={formSectionStyle}>
            <h4 style={sectionTitleStyle}>Department & Role</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Department *</label>
                <select
                  value={userData.departmentId}
                  onChange={(e) => handleChange('departmentId', e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Role *</label>
                <select
                  value={userData.roleId}
                  onChange={(e) => handleChange('roleId', e.target.value)}
                  required
                  style={selectStyle}
                >
                  <option value="">Select Role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Contact Info */}
          <div style={formSectionStyle}>
            <h4 style={sectionTitleStyle}>Contact Information</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  value={userData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  style={inputStyle}
                  placeholder="+1234567890"
                />
              </div>
              
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Extension</label>
                <input
                  type="text"
                  value={userData.extension}
                  onChange={(e) => handleChange('extension', e.target.value)}
                  style={inputStyle}
                  placeholder="1001"
                />
              </div>
            </div>
            
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Employee ID</label>
              <input
                type="text"
                value={userData.employeeId}
                onChange={(e) => handleChange('employeeId', e.target.value)}
                style={inputStyle}
                placeholder="EMP001"
              />
            </div>
          </div>
          
          {/* Status */}
          <div style={formSectionStyle}>
            <h4 style={sectionTitleStyle}>Account Status</h4>
            <div style={radioGroupStyle}>
              {['ACTIVE', 'INACTIVE', 'ON_LEAVE'].map(status => (
                <label key={status} style={radioLabelStyle}>
                  <input
                    type="radio"
                    checked={userData.status === status}
                    onChange={() => handleChange('status', status)}
                  />
                  <span style={{...radioTextStyle, color: getStatusColor(status)}}>
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Modal Actions */}
          <div style={modalActionsStyle}>
            <button
              type="button"
              onClick={onClose}
              style={cancelButtonStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-3d"
              style={submitButtonStyle}
            >
              {isEditing ? 'Update User' : 'Invite User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  const colors = {
    ACTIVE: '#00cc66',
    INACTIVE: '#ff9900',
    ON_LEAVE: '#0066ff',
    SUSPENDED: '#ff4444',
    TERMINATED: '#666'
  };
  return colors[status] || '#666';
};

// Styles
const filterLabelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#333'
};

const filterInputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  backgroundColor: 'white'
};

const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px'
};

const modalStyle = {
  backgroundColor: 'white',
  padding: '30px',
  borderRadius: '15px',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '25px'
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '28px',
  cursor: 'pointer',
  color: '#666',
  padding: '0',
  width: '30px',
  height: '30px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const formSectionStyle = {
  marginBottom: '25px',
  paddingBottom: '20px',
  borderBottom: '1px solid rgba(0,0,0,0.1)'
};

const sectionTitleStyle = {
  margin: '0 0 15px 0',
  color: '#333',
  fontSize: '16px'
};

const inputGroupStyle = {
  marginBottom: '15px'
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: '600',
  color: '#333',
  fontSize: '14px'
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  border: '2px solid #ddd',
  borderRadius: '8px',
  fontSize: '15px',
  transition: 'border 0.3s'
};

const selectStyle = {
  width: '100%',
  padding: '12px',
  border: '2px solid #ddd',
  borderRadius: '8px',
  fontSize: '15px',
  backgroundColor: 'white',
  cursor: 'pointer'
};

const radioGroupStyle = {
  display: 'flex',
  gap: '15px'
};

const radioLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer'
};

const radioTextStyle = {
  color: '#333',
  fontSize: '14px'
};

const modalActionsStyle = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'flex-end',
  marginTop: '30px'
};

const cancelButtonStyle = {
  padding: '12px 24px',
  backgroundColor: '#f8f9fa',
  border: '1px solid #ddd',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: '500',
  color: '#333'
};

const submitButtonStyle = {
  padding: '12px 24px',
  backgroundColor: '#0066ff',
  color: 'white'
};

export default UserManagement;