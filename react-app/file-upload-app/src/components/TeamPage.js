import React from 'react';
import { useUser } from '../contexts/UserContext';

const TeamPage = () => {
  const { user } = useUser();
  
  const teamMembers = [
    { id: 1, name: 'John Smith', role: 'Developer', email: 'john@example.com', status: 'Online' },
    { id: 2, name: 'Sarah Johnson', role: 'Designer', email: 'sarah@example.com', status: 'Away' },
    { id: 3, name: 'Mike Wilson', role: 'Manager', email: 'mike@example.com', status: 'Offline' },
    { id: 4, name: 'Emma Davis', role: 'Analyst', email: 'emma@example.com', status: 'Online' },
  ];

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: '40px',
      borderRadius: '15px',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      <h1 style={{ color: '#333', marginBottom: '20px' }}>👥 Team Directory</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Welcome, {user?.firstName}! Manage your team members here.
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {teamMembers.map(member => (
          <div key={member.id} style={{
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '10px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
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
                backgroundColor: '#667eea',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 style={{ margin: '0 0 5px 0' }}>{member.name}</h3>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{member.role}</p>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '15px'
            }}>
              <span style={{ fontSize: '14px', color: '#666' }}>{member.email}</span>
              <span style={{
                padding: '4px 10px',
                backgroundColor: member.status === 'Online' ? 'rgba(0, 204, 102, 0.1)' : 
                                 member.status === 'Away' ? 'rgba(255, 153, 0, 0.1)' : 
                                 'rgba(153, 153, 153, 0.1)',
                color: member.status === 'Online' ? '#00cc66' : 
                       member.status === 'Away' ? '#ff9900' : '#999',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {member.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamPage;