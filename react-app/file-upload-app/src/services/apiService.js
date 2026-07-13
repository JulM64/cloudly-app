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
  getUsers(lastKey = null, limit = 60) {
    const params = new URLSearchParams({ limit });
    if (lastKey) params.set('lastKey', lastKey);
    return this.request(`/users?${params.toString()}`);
  }
  getTeamUsers() { return this.request('/users/team'); }
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

  // ── FILE DELETE REQUESTS ─────────────────────────────────────────────────────
  requestFileDelete(userId, fileId, reason) { return this.request('/file-delete-requests', { method: 'POST', body: { userId, fileId, reason } }); }
  getMyFileDeleteRequests()          { return this.request('/file-delete-requests/mine'); }
  getFileDeleteRequests()            { return this.request('/file-delete-requests'); }
  getFileDeletePendingCount()        { return this.request('/file-delete-requests/pending-count'); }
  approveFileDeleteRequest(id)       { return this.request(`/file-delete-requests/${id}/approve`, { method: 'PUT' }); }
  rejectFileDeleteRequest(id, reason){ return this.request(`/file-delete-requests/${id}/reject`, { method: 'PUT', body: { reason } }); }

  // ── FILES ──────────────────────────────────────────────────────────────────
  getUploadUrl(fileName, fileType) { return this.request('/files/upload-url', { method: 'POST', body: { fileName, fileType } }); }
  saveFileMetadata(data)            { return this.request('/files/metadata', { method: 'POST', body: data }); }
  getMyFiles()                      { return this.request('/files/my-files'); }
  getDepartmentFiles(dept)          { return this.request(`/files/department/${dept}`); }
  getAllFiles(lastKey = null, limit = 50) {
    const params = new URLSearchParams({ limit });
    if (lastKey) params.set('lastKey', lastKey);
    return this.request(`/files/all?${params.toString()}`);
  }
  getTeamFiles(lastKey = null, limit = 50) {
    const params = new URLSearchParams({ limit });
    if (lastKey) params.set('lastKey', lastKey);
    return this.request(`/files/team?${params.toString()}`);
  }
  deleteFileMetadata(userId, fileId){ return this.request(`/files/metadata/${userId}/${fileId}`, { method: 'DELETE' }); }
  openFile(userId, fileId)          { return this.request(`/files/open/${userId}/${fileId}`); }
  downloadFile(userId, fileId)      { return this.request(`/files/download/${userId}/${fileId}`); }

  /**
   * Full secure upload flow in one call:
   * 1. Ask the backend for a presigned POST scoped to the user's own department bucket
   * 2. Upload the file directly to S3 (bytes never pass through our own server)
   * 3. Save the resulting file metadata so it shows up in "My Files" / department views
   *
   * @param {File} file - the raw File object from an <input type="file"> or drop event
   * @param {(percent: number) => void} [onProgress] - optional progress callback (0-100)
   * @returns {Promise<object>} the saved file metadata
   */
  async uploadFile(file, onProgress) {
    const { url, fields, bucket, key } = await this.getUploadUrl(file.name, file.type);

    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
    formData.append('file', file); // must be appended LAST — S3 ignores fields after this

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`S3 upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error('S3 upload failed: network error'));
      xhr.send(formData);
    });

    return this.saveFileMetadata({
      fileName: key,
      originalName: file.name,
      s3Key: key,
      s3Bucket: bucket,
      fileSize: file.size,
      fileType: file.type,
    });
  }

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