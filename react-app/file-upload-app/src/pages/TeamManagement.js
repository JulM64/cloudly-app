import React, { useState } from 'react';

const TeamManagement = ({ user }) => {
  const [teamMembers] = useState([
    { id: 1, name: 'Alex Johnson', email: 'alex@company.com', role: 'SUPER_ADMIN', department: 'Engineering', status: 'active' },
    { id: 2, name: 'Sarah Williams', email: 'sarah@company.com', role: 'TEAM_MANAGER', department: 'Marketing', status: 'active' },
    // ... more members
  ]);

  return (
    <div className="upload-wrapper">
      <h1 className="section-title">👥 Team Collaboration</h1>
      <p className="page-description">
        Manage team members, track activity, and facilitate collaboration
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '25px',
        marginBottom: '30px'
      }}>
        {teamMembers.map(member => (
          <div key={member.id} className="hover-card" style={{
            padding: '25px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <h3>{member.name}</h3>
            {/* Member details */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamManagement;