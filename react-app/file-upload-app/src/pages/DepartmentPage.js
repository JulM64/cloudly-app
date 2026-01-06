// src/pages/DepartmentPage.js - COMPLETE VERSION
import React, { useState } from 'react';

const DepartmentPage = () => {
  const [departments, setDepartments] = useState([
    { id: 1, name: 'Engineering', manager: 'John Doe', members: 12, projects: 8, status: 'Active', description: 'Software development team' },
    { id: 2, name: 'Marketing', manager: 'Jane Smith', members: 8, projects: 5, status: 'Active', description: 'Marketing and communications' },
    { id: 3, name: 'Sales', manager: 'Bob Johnson', members: 15, projects: 10, status: 'Active', description: 'Sales and customer relations' },
    { id: 4, name: 'HR', manager: 'Alice Brown', members: 6, projects: 3, status: 'Inactive', description: 'Human resources department' },
    { id: 5, name: 'Finance', manager: 'Charlie Wilson', members: 5, projects: 4, status: 'Active', description: 'Finance and accounting' },
  ]);

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    manager: '',
    description: ''
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // Statistics
  const stats = [
    { label: 'Total Departments', value: departments.length, icon: '🏢', color: '#0066ff' },
    { label: 'Active Departments', value: departments.filter(d => d.status === 'Active').length, icon: '✅', color: '#4caf50' },
    { label: 'Total Members', value: departments.reduce((sum, d) => sum + d.members, 0), icon: '👥', color: '#ff9800' },
    { label: 'Total Projects', value: departments.reduce((sum, d) => sum + d.projects, 0), icon: '📋', color: '#9c27b0' }
  ];

  const handleAddDepartment = () => {
    if (newDepartment.name && newDepartment.manager) {
      const newDept = {
        id: departments.length + 1,
        name: newDepartment.name,
        manager: newDepartment.manager,
        members: 0,
        projects: 0,
        status: 'Active',
        description: newDepartment.description || '',
        createdAt: new Date().toLocaleDateString()
      };
      
      setDepartments([...departments, newDept]);
      setNewDepartment({ name: '', manager: '', description: '' });
    }
  };

  const handleDeleteDepartment = (id) => {
    setDepartments(departments.filter(dept => dept.id !== id));
  };

  const handleEditDepartment = (id) => {
    const dept = departments.find(d => d.id === id);
    setEditingId(id);
    setEditData({ ...dept });
  };

  const handleSaveEdit = () => {
    setDepartments(departments.map(dept => 
      dept.id === editingId ? { ...dept, ...editData } : dept
    ));
    setEditingId(null);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const toggleDepartmentStatus = (id) => {
    setDepartments(departments.map(dept => 
      dept.id === id 
        ? { ...dept, status: dept.status === 'Active' ? 'Inactive' : 'Active' }
        : dept
    ));
  };

  const addMember = (id) => {
    setDepartments(departments.map(dept => 
      dept.id === id 
        ? { ...dept, members: dept.members + 1 }
        : dept
    ));
  };

  const removeMember = (id) => {
    setDepartments(departments.map(dept => 
      dept.id === id && dept.members > 0
        ? { ...dept, members: dept.members - 1 }
        : dept
    ));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 className="section-title" style={{ textAlign: 'left', marginBottom: '10px' }}>🏢 Department Management</h1>
      <p className="page-description" style={{ textAlign: 'left', marginBottom: '40px' }}>
        Create, manage, and organize departments within your organization
      </p>

      {/* Stats Overview */}
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
          </div>
        ))}
      </div>

      {/* Add New Department Form */}
      <div className="page-card" style={{ marginBottom: '30px' }}>
        <h3>➕ Add New Department</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Department Name</label>
            <input
              type="text"
              placeholder="e.g., Engineering"
              value={newDepartment.name}
              onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
              className="hover-card"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Manager</label>
            <input
              type="text"
              placeholder="e.g., John Doe"
              value={newDepartment.manager}
              onChange={(e) => setNewDepartment({...newDepartment, manager: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
              className="hover-card"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Description</label>
            <input
              type="text"
              placeholder="Optional description"
              value={newDepartment.description}
              onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
              className="hover-card"
            />
          </div>
          <button
            onClick={handleAddDepartment}
            className="btn-3d"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              height: '40px'
            }}
          >
            Add Department
          </button>
        </div>
      </div>

      {/* Departments Table */}
      <div className="page-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>📋 Department List</h3>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {departments.length} departments total
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>ID</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Department</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Manager</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Members</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Projects</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id} className="table-row" style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}>{dept.id}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    {editingId === dept.id ? (
                      <input
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '100%'
                        }}
                      />
                    ) : (
                      <div>
                        <div style={{ fontWeight: '500' }}>{dept.name}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {dept.description}
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {editingId === dept.id ? (
                      <input
                        value={editData.manager}
                        onChange={(e) => setEditData({...editData, manager: e.target.value})}
                        style={{
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          width: '100%'
                        }}
                      />
                    ) : dept.manager}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span>{dept.members}</span>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => addMember(dept.id)}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeMember(dept.id)}
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          -
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>{dept.projects}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      onClick={() => !editingId && toggleDepartmentStatus(dept.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        backgroundColor: dept.status === 'Active' ? '#e7f7ef' : '#ffeaea',
                        color: dept.status === 'Active' ? '#4caf50' : '#ff4444',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: editingId ? 'default' : 'pointer',
                        display: 'inline-block',
                        transition: 'all 0.3s'
                      }}
                    >
                      {dept.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {editingId === dept.id ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditDepartment(dept.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#0066ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
          <h3 style={{ color: '#333', marginBottom: '15px' }}>🚀 Quick Actions</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn-3d" style={{ padding: '10px 20px' }}>
              📥 Import Departments
            </button>
            <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#4caf50' }}>
              📊 View Analytics
            </button>
            <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#ff9800' }}>
              📋 Generate Report
            </button>
            <button className="btn-3d" style={{ padding: '10px 20px', backgroundColor: '#9c27b0' }}>
              👥 Assign Members
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentPage;