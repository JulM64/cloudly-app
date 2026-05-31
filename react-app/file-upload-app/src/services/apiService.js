// src/services/apiService.js - API Service for Backend Communication

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('🔧 API Service initialized');
console.log('   API URL:', API_URL);

class ApiService {
  constructor() {
    this.baseURL = API_URL;
  }

  // Get auth token from localStorage - IMPROVED VERSION
  getAuthToken() {
    console.log('🔍 Looking for auth token...');
    
    // Check multiple possible storage locations
    const possibleKeys = [
      'userData',
      'user',
      'authUser',
      'cognitoUser',
      'idToken',
      'accessToken',
      'CognitoIdentityServiceProvider'
    ];
    
    // Log all localStorage keys for debugging
    console.log('   Available localStorage keys:', Object.keys(localStorage));
    
    // First, try to find userData object
    for (const key of possibleKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`   Found data in key: ${key}`);
        
        try {
          // Try parsing as JSON
          const parsed = JSON.parse(data);
          console.log('   Parsed data structure:', Object.keys(parsed));
          
          // Look for token in various fields
          const token = parsed.idToken || 
                       parsed.accessToken || 
                       parsed.token ||
                       parsed.jwtToken ||
                       (parsed.signInUserSession?.idToken?.jwtToken) ||
                       (parsed.signInUserSession?.accessToken?.jwtToken) ||
                       (parsed.tokens?.idToken) ||
                       (parsed.tokens?.accessToken);
          
          if (token) {
            console.log('✅ Token found in:', key);
            console.log('   Token preview:', token.substring(0, 30) + '...');
            return token;
          }
        } catch (e) {
          // Not JSON, maybe it's a raw token
          if (data.startsWith('eyJ')) {
            console.log('✅ Found raw JWT token');
            return data;
          }
        }
      }
    }
    
    // Check for Cognito SDK stored tokens (different pattern)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('idToken')) {
        const value = localStorage.getItem(key);
        if (value && value.startsWith('eyJ')) {
          console.log('✅ Found Cognito idToken:', key);
          return value;
        }
      }
    }
    
    console.error('❌ No token found in localStorage');
    console.log('📋 Debug info - All localStorage contents:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      console.log(`   ${key}:`, value?.substring(0, 50) + '...');
    }
    
    return null;
  }

  // Make API request
  async request(endpoint, options = {}) {
    const token = this.getAuthToken();
    
    if (!token) {
      console.error('❌ Cannot make request: No authentication token');
      throw new Error('Not authenticated. Please login first.');
    }
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      },
      ...options
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 API Request: ${config.method} ${url}`);
    console.log('   Headers:', config.headers);

    try {
      const response = await fetch(url, config);
      
      console.log(`   Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: response.statusText 
        }));
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response received');
      console.log('   Data:', data);
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }

  // Make request without authentication (for public endpoints)
  async publicRequest(endpoint, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 Public API Request: ${config.method} ${url}`);

    try {
      const response = await fetch(url, config);
      
      console.log(`   Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: response.statusText 
        }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Public API Response received');
      return data;
    } catch (error) {
      console.error('❌ Public API Request failed:', error);
      throw error;
    }
  }

  // ============ DEPARTMENT METHODS ============

  async getDepartments() {
    console.log('📂 Fetching departments...');
    return this.request('/departments');
  }

  async getHierarchy() {
    console.log('🌲 Fetching hierarchy...');
    return this.request('/departments/hierarchy');
  }

  async createDepartment(departmentData) {
    console.log('🆕 Creating department:', departmentData);
    return this.request('/departments', {
      method: 'POST',
      body: departmentData
    });
  }

  async updateDepartment(id, departmentData) {
    console.log('📝 Updating department:', id);
    return this.request(`/departments/${id}`, {
      method: 'PUT',
      body: departmentData
    });
  }

  async deleteDepartment(id) {
    console.log('🗑️ Deleting department:', id);
    return this.request(`/departments/${id}`, {
      method: 'DELETE'
    });
  }

  // ============ USERS METHODS ============

  async getUsers() {
    console.log('👥 Fetching Cognito users...');
    return this.request('/users');
  }

  // ============ FILE METHODS ============

  async saveFileMetadata(fileData) {
    console.log('💾 Saving file metadata:', fileData.fileName);
    return this.request('/files/metadata', {
      method: 'POST',
      body: fileData
    });
  }

  async getMyFiles() {
    console.log('📁 Fetching my files...');
    return this.request('/files/my-files');
  }

  async getDepartmentFiles(department) {
    console.log('📁 Fetching department files:', department);
    return this.request(`/files/department/${department}`);
  }

  async getAllFiles() {
    console.log('📁 Fetching all files (admin)...');
    return this.request('/files/all');
  }

  async deleteFileMetadata(userId, fileId) {
    console.log('🗑️ Deleting file metadata:', fileId);
    return this.request(`/files/metadata/${userId}/${fileId}`, {
      method: 'DELETE'
    });
  }

  // ============ ACTIVITY METHODS ============

  async getActivities() {
    console.log('📊 Fetching activities...');
    return this.request('/activities');
  }

  // ============ STATS METHODS ============

  async getDashboardStats() {
    console.log('📊 Fetching dashboard stats...');
    return this.request('/stats/dashboard');
  }

  async getAdminStats() {
    console.log('📊 Fetching admin stats...');
    return this.request('/stats/admin');
  }

  // ============ HEALTH CHECK & TEST ============

  async healthCheck() {
    console.log('❤️ Health check...');
    return this.publicRequest('/health');
  }

  async test() {
    console.log('🧪 Testing backend...');
    return this.publicRequest('/test');
  }

  // ============ DEBUG HELPERS ============

  // Debug: Show all localStorage contents
  debugLocalStorage() {
    console.log('🔍 === LOCALSTORAGE DEBUG ===');
    console.log('   Total items:', localStorage.length);
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      
      console.log('');
      console.log(`   Key #${i + 1}: ${key}`);
      
      if (value) {
        try {
          const parsed = JSON.parse(value);
          console.log('   Type: JSON Object');
          console.log('   Keys:', Object.keys(parsed));
          console.log('   Value preview:', JSON.stringify(parsed).substring(0, 100) + '...');
        } catch {
          console.log('   Type: String');
          console.log('   Value:', value.substring(0, 100) + (value.length > 100 ? '...' : ''));
        }
      }
    }
    console.log('');
    console.log('🔍 === END DEBUG ===');
  }

  // Debug: Check if user is authenticated
  isAuthenticated() {
    const token = this.getAuthToken();
    const isAuth = !!token;
    console.log('🔐 Authentication check:', isAuth ? '✅ Authenticated' : '❌ Not authenticated');
    return isAuth;
  }
}

export default new ApiService();