import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';

const TeamDirectory = () => {
  const { departments, userRole, hasPermission } = useCompany();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');

  // Mock team members
  const mockTeamMembers = [
    { id: 1, name: 'John Doe', department: 'IT', role: 'Software Developer', email: 'john.doe@cloudly.com', ext: '1001', status: 'ACTIVE' },
    { id: 2, name: 'Sarah Johnson', department: 'HR', role: 'HR Manager', email: 'sarah.johnson@cloudly.com', ext: '2001', status: 'ACTIVE' },
    { id: 3, name: 'Michael Chen', department: 'Finance', role: 'Accountant', email: 'michael.chen@cloudly.com', ext: '3001', status: 'ACTIVE' },
    { id: 4, name: 'Jessica Williams', department: 'Marketing', role: 'Marketing Specialist', email: 'jessica.williams@cloudly.com', ext: '4001', status: 'ACTIVE' },
    { id: 5, name: 'David Brown', department: 'Sales', role: 'Sales Executive', email: 'david.brown@cloudly.com', ext: '5001', status: 'ACTIVE' },
    { id: 6, name: 'Lisa Wang', department: 'IT', role: 'System Administrator', email: 'lisa.wang@cloudly.com', ext: '1002', status: 'ACTIVE' },
    { id: 7, name: 'Robert Kim', department: 'HR', role: 'Recruitment Specialist', email: 'robert.kim@cloudly.com', ext: '2002', status: 'ON_LEAVE' },
    { id: 8, name: 'Emily Davis', department: 'Marketing', role: 'Content Writer', email: 'emily.davis@cloudly.com', ext: '4002', status: 'ACTIVE' },
    { id: 9, name: 'Alex Smith', department: 'IT', role: 'Network Engineer', email: 'alex.smith@cloudly.com', ext: '1003', status: 'ACTIVE' },
    { id: 10, name: 'Sophia Martinez', department: 'Finance', role: 'Financial Analyst', email: 'sophia.martinez@cloudly.com', ext: '3002', status: 'ACTIVE' },
  ];

  const roles = [
    { id: 'all', name: 'All Roles', color: '#666' },
    { id: 'Software Developer', name: 'Software Developer', color: '#45B7D1' },
    { id: 'HR Manager', name: 'HR Manager', color: '#FF6B6B' },
    { id: 'Accountant', name: 'Accountant', color: '#4ECDC4' },
    { id: 'Marketing Specialist', name: 'Marketing Specialist', color: '#96CEB4' },
    { id: 'Sales Executive', name: 'Sales Executive', color: '#FFEAA7' },
    { id: 'System Administrator', name: 'System Administrator', color: '#9c27b0' },
    { id: 'Recruitment Specialist', name: 'Recruitment Specialist', color: '#ff9900' },
    { id: 'Content Writer', name: 'Content Writer', color: '#00cc66' },
    { id: 'Network Engineer', name: 'Network Engineer', color: '#0066ff' },
    { id: 'Financial Analyst', name: 'Financial Analyst', color: '#4ECDC4' },
  ];

  const getStatusColor = (status) => {
    const colors = {
      ACTIVE: '#00cc66',
      INACTIVE: '#ff9900',
      ON_LEAVE: '#0066ff',
      SUSPENDED: '#ff4444'
    };
    return colors[status] || '#666';
  };

  const filteredMembers = mockTeamMembers.filter(member => {
    // Search filter
    if (searchQuery && !member.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !member.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !member.role.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Department filter
    if (selectedDepartment !== 'all' && member.department !== selectedDepartment) {
      return false;
    }
    
    // Role filter
    if (selectedRole !== 'all' && member.role !== selectedRole) {
      return false;
    }
    
    return true;
  });

  // Only allow Department Managers and Super Admins
  if (!hasPermission('user', 'read')) {
    return (
      <div className="upload-wrapper">
        <h1 className="section-title" style={{ color: '#333' }}>Team Directory</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need Department Manager or higher permissions to access the team directory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-wrapper">
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '30px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <h1 className="section-title" style={{ color: '#333', marginBottom: '5px' }}>
          👥 Team Directory
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Find colleagues and contact information across departments
        </p>
      </div>

      {/* Search and Filters */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '20px',
          marginBottom: '25px'
        }}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333'}}>
              Search Team Members
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              style={{
                width: '100%',
                padding: '12px 20px',
                border: '2px solid #ddd',
                borderRadius: '10px',
                fontSize: '15px',
                transition: 'border 0.3s'
              }}
            />
          </div>
          
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333'}}>
              Total Members
            </label>
            <div style={{
              padding: '12px 20px',
              backgroundColor: '#0066ff',
              color: 'white',
              borderRadius: '10px',
              fontSize: '18px',
              fontWeight: 'bold',
              textAlign: 'center',
              minWidth: '100px'
            }}>
              {filteredMembers.length}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333'}}>
              Filter by Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '10px',
                fontSize: '15px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.code}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333'}}>
              Filter by Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '10px',
                fontSize: '15px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Roles</option>
              {roles.filter(r => r.id !== 'all').map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {filteredMembers.length === 0 ? (
          <div style={{
            gridColumn: '1/-1',
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            border: '2px dashed rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{fontSize: '64px', marginBottom: '20px', opacity: 0.5}}>👤</div>
            <h3 style={{color: '#333', marginBottom: '15px'}}>No team members found</h3>
            <p style={{color: '#666', marginBottom: '25px'}}>
              {searchQuery 
                ? `No team members match "${searchQuery}". Try a different search term.`
                : 'No team members found with the selected filters.'
              }
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedDepartment('all');
                setSelectedRole('all');
              }}
              className="btn-3d"
              style={{
                padding: '12px 24px',
                backgroundColor: '#0066ff'
              }}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredMembers.map(member => {
            const department = departments.find(d => d.code === member.department);
            const role = roles.find(r => r.id === member.role);
            
            return (
              <div
                key={member.id}
                className="hover-card"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '15px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  padding: '25px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px'}}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: department?.color || '#0066ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '20px',
                    position: 'relative'
                  }}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                    
                    {/* Status indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '16px',
                      height: '16px',
                      backgroundColor: getStatusColor(member.status),
                      borderRadius: '50%',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}></div>
                  </div>
                  <div>
                    <div style={{fontWeight: '600', color: '#333', fontSize: '18px'}}>{member.name}</div>
                    <div style={{fontSize: '14px', color: '#666'}}>{member.role}</div>
                  </div>
                </div>
                
                {/* Department & Role Badges */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: `${department?.color || '#666'}15`,
                    color: department?.color || '#666',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>🏢</span>
                    {member.department} Department
                  </div>
                  
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: `${role?.color || '#666'}15`,
                    color: role?.color || '#666',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: role?.color || '#666'
                    }}></div>
                    {member.role}
                  </div>
                </div>
                
                {/* Contact Information */}
                <div style={{fontSize: '14px', color: '#666'}}>
                  <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '16px'}}>📧</span>
                    <span style={{wordBreak: 'break-all'}}>{member.email}</span>
                  </div>
                  
                  <div style={{marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '16px'}}>📞</span>
                    <span>Ext: {member.ext}</span>
                  </div>
                  
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span style={{fontSize: '16px'}}>🟢</span>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      backgroundColor: `${getStatusColor(member.status)}15`,
                      color: getStatusColor(member.status),
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(member.status)
                      }}></div>
                      {member.status}
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '20px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    className="btn-3d"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#0066ff',
                      fontSize: '13px'
                    }}
                    onClick={() => {
                      window.location.href = `mailto:${member.email}`;
                    }}
                  >
                    📧 Email
                  </button>
                  
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      color: '#333',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                    onClick={() => {
                      alert(`Contact Information:\n\nName: ${member.name}\nEmail: ${member.email}\nExtension: ${member.ext}\nDepartment: ${member.department}\nRole: ${member.role}\nStatus: ${member.status}`);
                    }}
                  >
                    ℹ️ Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Statistics */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '25px',
        borderRadius: '15px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{color: '#333', marginBottom: '20px'}}>📊 Team Statistics</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(0, 102, 255, 0.05)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#0066ff', marginBottom: '5px'}}>
              {mockTeamMembers.length}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Total Team Members</div>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(0, 204, 102, 0.05)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#00cc66', marginBottom: '5px'}}>
              {mockTeamMembers.filter(m => m.status === 'ACTIVE').length}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Active Members</div>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(156, 39, 176, 0.05)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#9c27b0', marginBottom: '5px'}}>
              {departments.length}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Departments</div>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(255, 153, 0, 0.05)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#ff9900', marginBottom: '5px'}}>
              {roles.length - 1}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Different Roles</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDirectory;