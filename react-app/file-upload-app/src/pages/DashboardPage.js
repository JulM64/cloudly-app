// src/pages/DashboardPage.js - COMPLETE VERSION
import React from 'react';

const DashboardPage = ({ user }) => {
  const stats = [
    { label: 'Total Files', value: '1,247', icon: '📁', color: '#0066ff', change: '+12%' },
    { label: 'Storage Used', value: '3.2 GB', icon: '💾', color: '#4caf50', change: '+5%' },
    { label: 'Team Members', value: '8', icon: '👥', color: '#ff9800', change: '+2' },
    { label: 'Shared Files', value: '156', icon: '🔗', color: '#9c27b0', change: '+23%' }
  ];

  const recentFiles = [
    { name: 'Project_Report.pdf', date: 'Today', size: '2.4 MB', type: '📄', user: 'You' },
    { name: 'Design_Assets.zip', date: 'Yesterday', size: '45 MB', type: '📦', user: 'John Doe' },
    { name: 'Meeting_Notes.docx', date: '2 days ago', size: '1.2 MB', type: '📝', user: 'Jane Smith' },
    { name: 'Dashboard_Data.xlsx', date: '3 days ago', size: '3.8 MB', type: '📊', user: 'You' }
  ];

  const activities = [
    { action: '📤 Uploaded', file: 'Q4_Report.pdf', user: 'You', time: '10:30 AM' },
    { action: '🔗 Shared', file: 'Design_Assets', user: 'John Doe', time: 'Yesterday' },
    { action: '📁 Created', folder: 'Project X', user: 'Jane Smith', time: '2 days ago' },
    { action: '👥 Added', member: 'Alex Johnson', user: 'You', time: '3 days ago' }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ textAlign: 'left' }}>📊 Dashboard</h1>
      <p className="page-description" style={{ textAlign: 'left', marginBottom: '40px' }}>
        Overview of your files, storage, and team activities
      </p>
      
      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="hover-card" style={{
            padding: '25px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            borderTop: `4px solid ${stat.color}`,
            animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>
                  {stat.value}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>{stat.label}</div>
              </div>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ 
                color: stat.change.includes('+') ? '#4caf50' : '#ff4444',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                {stat.change}
              </span>
              <span style={{ fontSize: '12px', color: '#999' }}>from last month</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginTop: '40px' }}>
        {/* Recent Files */}
        <div className="page-card">
          <h3>📁 Recent Files</h3>
          <div className="recent-uploads" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {recentFiles.map((file, index) => (
              <div key={index} className="table-row" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '10px',
                borderLeft: `4px solid ${index === 0 ? '#0066ff' : '#ddd'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '24px' }}>{file.type}</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>{file.name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      {file.date} • {file.size} • {file.user}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-3d" style={{ padding: '8px 16px', fontSize: '14px' }}>
                    Download
                  </button>
                  <button style={{
                    padding: '8px 16px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}>
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-3d" style={{ width: '100%', marginTop: '20px' }}>
            📁 View All Files
          </button>
        </div>

        {/* Recent Activity */}
        <div className="page-card">
          <h3>📝 Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {activities.map((activity, index) => (
              <div key={index} className="table-row" style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: activity.user === 'You' ? '#0066ff' : '#4caf50',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}>
                    {activity.user === 'You' ? user.initials : activity.user.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: '#333' }}>
                      <span style={{ color: '#0066ff' }}>{activity.user}</span> {activity.action}{' '}
                      {activity.file && <span style={{ color: '#666' }}>{activity.file}</span>}
                      {activity.folder && <span style={{ color: '#666' }}>folder "{activity.folder}"</span>}
                      {activity.member && <span style={{ color: '#666' }}>{activity.member} to team</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {activity.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;