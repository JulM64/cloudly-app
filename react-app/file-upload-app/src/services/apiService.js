// src/services/apiService.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() { this.baseURL = API_URL; }

  getAuthToken() {
    // 1. PRIMARY: Always check cloudly_user first (syncs with cognitoService.js)
    try {
      const cloudlyUserStr = localStorage.getItem('cloudly_user');
      if (cloudlyUserStr) {
        const cloudlyUser = JSON.parse(cloudlyUserStr);
        if (cloudlyUser.idToken) return cloudlyUser.idToken;
      }
    } catch (e) {
      console.warn('Failed to parse cloudly_user token', e);
    }

    // 2. FALLBACK 1: Look for other known object keys
    for (const key of ['userData','user','authUser','cognitoUser','idToken','accessToken']) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const p = JSON.parse(data);
          const t = p.idToken || p.accessToken || p.token || p.jwtToken ||
            p.signInUserSession?.idToken?.jwtToken || p.tokens?.idToken;
          if (t) return t;
        } catch { if (data.startsWith('eyJ')) return data; }
      }
    }

    // 3. FALLBACK 2: Blindly search for any raw key containing 'idToken'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('idToken')) {
        const val = localStorage.getItem(key);
        if (val?.startsWith('eyJ')) return val;
      }
    }
    
    return null;
  }

  async request(endpoint, options = {}) {
    const token = this.getAuthToken();
    if (!token) throw new Error('Not authenticated. Please login first.');
    const config = {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers }
    };
    if (options.body) config.body = JSON.stringify(options.body);
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) { console.error('❌ API Request failed:', err); throw err; }
  }

  async publicRequest(endpoint, options = {}) {
    const config = { method: options.method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (options.body) config.body = JSON.stringify(options.body);
    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(e.error || `HTTP ${response.status}`); }
    return await response.json();
  }

  // ── DEPARTMENTS ────────────────────────────────────────────────────────────
  getDepartments()           { return this.request('/departments'); }
  getHierarchy()             { return this.request('/departments/hierarchy'); }
  createDepartment(data)     { return this.request('/departments', { method: 'POST', body: data }); }
  updateDepartment(id, data) { return this.request(`/departments/${id}`, { method: 'PUT', body: data }); }
  deleteDepartment(id)       { return this.request(`/departments/${id}`, { method: 'DELETE' }); }

  // ── USERS ──────────────────────────────────────────────────────────────────
  getUsers() { return this.request('/users'); }
  createUser(data) { return this.request('/users/create', { method: 'POST', body: data }); }

  updateUserDepartment(email, department) {
    return this.request(`/users/${encodeURIComponent(email)}/department`, { method: 'PUT', body: { department } });
  }

  // ── AVATAR ────────────────────────────────────────────────────────────────
  getMyAvatar()              { return this.request('/users/avatar/me'); }
  updateAvatar(imageBase64)  { return this.request('/users/avatar', { method: 'POST', body: { imageBase64 } }); }
  removeAvatar()             { return this.request('/users/avatar', { method: 'DELETE' }); }

  // ── ROLE REQUESTS ──────────────────────────────────────────────────────────
  getRoleRequests()          { return this.request('/role-requests'); }
  getPendingRoleCount()      { return this.request('/role-requests/pending-count'); }
  proposeRoleChange(data)    { return this.request('/role-requests', { method: 'POST', body: data }); }
  approveRoleRequest(id)     { return this.request(`/role-requests/${id}/approve`, { method: 'PUT' }); }
  rejectRoleRequest(id, reason) { return this.request(`/role-requests/${id}/reject`, { method: 'PUT', body: { reason } }); }

  // ── FILES ──────────────────────────────────────────────────────────────────
  saveFileMetadata(data)            { return this.request('/files/metadata', { method: 'POST', body: data }); }
  getMyFiles()                      { return this.request('/files/my-files'); }
  getDepartmentFiles(dept)          { return this.request(`/files/department/${dept}`); }
  getAllFiles()                     { return this.request('/files/all'); }
  deleteFileMetadata(userId, fileId){ return this.request(`/files/metadata/${userId}/${fileId}`, { method: 'DELETE' }); }
  openFile(userId, fileId)          { return this.request(`/files/open/${userId}/${fileId}`); }
  downloadFile(userId, fileId)      { return this.request(`/files/download/${userId}/${fileId}`); }

  // ── ACTIVITIES ─────────────────────────────────────────────────────────────
  getActivities() { return this.request('/activities'); }

  // ── STATS ──────────────────────────────────────────────────────────────────
  getDashboardStats() { return this.request('/stats/dashboard'); }
  getAdminStats()     { return this.request('/stats/admin'); }

  // ── HEALTH ─────────────────────────────────────────────────────────────────
  healthCheck() { return this.publicRequest('/health'); }
  test()        { return this.publicRequest('/test'); }
  isAuthenticated() { return !!this.getAuthToken(); }
}

export default new ApiService();