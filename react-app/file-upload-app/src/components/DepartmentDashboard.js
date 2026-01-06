import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';

const DepartmentDashboard = () => {
  const { departments, currentDepartment, userRole, hasPermission } = useCompany();
  const [activeTab, setActiveTab] = useState('overview');

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!hasPermission('DEPARTMENT_MANAGER')) {
    return (
      <div className="upload-wrapper">
        <h1 className="section-title">Department Dashboard</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need Department Manager or higher permissions to access department dashboard.</p>
        </div>
      </div>
    );
  }

  const canManageAllDepartments = userRole === 'SUPER_ADMIN';

  return (
    <div className="upload-wrapper">
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}>
        <h1 className="section-title" style={{ marginBottom: '5px', color: '#333' }}>
          🏢 Department Management
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          {canManageAllDepartments ? 'Manage all departments and their settings' : 'Manage your department settings and storage'}
        </p>
      </div>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        padding: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'overview' ? '#0066ff' : 'transparent',
            color: activeTab === 'overview' ? 'white' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>📊</span> Overview
        </button>
        
        <button
          onClick={() => setActiveTab('storage')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'storage' ? '#0066ff' : 'transparent',
            color: activeTab === 'storage' ? 'white' : '#333',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>💾</span> Storage
        </button>
        
        {canManageAllDepartments && (
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 20px',
              backgroundColor: activeTab === 'settings' ? '#0066ff' : 'transparent',
              color: activeTab === 'settings' ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>⚙️</span> Settings
          </button>
        )}
      </div>
      
      {/* Content */}
      {activeTab === 'overview' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total Departments</div>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333'}}>
                {canManageAllDepartments ? departments.length : 1}
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total Storage Used</div>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333'}}>
                {canManageAllDepartments 
                  ? formatFileSize(departments.reduce((sum, dept) => sum + (dept.storageUsed || 0), 0))
                  : formatFileSize(currentDepartment?.storageUsed || 0)
                }
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Available Storage</div>
              <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333'}}>
                {canManageAllDepartments 
                  ? formatFileSize(departments.reduce((sum, dept) => sum + dept.storageLimit, 0) - 
                     departments.reduce((sum, dept) => sum + (dept.storageUsed || 0), 0))
                  : formatFileSize((currentDepartment?.storageLimit || 0) - (currentDepartment?.storageUsed || 0))
                }
              </div>
            </div>
          </div>
          
          {/* Department List */}
          <h3 style={{color: '#333', marginBottom: '15px'}}>
            {canManageAllDepartments ? 'All Departments' : 'Your Department'}
          </h3>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '10px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              padding: '15px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
              fontWeight: '600',
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              color: '#333'
            }}>
              <div>Department</div>
              <div>Storage Used</div>
              <div>Limit</div>
              <div>Usage</div>
            </div>
            
            {(canManageAllDepartments ? departments : [currentDepartment]).map(dept => {
              if (!dept) return null;
              const usagePercent = Math.round(((dept.storageUsed || 0) / dept.storageLimit) * 100);
              return (
                <div 
                  key={dept.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '15px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                    alignItems: 'center',
                    backgroundColor: dept.id === currentDepartment?.id ? 'rgba(0, 102, 255, 0.05)' : 'transparent'
                  }}
                >
                  <div style={{fontWeight: '500', color: '#333'}}>
                    {dept.name} ({dept.code})
                    {dept.id === currentDepartment?.id && (
                      <span style={{marginLeft: '10px', fontSize: '12px', color: '#0066ff'}}>Current</span>
                    )}
                  </div>
                  <div style={{color: '#333'}}>{formatFileSize(dept.storageUsed || 0)}</div>
                  <div style={{color: '#666'}}>{formatFileSize(dept.storageLimit)}</div>
                  <div>
                    <div style={{
                      height: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '5px'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor: usagePercent > 90 ? '#ff4444' : 
                                      usagePercent > 75 ? '#ff9900' : '#00cc66',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                    <div style={{fontSize: '12px', color: '#666'}}>{usagePercent}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {activeTab === 'storage' && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '30px',
          borderRadius: '15px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{color: '#333', marginBottom: '20px'}}>💾 Storage Management</h2>
          <p style={{color: '#666', marginBottom: '20px'}}>
            Monitor and manage storage usage for {canManageAllDepartments ? 'all departments' : 'your department'}.
          </p>
          {/* Storage management content will go here */}
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: '10px',
            border: '2px dashed rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{fontSize: '48px', marginBottom: '15px'}}>💾</div>
            <p style={{color: '#666', margin: 0}}>Storage management coming soon...</p>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && canManageAllDepartments && (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '30px',
          borderRadius: '15px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{color: '#333', marginBottom: '20px'}}>⚙️ Department Settings</h2>
          <p style={{color: '#666', marginBottom: '20px'}}>
            Configure department settings, managers, and permissions.
          </p>
          {/* Department settings content will go here */}
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: '10px',
            border: '2px dashed rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{fontSize: '48px', marginBottom: '15px'}}>⚙️</div>
            <p style={{color: '#666', margin: 0}}>Department settings coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;