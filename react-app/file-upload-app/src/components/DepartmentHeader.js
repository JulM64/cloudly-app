import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';

const DepartmentHeader = () => {
  const { 
    currentDepartment, 
    departments, 
    setCurrentDepartment, 
    userRole,
    hasPermission 
  } = useCompany();
  const [showDropdown, setShowDropdown] = useState(false);

  // Only show department switcher if user has permission to view multiple departments
  const canSwitchDepartments = hasPermission('department', 'read') && 
                               (userRole === 'SUPER_ADMIN' || userRole === 'DEPARTMENT_MANAGER');

  const handleDepartmentChange = (deptId) => {
    const selectedDept = departments.find(d => d.id === deptId);
    if (selectedDept) {
      setCurrentDepartment(selectedDept);
      setShowDropdown(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    if (!currentDepartment?.storageLimit) return 0;
    return Math.round((currentDepartment.storageUsed / currentDepartment.storageLimit) * 100);
  };

  if (!currentDepartment) {
    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '25px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        textAlign: 'center'
      }}>
        <h2 style={{color: '#333', marginBottom: '10px'}}>No Department Selected</h2>
        <p style={{color: '#666'}}>Please select a department to continue.</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '25px',
      borderRadius: '15px',
      marginBottom: '30px',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        {/* Left side: Department Info */}
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px'}}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: currentDepartment.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
              boxShadow: `0 4px 15px ${currentDepartment.color}40`
            }}>
              {currentDepartment.code.charAt(0)}
            </div>
            <div>
              <h1 style={{color: '#333', margin: '0 0 5px 0', fontSize: '28px'}}>
                {currentDepartment.name} Department
                <span style={{
                  marginLeft: '10px',
                  fontSize: '14px',
                  color: currentDepartment.color,
                  fontWeight: '600',
                  backgroundColor: `${currentDepartment.color}15`,
                  padding: '4px 10px',
                  borderRadius: '12px'
                }}>
                  {currentDepartment.code}
                </span>
              </h1>
              <p style={{color: '#666', margin: 0, fontSize: '15px'}}>
                {currentDepartment.description || 'Department workspace'}
              </p>
            </div>
          </div>

          {/* Department Stats */}
          <div style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: '10px 15px',
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Storage Used</div>
              <div style={{fontSize: '16px', fontWeight: '600', color: '#333'}}>
                {formatFileSize(currentDepartment.storageUsed)} / {formatFileSize(currentDepartment.storageLimit)}
              </div>
            </div>

            <div style={{
              padding: '10px 15px',
              backgroundColor: 'rgba(0, 0, 0, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Storage Status</div>
              <div style={{fontSize: '16px', fontWeight: '600', color: '#333'}}>
                {getStoragePercentage()}% used
              </div>
            </div>

            {currentDepartment.location && (
              <div style={{
                padding: '10px 15px',
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                borderRadius: '10px',
                border: '1px solid rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{fontSize: '12px', color: '#666', marginBottom: '5px'}}>Location</div>
                <div style={{fontSize: '16px', fontWeight: '600', color: '#333'}}>
                  📍 {currentDepartment.location}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Department Switcher */}
        {canSwitchDepartments && departments.length > 1 && (
          <div style={{position: 'relative'}}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                border: `2px solid ${currentDepartment.color}`,
                color: currentDepartment.color,
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.3s',
                minWidth: '200px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = `${currentDepartment.color}15`;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'white';
              }}
            >
              <span>🏢</span>
              Switch Department
              <span style={{marginLeft: 'auto'}}>▼</span>
            </button>

            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '10px',
                backgroundColor: 'white',
                borderRadius: '10px',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                minWidth: '250px',
                zIndex: 100,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '15px',
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#333'}}>
                    Select Department
                  </div>
                  <div style={{fontSize: '12px', color: '#666'}}>
                    {departments.length} departments available
                  </div>
                </div>

                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {departments.map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => handleDepartmentChange(dept.id)}
                      style={{
                        width: '100%',
                        padding: '15px',
                        border: 'none',
                        backgroundColor: dept.id === currentDepartment.id 
                          ? `${dept.color}15` 
                          : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (dept.id !== currentDepartment.id) {
                          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.03)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (dept.id !== currentDepartment.id) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: dept.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                        {dept.code.charAt(0)}
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '3px'
                        }}>
                          <div style={{
                            fontWeight: '600',
                            color: dept.id === currentDepartment.id ? dept.color : '#333',
                            fontSize: '14px'
                          }}>
                            {dept.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#666'
                          }}>
                            {formatFileSize(dept.storageUsed)} used
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: dept.color,
                            fontWeight: '500'
                          }}>
                            {dept.code}
                          </span>
                          {dept.id === currentDepartment.id && (
                            <span style={{
                              fontSize: '11px',
                              color: '#0066ff',
                              backgroundColor: 'rgba(0, 102, 255, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: '500'
                            }}>
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storage Progress Bar */}
      <div style={{marginTop: '25px'}}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <div style={{fontSize: '14px', color: '#333', fontWeight: '500'}}>
            Department Storage Usage
          </div>
          <div style={{fontSize: '14px', color: '#666'}}>
            {getStoragePercentage()}% used
          </div>
        </div>
        <div style={{
          height: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(getStoragePercentage(), 100)}%`,
            background: `linear-gradient(90deg, ${currentDepartment.color}, ${currentDepartment.color}cc)`,
            borderRadius: '6px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer 2s infinite'
            }}></div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>{formatFileSize(currentDepartment.storageUsed)} used</span>
          <span>{formatFileSize(currentDepartment.storageLimit - currentDepartment.storageUsed)} available</span>
        </div>
      </div>

      {/* Warning for high usage */}
      {getStoragePercentage() > 80 && (
        <div style={{
          marginTop: '15px',
          padding: '12px 15px',
          backgroundColor: getStoragePercentage() > 90 
            ? 'rgba(255, 68, 68, 0.1)' 
            : 'rgba(255, 153, 0, 0.1)',
          color: getStoragePercentage() > 90 ? '#ff4444' : '#ff9900',
          borderRadius: '8px',
          border: `1px solid ${getStoragePercentage() > 90 ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 153, 0, 0.2)'}`,
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{fontSize: '16px'}}>
            {getStoragePercentage() > 90 ? '⚠️' : 'ℹ️'}
          </span>
          <span>
            {getStoragePercentage() > 90 
              ? `Storage is almost full (${getStoragePercentage()}%). Consider freeing up space or requesting more storage.`
              : `Storage usage is high (${getStoragePercentage()}%). Monitor your usage.`
            }
          </span>
        </div>
      )}
    </div>
  );
};

export default DepartmentHeader;