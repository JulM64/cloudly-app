import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';

const client = generateClient();

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    return {
      companyName: "Cloudly",
      currentUser: null,
      currentDepartment: null,
      userRole: 'EMPLOYEE',
      userPermissions: {},
      departments: [],
      roles: [],
      companySettings: {},
      isLoading: false,
      hasPermission: () => false,
      canAccessDepartment: () => false,
      canUploadToDepartment: () => false,
      setCurrentDepartment: () => {},
      updateDepartmentStorage: () => {},
      loadCompanyData: () => {},
      getUserRoleDisplay: () => 'Employee',
      getRoleColor: () => '#666',
      refreshData: () => {}
    };
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [companyName, setCompanyName] = useState("Cloudly");
  const [currentUser, setCurrentUser] = useState(null);
  const [currentDepartment, setCurrentDepartment] = useState(null);
  const [userRole, setUserRole] = useState('EMPLOYEE');
  const [userPermissions, setUserPermissions] = useState({});
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // System permissions matrix
  const systemPermissions = {
    SUPER_ADMIN: {
      department: { read: true, manage: true, create: true, delete: true },
      file: { upload: true, download: true, delete: true, share: true, view: true },
      user: { read: true, manage: true, create: true, delete: true },
      role: { read: true, manage: true, create: true, delete: true },
      settings: { read: true, update: true },
      audit: { read: true },
      reports: { read: true, generate: true }
    },
    DEPARTMENT_MANAGER: {
      department: { read: true, manage: true, create: false, delete: false },
      file: { upload: true, download: true, delete: true, share: true, view: true },
      user: { read: true, manage: true, create: true, delete: false },
      role: { read: false, manage: false, create: false, delete: false },
      settings: { read: true, update: false },
      audit: { read: false },
      reports: { read: true, generate: false }
    },
    TEAM_LEADER: {
      department: { read: true, manage: false, create: false, delete: false },
      file: { upload: true, download: true, delete: true, share: true, view: true },
      user: { read: true, manage: false, create: false, delete: false },
      role: { read: false, manage: false, create: false, delete: false },
      settings: { read: false, update: false },
      audit: { read: false },
      reports: { read: false, generate: false }
    },
    EMPLOYEE: {
      department: { read: true, manage: false, create: false, delete: false },
      file: { upload: true, download: true, delete: false, share: false, view: true },
      user: { read: false, manage: false, create: false, delete: false },
      role: { read: false, manage: false, create: false, delete: false },
      settings: { read: false, update: false },
      audit: { read: false },
      reports: { read: false, generate: false }
    },
    VIEWER: {
      department: { read: true, manage: false, create: false, delete: false },
      file: { upload: false, download: true, delete: false, share: false, view: true },
      user: { read: false, manage: false, create: false, delete: false },
      role: { read: false, manage: false, create: false, delete: false },
      settings: { read: false, update: false },
      audit: { read: false },
      reports: { read: false, generate: false }
    },
    CONTRACTOR: {
      department: { read: false, manage: false, create: false, delete: false },
      file: { upload: false, download: true, delete: false, share: false, view: false },
      user: { read: false, manage: false, create: false, delete: false },
      role: { read: false, manage: false, create: false, delete: false },
      settings: { read: false, update: false },
      audit: { read: false },
      reports: { read: false, generate: false }
    }
  };

  useEffect(() => {
    console.log('CompanyProvider: Initializing...');
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      setIsLoading(true);
      console.log('CompanyProvider: Loading company data...');
      
      // Get authenticated user
      const user = await getCurrentUser();
      console.log('CompanyProvider: User authenticated:', user.username);
      
      // Set user as SUPER_ADMIN for now (hardcoded)
      // In production, this would fetch from GraphQL
      setUserRole('SUPER_ADMIN');
      setUserPermissions(systemPermissions.SUPER_ADMIN);
      
      // Load mock data
      await loadMockData(user);
      
      console.log('CompanyProvider: Data loaded successfully');
      
    } catch (error) {
      console.error('CompanyProvider: Error loading company data:', error);
      // Set defaults on error
      setDefaults();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = async (user) => {
    // Mock departments
    const mockDepartments = [
      { 
        id: 'dept-hr', 
        name: 'Human Resources', 
        code: 'HR', 
        description: 'Recruitment, payroll, employee relations',
        managerId: 'user-hr-manager',
        storageLimit: 5368709120,
        storageUsed: 1073741824,
        location: 'Floor 3',
        color: '#FF6B6B',
        icon: '👥'
      },
      { 
        id: 'dept-finance', 
        name: 'Finance', 
        code: 'FIN', 
        description: 'Accounting, budgeting, financial reporting',
        managerId: 'user-finance-manager',
        storageLimit: 10737418240,
        storageUsed: 3221225472,
        location: 'Floor 4',
        color: '#4ECDC4',
        icon: '💰'
      },
      { 
        id: 'dept-it', 
        name: 'Information Technology', 
        code: 'IT', 
        description: 'IT infrastructure, support, security',
        managerId: 'user-it-manager',
        storageLimit: 21474836480,
        storageUsed: 8589934592,
        location: 'Floor 5',
        color: '#45B7D1',
        icon: '💻'
      },
      { 
        id: 'dept-marketing', 
        name: 'Marketing', 
        code: 'MKT', 
        description: 'Marketing campaigns, branding, social media',
        managerId: 'user-marketing-manager',
        storageLimit: 5368709120,
        storageUsed: 2147483648,
        location: 'Floor 2',
        color: '#96CEB4',
        icon: '📢'
      },
      { 
        id: 'dept-sales', 
        name: 'Sales', 
        code: 'SALES', 
        description: 'Sales operations, client management',
        managerId: 'user-sales-manager',
        storageLimit: 5368709120,
        storageUsed: 1073741824,
        location: 'Floor 1',
        color: '#FFEAA7',
        icon: '📈'
      }
    ];
    
    // Mock roles
    const mockRoles = [
      {
        id: 'role-super-admin',
        name: 'Super Administrator',
        description: 'Full system access. Can manage everything.',
        isSystemRole: true,
        color: '#9c27b0',
        icon: '👑',
        userCount: 1
      },
      {
        id: 'role-department-manager',
        name: 'Department Manager',
        description: 'Full access to their department. Can manage department users and files.',
        isSystemRole: true,
        color: '#0066ff',
        icon: '🏢',
        userCount: 5
      },
      {
        id: 'role-team-leader',
        name: 'Team Leader',
        description: 'Extended permissions within their team. Can upload, share, and manage team files.',
        isSystemRole: true,
        color: '#00cc66',
        icon: '👨‍💼',
        userCount: 10
      },
      {
        id: 'role-employee',
        name: 'Employee',
        description: 'Standard user. Can upload and manage their own files.',
        isSystemRole: true,
        color: '#666',
        icon: '👤',
        userCount: 50
      },
      {
        id: 'role-viewer',
        name: 'Viewer',
        description: 'Read-only access. Can view files but cannot modify.',
        isSystemRole: true,
        color: '#ff9900',
        icon: '👁️',
        userCount: 5
      },
      {
        id: 'role-contractor',
        name: 'Contractor',
        description: 'Limited access for external contractors. Restricted file access.',
        isSystemRole: true,
        color: '#ff6600',
        icon: '👷',
        userCount: 3
      },
      {
        id: 'role-finance-manager',
        name: 'Finance Manager',
        description: 'Custom role for finance department with specific permissions.',
        isSystemRole: false,
        color: '#4ECDC4',
        icon: '💰',
        userCount: 2,
        customPermissions: {
          department: { read: true, manage: true },
          file: { upload: true, download: true, delete: true, share: true },
          user: { read: true, manage: true },
          financial: { view: true, edit: true, approve: true }
        }
      }
    ];
    
    // Set data
    setCompanyName("Cloudly");
    setDepartments(mockDepartments);
    setRoles(mockRoles);
    
    // Set IT as default department
    const itDepartment = mockDepartments.find(d => d.code === 'IT') || mockDepartments[2];
    setCurrentDepartment(itDepartment);
    
    // Set current user with full data
    setCurrentUser({
      ...user,
      id: 'user-julien',
      firstName: 'Julien',
      lastName: 'Mveng',
      email: user.username,
      role: 'SUPER_ADMIN',
      roleId: 'role-super-admin',
      departmentId: itDepartment.id,
      department: itDepartment,
      jobTitle: 'System Administrator',
      status: 'ACTIVE',
      avatar: null,
      phone: null,
      extension: '1001',
      employeeId: 'EMP001',
      hireDate: '2024-01-01',
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00Z'
    });
    
    // Set company settings
    setCompanySettings({
      maxFileSize: 104857600, // 100MB
      allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.png', '.txt', '.zip'],
      defaultStorageLimit: 10737418240, // 10GB
      retentionPolicy: 'FIVE_YEARS',
      autoArchive: true,
      maxUsers: 1000,
      companyLogo: '/cloudly-logo-simplified01.png',
      theme: 'light',
      languages: ['en', 'fr'],
      timezones: ['UTC', 'America/New_York', 'Europe/Paris'],
      security: {
        requireTwoFactor: false,
        passwordExpiryDays: 90,
        sessionTimeoutMinutes: 60
      }
    });
  };

  const setDefaults = () => {
    setCompanyName("Cloudly");
    setUserRole('EMPLOYEE');
    setUserPermissions(systemPermissions.EMPLOYEE);
    
    const defaultDepartments = [
      { 
        id: 'dept-default', 
        name: 'Default Department', 
        code: 'DEF', 
        storageLimit: 1073741824,
        storageUsed: 0,
        color: '#0066ff'
      }
    ];
    
    setDepartments(defaultDepartments);
    setCurrentDepartment(defaultDepartments[0]);
    setRoles([]);
    
    setCompanySettings({
      maxFileSize: 104857600,
      allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.png', '.txt']
    });
  };

  const refreshData = async () => {
    console.log('Refreshing company data...');
    await loadCompanyData();
  };

  // Permission checking functions
  const hasPermission = (resource, action, targetDepartmentId = null) => {
    // Super admin has all permissions
    if (userRole === 'SUPER_ADMIN') {
      return true;
    }
    
    // Check department access if specified
    if (targetDepartmentId && !canAccessDepartment(targetDepartmentId)) {
      return false;
    }
    
    // Check custom permissions first (for custom roles)
    if (currentUser?.customPermissions?.[resource]?.[action] !== undefined) {
      return currentUser.customPermissions[resource][action];
    }
    
    // Check system permissions
    const permissions = userPermissions[resource];
    if (!permissions) {
      return false;
    }
    
    return permissions[action] === true;
  };

  const canAccessDepartment = (departmentId) => {
    // Super admin can access all departments
    if (userRole === 'SUPER_ADMIN') return true;
    
    // Check if user has access to specific department
    // This would check user's assigned departments in a real system
    return departmentId === currentDepartment?.id;
  };

  const canUploadToDepartment = (departmentId, fileSize) => {
    // Check basic permissions
    if (!hasPermission('file', 'upload', departmentId)) {
      return false;
    }
    
    // Check department access
    if (!canAccessDepartment(departmentId)) {
      return false;
    }
    
    // Check file size limit
    if (fileSize > companySettings.maxFileSize) {
      return false;
    }
    
    // Check department storage limit
    const dept = departments.find(d => d.id === departmentId);
    if (!dept) return false;
    
    if (dept.storageUsed + fileSize > dept.storageLimit) {
      return false;
    }
    
    return true;
  };

  const updateDepartmentStorage = (departmentId, fileSize) => {
    setDepartments(prev => prev.map(dept => {
      if (dept.id === departmentId) {
        return {
          ...dept,
          storageUsed: dept.storageUsed + fileSize
        };
      }
      return dept;
    }));
    
    if (currentDepartment?.id === departmentId) {
      setCurrentDepartment(prev => ({
        ...prev,
        storageUsed: prev.storageUsed + fileSize
      }));
    }
  };

  const getDepartmentById = (departmentId) => {
    return departments.find(d => d.id === departmentId);
  };

  const getRoleById = (roleId) => {
    return roles.find(r => r.id === roleId);
  };

  const getUserRoleDisplay = () => {
    const roleNames = {
      'SUPER_ADMIN': 'Super Admin',
      'DEPARTMENT_MANAGER': 'Department Manager',
      'TEAM_LEADER': 'Team Leader',
      'EMPLOYEE': 'Employee',
      'VIEWER': 'Viewer',
      'CONTRACTOR': 'Contractor'
    };
    
    return roleNames[userRole] || userRole;
  };

  const getRoleColor = () => {
    const colors = {
      'SUPER_ADMIN': '#9c27b0',
      'DEPARTMENT_MANAGER': '#0066ff',
      'TEAM_LEADER': '#00cc66',
      'EMPLOYEE': '#666',
      'VIEWER': '#ff9900',
      'CONTRACTOR': '#ff6600'
    };
    
    return colors[userRole] || '#666';
  };

  // Function to check if user can manage specific resource
  const canManageResource = (resourceType, resourceId) => {
    switch (resourceType) {
      case 'department':
        // Department managers can manage their own department
        if (userRole === 'DEPARTMENT_MANAGER') {
          const dept = departments.find(d => d.id === resourceId);
          return dept?.managerId === currentUser?.id;
        }
        return hasPermission('department', 'manage');
        
      case 'user':
        // Department managers can manage users in their department
        if (userRole === 'DEPARTMENT_MANAGER') {
          // In real app, check if user is in same department
          return true;
        }
        return hasPermission('user', 'manage');
        
      case 'file':
        // Users can always manage their own files
        if (currentUser?.id === resourceId) {
          return true;
        }
        return hasPermission('file', 'manage');
        
      default:
        return hasPermission(resourceType, 'manage');
    }
  };

  // Function to get user's accessible departments
  const getAccessibleDepartments = () => {
    if (userRole === 'SUPER_ADMIN') {
      return departments;
    }
    
    // For other roles, only show their assigned department(s)
    if (currentDepartment) {
      return [currentDepartment];
    }
    
    return [];
  };

  const value = {
    companyName,
    currentUser,
    currentDepartment,
    userRole,
    userPermissions,
    departments,
    roles,
    companySettings,
    isLoading,
    hasPermission,
    canAccessDepartment,
    canUploadToDepartment,
    canManageResource,
    setCurrentDepartment,
    updateDepartmentStorage,
    loadCompanyData,
    refreshData,
    getDepartmentById,
    getRoleById,
    getUserRoleDisplay,
    getRoleColor,
    getAccessibleDepartments,
    systemPermissions
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};