// src/pages/DepartmentPage.js - HIERARCHICAL VERSION
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const DepartmentPage = () => {
  const [departments, setDepartments] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'tree'

  const [newDepartment, setNewDepartment] = useState({
    name: '',
    manager: '',
    description: '',
    type: 'department', // 'department' or 'unit'
    parentId: null
  });

  // Load departments from backend
  const loadDepartments = async () => {
    try {
      console.log('📂 Loading departments from backend...');
      setLoading(true);
      const response = await apiService.getDepartments();
      console.log('✅ Departments loaded:', response);
      setDepartments(response.departments || []);
      
      // Build hierarchy
      buildHierarchy(response.departments || []);
    } catch (error) {
      console.error('❌ Error loading departments:', error);
      alert('Failed to load departments: ' + error.message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  // Build hierarchy tree
  const buildHierarchy = (depts) => {
    const topLevel = depts.filter(d => !d.parentId);
    
    const buildTree = (parentId) => {
      return depts
        .filter(d => d.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(dept => ({
          ...dept,
          children: buildTree(dept.id)
        }));
    };
    
    const tree = topLevel
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(dept => ({
        ...dept,
        children: buildTree(dept.id)
      }));
    
    setHierarchy(tree);
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Statistics
  const stats = [
    { 
      label: 'Total Departments', 
      value: departments.filter(d => d.type === 'department').length, 
      icon: '🏢', 
      color: '#0066ff'
    },
    { 
      label: 'Total Units', 
      value: departments.filter(d => d.type === 'unit').length, 
      icon: '📦', 
      color: '#9c27b0'
    },
    { 
      label: 'Active', 
      value: departments.filter(d => d.status === 'Active').length, 
      icon: '✅', 
      color: '#4caf50'
    },
    { 
      label: 'Total Members', 
      value: departments.reduce((sum, d) => sum + (d.members || 0), 0), 
      icon: '👥', 
      color: '#ff9800'
    }
  ];

  // Add new department/unit
  const handleAddDepartment = async () => {
    if (!newDepartment.name || !newDepartment.manager) {
      alert('Please enter both name and manager');
      return;
    }

    if (newDepartment.type === 'unit' && !newDepartment.parentId) {
      alert('Please select a parent department for this unit');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await apiService.createDepartment({
        name: newDepartment.name,
        manager: newDepartment.manager,
        description: newDepartment.description,
        type: newDepartment.type,
        parentId: newDepartment.parentId
      });
      
      console.log('✅ Department/Unit created:', response);
      await loadDepartments();
      setNewDepartment({ name: '', manager: '', description: '', type: 'department', parentId: null });
      setShowAddModal(false);
      alert(`✅ ${newDepartment.type === 'department' ? 'Department' : 'Unit'} created successfully!`);
    } catch (error) {
      console.error('❌ Error creating:', error);
      alert('Failed to create: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    // Check if has children
    const hasChildren = departments.some(d => d.parentId === id);
    if (hasChildren) {
      alert('Cannot delete: This department/unit has sub-units. Please delete child units first.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this?')) {
      return;
    }
    
    try {
      setLoading(true);
      await apiService.deleteDepartment(id);
      await loadDepartments();
      alert('Deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting:', error);
      alert('Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate Report
  const generateReport = () => {
    const reportDate = new Date().toLocaleDateString();
    const reportContent = `
CLOUDLY - ORGANIZATIONAL STRUCTURE REPORT
Generated: ${reportDate}

===========================================
SUMMARY
===========================================
Total Departments: ${departments.filter(d => d.type === 'department').length}
Total Units: ${departments.filter(d => d.type === 'unit').length}
Active: ${departments.filter(d => d.status === 'Active').length}
Total Members: ${departments.reduce((sum, d) => sum + (d.members || 0), 0)}

===========================================
ORGANIZATIONAL HIERARCHY
===========================================
${hierarchy.map(dept => {
  let output = `\n📁 ${dept.name} (${dept.type.toUpperCase()})\n`;
  output += `   Manager: ${dept.manager}\n`;
  output += `   Status: ${dept.status}\n`;
  output += `   Members: ${dept.members || 0}\n`;
  
  if (dept.children && dept.children.length > 0) {
    dept.children.forEach(unit => {
      output += `   └─ 📦 ${unit.name}\n`;
      output += `      Manager: ${unit.manager}\n`;
      output += `      Members: ${unit.members || 0}\n`;
    });
  }
  
  return output;
}).join('\n')}

===========================================
END OF REPORT
===========================================
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `org-structure-${reportDate.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('📋 Report downloaded successfully!');
  };

  // Render tree view
  const renderTree = (nodes, level = 0) => {
    return nodes.map(node => (
      <div key={node.id} style={{ marginLeft: `${level * 30}px`, marginBottom: '10px' }}>
        <div style={{
          padding: '15px',
          backgroundColor: node.type === 'department' ? '#e3f2fd' : '#f3e5f5',
          borderRadius: '8px',
          borderLeft: `4px solid ${node.type === 'department' ? '#0066ff' : '#9c27b0'}`,
          marginBottom: '5px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '5px' }}>
                {node.type === 'department' ? '🏢' : '📦'} {node.name}
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                👤 {node.manager} • {node.members || 0} members
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleDeleteDepartment(node.id)}
                disabled={loading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
        {node.children && node.children.length > 0 && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
          🏢 Organizational Structure
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'tree' : 'list')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {viewMode === 'list' ? '🌲 Tree View' : '📋 List View'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066ff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(0,102,255,0.2)'
            }}
          >
            ➕ Add Department/Unit
          </button>
        </div>
      </div>
      
      <p style={{ marginBottom: '40px', color: '#666' }}>
        Manage your organizational hierarchy: DSI → Departments → Units
      </p>

      {initialLoad && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '24px' }}>⏳ Loading...</div>
        </div>
      )}

      {!initialLoad && (
        <>
          {/* Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            {stats.map((stat, index) => (
              <div key={index} style={{
                padding: '25px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                borderTop: `4px solid ${stat.color}`,
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
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

          {/* Main Content */}
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>
              {viewMode === 'tree' ? '🌲 Organizational Tree' : '📋 All Departments & Units'}
            </h3>

            {departments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏢</div>
                <div style={{ fontSize: '18px' }}>No structure yet</div>
                <div style={{ fontSize: '14px', marginTop: '10px' }}>
                  Click "Add Department/Unit" to start building your organization
                </div>
              </div>
            ) : viewMode === 'tree' ? (
              <div>{renderTree(hierarchy)}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Type</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Parent</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Manager</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Members</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(dept => {
                      const parent = departments.find(d => d.id === dept.parentId);
                      return (
                        <tr key={dept.id} style={{ 
                          borderBottom: '1px solid #f0f0f0',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '500' }}>
                              {dept.type === 'department' ? '🏢' : '📦'} {dept.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#888' }}>{dept.description}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              backgroundColor: dept.type === 'department' ? '#e3f2fd' : '#f3e5f5',
                              color: dept.type === 'department' ? '#0066ff' : '#9c27b0',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {dept.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                            {parent ? parent.name : '-'}
                          </td>
                          <td style={{ padding: '12px' }}>{dept.manager}</td>
                          <td style={{ padding: '12px' }}>{dept.members || 0}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              backgroundColor: dept.status === 'Active' ? '#e7f7ef' : '#ffeaea',
                              color: dept.status === 'Active' ? '#4caf50' : '#ff4444',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {dept.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              onClick={() => handleDeleteDepartment(dept.id)}
                              disabled={loading}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ff4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick Actions */}
            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f0f7ff', borderRadius: '8px' }}>
              <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '18px', fontWeight: '600' }}>🚀 Quick Actions</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: '#4caf50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: '0 4px 6px rgba(76,175,80,0.2)'
                  }}
                  onClick={() => setShowAnalytics(true)}
                >
                  📊 View Analytics
                </button>
                <button 
                  style={{ 
                    padding: '10px 20px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: '0 4px 6px rgba(255,152,0,0.2)'
                  }}
                  onClick={generateReport}
                >
                  📋 Generate Report
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '600' }}>➕ Add Department/Unit</h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Type *</label>
              <select
                value={newDepartment.type}
                onChange={(e) => setNewDepartment({...newDepartment, type: e.target.value, parentId: null})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              >
                <option value="department">Department (Top Level)</option>
                <option value="unit">Unit (Under Department)</option>
              </select>
            </div>

            {newDepartment.type === 'unit' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Parent Department *</label>
                <select
                  value={newDepartment.parentId || ''}
                  onChange={(e) => setNewDepartment({...newDepartment, parentId: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select parent department...</option>
                  {departments.filter(d => d.type === 'department').map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Name *</label>
              <input
                type="text"
                placeholder="e.g., DIP, UDP, etc."
                value={newDepartment.name}
                onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Manager *</label>
              <input
                type="text"
                placeholder="Manager name"
                value={newDepartment.manager}
                onChange={(e) => setNewDepartment({...newDepartment, manager: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
              <input
                type="text"
                placeholder="Optional"
                value={newDepartment.description}
                onChange={(e) => setNewDepartment({...newDepartment, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddDepartment}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#0066ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Creating...' : '➕ Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentPage;