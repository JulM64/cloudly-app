import React from 'react';
import { useCompany } from '../contexts/CompanyContext';

const NavigationGuard = ({ children, requiredPermission, requiredRole, targetDepartmentId }) => {
  const { hasPermission, userRole, isLoading } = useCompany();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(0, 0, 0, 0.1)',
          borderTop: '3px solid #0066ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && userRole !== requiredRole) {
    // Check if user has higher role
    const roleHierarchy = {
      'CONTRACTOR': 0,
      'VIEWER': 1,
      'EMPLOYEE': 2,
      'TEAM_LEADER': 3,
      'DEPARTMENT_MANAGER': 4,
      'SUPER_ADMIN': 5
    };
    
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    if (userLevel < requiredLevel) {
      return (
        <AccessDenied 
          title="Insufficient Role"
          message={`You need ${requiredRole} role or higher to access this page.`}
        />
      );
    }
  }

  // Check permission requirement
  if (requiredPermission) {
    const [resource, action] = requiredPermission.split('.');
    if (!hasPermission(resource, action, targetDepartmentId)) {
      return (
        <AccessDenied 
          title="Permission Denied"
          message={`You don't have permission to ${action} ${resource}.`}
        />
      );
    }
  }

  return <>{children}</>;
};

const AccessDenied = ({ title, message }) => (
  <div className="upload-wrapper">
    <div style={{
      padding: '40px',
      textAlign: 'center',
      backgroundColor: 'rgba(255, 68, 68, 0.1)',
      borderRadius: '15px',
      border: '1px solid rgba(255, 68, 68, 0.3)',
      marginTop: '30px'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
      <h3 style={{ color: '#ff4444', marginBottom: '15px' }}>{title}</h3>
      <p style={{ color: '#666', marginBottom: '25px' }}>{message}</p>
      <button
        onClick={() => window.history.back()}
        className="btn-3d"
        style={{
          padding: '12px 24px',
          backgroundColor: '#0066ff',
          color: 'white'
        }}
      >
        Go Back
      </button>
    </div>
  </div>
);

export default NavigationGuard;