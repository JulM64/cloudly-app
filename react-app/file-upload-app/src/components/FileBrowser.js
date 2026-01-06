import React, { useState } from 'react';
import { useCompany } from '../contexts/CompanyContext';

const FileBrowser = () => {
  const { userRole, hasPermission, currentDepartment, getAccessibleDepartments } = useCompany();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock files data
  const mockFiles = [
    { id: 1, name: 'Q4 Financial Report.pdf', size: 5242880, type: 'pdf', category: 'financial', uploadedBy: 'John Doe', uploadedAt: '2024-01-15', department: 'FIN' },
    { id: 2, name: 'Employee Handbook.docx', size: 2097152, type: 'docx', category: 'hr', uploadedBy: 'Sarah Johnson', uploadedAt: '2024-01-10', department: 'HR' },
    { id: 3, name: 'Marketing Campaign Plan.pptx', size: 7340032, type: 'pptx', category: 'marketing', uploadedBy: 'Jessica Williams', uploadedAt: '2024-01-12', department: 'MKT' },
    { id: 4, name: 'Network Architecture Diagram.png', size: 1572864, type: 'png', category: 'it', uploadedBy: 'Michael Chen', uploadedAt: '2024-01-08', department: 'IT' },
    { id: 5, name: 'Sales Target Spreadsheet.xlsx', size: 3145728, type: 'xlsx', category: 'sales', uploadedBy: 'David Brown', uploadedAt: '2024-01-05', department: 'SALES' },
    { id: 6, name: 'Project Timeline.mpp', size: 4194304, type: 'mpp', category: 'projects', uploadedBy: 'Alex Smith', uploadedAt: '2024-01-03', department: 'IT' },
    { id: 7, name: 'Company Logo.ai', size: 8388608, type: 'ai', category: 'design', uploadedBy: 'Lisa Wang', uploadedAt: '2024-01-01', department: 'MKT' },
    { id: 8, name: 'Security Policy.pdf', size: 1048576, type: 'pdf', category: 'security', uploadedBy: 'Robert Kim', uploadedAt: '2023-12-28', department: 'IT' },
  ];

  const categories = [
    { id: 'all', name: 'All Files', icon: '📁', color: '#666' },
    { id: 'financial', name: 'Financial', icon: '💰', color: '#4ECDC4' },
    { id: 'hr', name: 'HR', icon: '👥', color: '#FF6B6B' },
    { id: 'marketing', name: 'Marketing', icon: '📢', color: '#96CEB4' },
    { id: 'it', name: 'IT', icon: '💻', color: '#45B7D1' },
    { id: 'sales', name: 'Sales', icon: '📈', color: '#FFEAA7' },
    { id: 'projects', name: 'Projects', icon: '📋', color: '#0066ff' },
    { id: 'design', name: 'Design', icon: '🎨', color: '#9c27b0' },
    { id: 'security', name: 'Security', icon: '🔒', color: '#ff4444' },
  ];

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return '📎';
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📕',
      doc: '📄', docx: '📄',
      xls: '📊', xlsx: '📊',
      ppt: '📽️', pptx: '📽️',
      jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      txt: '📝', md: '📝',
      zip: '🗜️', rar: '🗜️', '7z': '🗜️',
      mp4: '🎬', mov: '🎬', avi: '🎬',
      ai: '🎨', psd: '🎨',
      mpp: '📋'
    };
    return icons[ext] || '📎';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Only allow Department Managers and Super Admins
  if (!hasPermission('file', 'read')) {
    return (
      <div className="upload-wrapper">
        <h1 className="section-title" style={{ color: '#333' }}>File Browser</h1>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 68, 68, 0.1)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 68, 68, 0.3)'
        }}>
          <h3 style={{color: '#ff4444'}}>Access Denied</h3>
          <p>You need appropriate permissions to access the file browser.</p>
        </div>
      </div>
    );
  }

  const filteredFiles = mockFiles.filter(file => {
    // Search filter
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Category filter
    if (selectedCategory !== 'all' && file.category !== selectedCategory) {
      return false;
    }
    
    // Department filter - Only show files from accessible departments
    const accessibleDepartments = getAccessibleDepartments();
    if (!accessibleDepartments.some(dept => dept.code === file.department)) {
      return false;
    }
    
    return true;
  });

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
          🔍 File Browser
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Browse and search files across {userRole === 'SUPER_ADMIN' ? 'all departments' : `${currentDepartment?.name} department`}
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
              Search Files
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by file name, type, or uploader..."
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
              Total Files
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
              {filteredFiles.length}
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div>
          <label style={{display: 'block', marginBottom: '15px', fontWeight: '600', color: '#333'}}>
            Filter by Category
          </label>
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: selectedCategory === category.id ? category.color : 'rgba(0, 0, 0, 0.05)',
                  color: selectedCategory === category.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s'
                }}
              >
                <span>{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Files Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {filteredFiles.length === 0 ? (
          <div style={{
            gridColumn: '1/-1',
            padding: '60px 40px',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '15px',
            border: '2px dashed rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{fontSize: '64px', marginBottom: '20px', opacity: 0.5}}>📁</div>
            <h3 style={{color: '#333', marginBottom: '15px'}}>No files found</h3>
            <p style={{color: '#666', marginBottom: '25px'}}>
              {searchQuery 
                ? `No files match "${searchQuery}". Try a different search term.`
                : 'No files available in this category.'
              }
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
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
          filteredFiles.map(file => {
            const category = categories.find(c => c.id === file.category) || categories[0];
            return (
              <div
                key={file.id}
                className="hover-card"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '15px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  padding: '25px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onClick={() => {
                  alert(`File Details:\n\nName: ${file.name}\nSize: ${formatFileSize(file.size)}\nType: ${file.type.toUpperCase()}\nCategory: ${category.name}\nUploaded by: ${file.uploadedBy}\nUploaded: ${formatDate(file.uploadedAt)}\nDepartment: ${file.department}`);
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '10px',
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    {getFileIcon(file.name)}
                  </div>
                  <div style={{flex: 1}}>
                    <div style={{
                      fontWeight: '600',
                      color: '#333',
                      fontSize: '16px',
                      marginBottom: '5px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.name}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '15px'
                }}>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: `${category.color}15`,
                    color: category.color,
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <span>{category.icon}</span>
                    {category.name}
                  </div>

                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    color: '#666',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {file.department} Dept
                  </div>
                </div>

                <div style={{
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: '1.5'
                }}>
                  <div style={{marginBottom: '5px'}}>
                    <strong>Uploaded by:</strong> {file.uploadedBy}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(file.uploadedAt)}
                  </div>
                </div>

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
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(`Downloading ${file.name}...`);
                    }}
                  >
                    📥 Download
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
        <h3 style={{color: '#333', marginBottom: '20px'}}>📊 File Statistics</h3>
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
              {filteredFiles.length}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Total Files</div>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(0, 204, 102, 0.05)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#00cc66', marginBottom: '5px'}}>
              {formatFileSize(filteredFiles.reduce((sum, file) => sum + file.size, 0))}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Total Size</div>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(156, 39, 176, 0.05)',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#9c27b0', marginBottom: '5px'}}>
              {categories.length}
            </div>
            <div style={{fontSize: '14px', color: '#333'}}>Categories</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowser;