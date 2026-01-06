import React from 'react';
import { useUser } from '../contexts/UserContext';

const DepartmentsPage = () => {
  const { user } = useUser();
  
  const departments = [
    { id: 1, name: 'Engineering', members: 12, storage: '45.2 GB', color: '#667eea' },
    { id: 2, name: 'Marketing', members: 8, storage: '23.1 GB', color: '#f093fb' },
    { id: 3, name: 'Sales', members: 15, storage: '18.7 GB', color: '#4facfe' },
    { id: 4, name: 'HR', members: 6, storage: '12.3 GB', color: '#43e97b' },
  ];

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '40px',
      borderRadius: '15px',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>🏢 Departments</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Welcome, {user?.firstName}! Manage departments and storage allocation.
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {departments.map(dept => (
          <div key={dept.id} style={{
            padding: '25px',
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            borderLeft: `5px solid ${dept.color}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '15px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: `${dept.color}20`,
                color: dept.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '20px'
              }}>
                {dept.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{dept.name}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  {dept.members} members
                </p>
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '14px'
              }}>
                <span>Storage Used</span>
                <span style={{ fontWeight: '600' }}>{dept.storage}</span>
              </div>
              <div style={{
                height: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: '65%',
                  backgroundColor: dept.color,
                  borderRadius: '4px'
                }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsPage;