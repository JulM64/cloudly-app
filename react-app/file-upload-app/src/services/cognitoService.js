// src/services/cognitoService.js - AWS Cognito Authentication Service
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute
} from 'amazon-cognito-identity-js';
import { awsConfig } from '../config/awsConfig';

const userPool = new CognitoUserPool({
  UserPoolId: awsConfig.cognito.userPoolId,
  ClientId: awsConfig.cognito.userPoolWebClientId
});

class CognitoAuthService {

  // ── Sign Up ───────────────────────────────────────────────────────────────
  signUp(email, password, firstName, lastName, department) {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email',              Value: email }),
        new CognitoUserAttribute({ Name: 'given_name',         Value: firstName }),
        new CognitoUserAttribute({ Name: 'family_name',        Value: lastName }),
        new CognitoUserAttribute({ Name: 'custom:department',  Value: department }),
        new CognitoUserAttribute({ Name: 'custom:role',        Value: 'MEMBER' }),
      ];
      userPool.signUp(email, password, attributeList, null, (err, result) => {
        if (err) { reject(err); return; }
        resolve({ user: result.user, userConfirmed: result.userConfirmed, userSub: result.userSub });
      });
    });
  }

  // ── Confirm Sign Up ───────────────────────────────────────────────────────
  confirmSignUp(email, code) {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) { reject(err); return; }
        resolve(result);
      });
    });
  }

  // ── Sign In ───────────────────────────────────────────────────────────────
  signIn(email, password) {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.authenticateUser(
        new AuthenticationDetails({ Username: email, Password: password }),
        {
          onSuccess: (session) => {
            cognitoUser.getUserAttributes((err, attributes) => {
              if (err) { reject(err); return; }
              const attrs = {};
              attributes.forEach(a => { attrs[a.Name] = a.Value; });
              this.getUserGroups(session.getIdToken().getJwtToken())
                .then(groups => {
                  const userData = this._buildUserData(attrs, groups, session);
                  localStorage.setItem('cloudly_user', JSON.stringify(userData));
                  resolve(userData);
                })
                .catch(() => {
                  const userData = this._buildUserData(attrs, [], session);
                  localStorage.setItem('cloudly_user', JSON.stringify(userData));
                  resolve(userData);
                });
            });
          },
          onFailure: (err) => reject(err),
          newPasswordRequired: (userAttributes, requiredAttributes) => {
            reject({ code: 'NewPasswordRequired', userAttributes, requiredAttributes, cognitoUser });
          }
        }
      );
    });
  }

  // ── Complete New Password ─────────────────────────────────────────────────
  completeNewPassword(cognitoUser, newPassword, userAttributes) {
    return new Promise((resolve, reject) => {
      delete userAttributes.email_verified;
      delete userAttributes.email;
      cognitoUser.completeNewPasswordChallenge(newPassword, userAttributes, {
        onSuccess: (session) => {
          cognitoUser.getUserAttributes((err, attributes) => {
            if (err) { reject(err); return; }
            const attrs = {};
            attributes.forEach(a => { attrs[a.Name] = a.Value; });
            this.getUserGroups(session.getIdToken().getJwtToken())
              .then(groups => {
                const userData = this._buildUserData(attrs, groups, session);
                localStorage.setItem('cloudly_user', JSON.stringify(userData));
                resolve(userData);
              });
          });
        },
        onFailure: (err) => reject(err)
      });
    });
  }

  // ── Get Current User ──────────────────────────────────────────────────────
  getCurrentUser() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) { reject(new Error('No user logged in')); return; }
      cognitoUser.getSession((err, session) => {
        if (err || !session.isValid()) { reject(err || new Error('Session expired')); return; }
        cognitoUser.getUserAttributes((err, attributes) => {
          if (err) { reject(err); return; }
          const attrs = {};
          attributes.forEach(a => { attrs[a.Name] = a.Value; });
          resolve({ email: attrs.email, firstName: attrs.given_name, lastName: attrs.family_name, department: attrs['custom:department'], userId: attrs.sub, session });
        });
      });
    });
  }

  // ── Sign Out ──────────────────────────────────────────────────────────────
  signOut() {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();
    localStorage.removeItem('cloudly_user');
  }

  // ── Get User Groups from token ────────────────────────────────────────────
  getUserGroups(idToken) {
    return new Promise((resolve) => {
      try {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        resolve(payload['cognito:groups'] || []);
      } catch { resolve([]); }
    });
  }

  // ── CORE FIX: Determine Role ──────────────────────────────────────────────
  // Priority: Cognito group (Administrators) > custom:role attribute > default MEMBER
  determineRole(groups, customRole) {
    // Cognito group always wins
    if (groups.includes('Administrators')) return 'SUPER_ADMIN';
    // Then respect custom:role attribute set by admin
    if (customRole && ['DEPT_HEAD','UNIT_HEAD','MEMBER'].includes(customRole)) return customRole;
    // Legacy group support
    if (groups.includes('DepartmentAdmins')) return 'DEPT_HEAD';
    // Default
    return 'MEMBER';
  }

  // ── Build user data object (shared by signIn + completeNewPassword) ───────
  _buildUserData(attrs, groups, session) {
    const customRole = attrs['custom:role'] || null;
    const role = this.determineRole(groups, customRole);
    // Safety net — never allow undefined/null role
    const safeRole = ['SUPER_ADMIN','DEPT_HEAD','UNIT_HEAD','MEMBER'].includes(role) ? role : 'MEMBER';

    console.log('👤 Building user data:');
    console.log('   Email:', attrs.email);
    console.log('   Groups:', groups);
    console.log('   custom:role:', customRole);
    console.log('   → Final role:', safeRole);
    console.log('   Department:', attrs['custom:department']);

    return {
      email:        attrs.email,
      firstName:    attrs.given_name || attrs.email,
      lastName:     attrs.family_name || '',
      department:   attrs['custom:department'] || '',
      role:         safeRole,
      userId:       attrs.sub,
      groups:       groups,
      initials:     this.getInitials(attrs.given_name, attrs.family_name),
      color:        this.getRandomColor(),
      idToken:      session.getIdToken().getJwtToken(),
      accessToken:  session.getAccessToken().getJwtToken(),
      refreshToken: session.getRefreshToken().getToken()
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getInitials(firstName, lastName) {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName  ? lastName.charAt(0).toUpperCase()  : '';
    return f + l || 'U';
  }

  getRandomColor() {
    const colors = ['#4caf50','#2196f3','#ff9800','#9c27b0','#f44336','#00bcd4'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // ── Change Password ───────────────────────────────────────────────────────
  changePassword(oldPassword, newPassword) {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) { reject(new Error('No user logged in')); return; }
      cognitoUser.getSession((err, session) => {
        if (err) { reject(err); return; }
        cognitoUser.changePassword(oldPassword, newPassword, (err, result) => {
          if (err) { reject(err); return; }
          resolve(result);
        });
      });
    });
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  forgotPassword(email) {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.forgotPassword({ onSuccess: resolve, onFailure: reject });
    });
  }

  // ── Confirm Forgot Password ───────────────────────────────────────────────
  confirmPassword(email, code, newPassword) {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
      cognitoUser.confirmPassword(code, newPassword, {
        onSuccess: () => resolve('Password reset successful'),
        onFailure: reject
      });
    });
  }

  // ── Get Session Token ─────────────────────────────────────────────────────
  getSessionToken() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) { reject(new Error('No user logged in')); return; }
      cognitoUser.getSession((err, session) => {
        if (err) { reject(err); return; }
        resolve({ idToken: session.getIdToken().getJwtToken(), accessToken: session.getAccessToken().getJwtToken() });
      });
    });
  }

  // ── Refresh Session ───────────────────────────────────────────────────────
  refreshSession() {
    return new Promise((resolve, reject) => {
      const cognitoUser = userPool.getCurrentUser();
      if (!cognitoUser) { reject(new Error('No user logged in')); return; }
      cognitoUser.getSession((err, session) => {
        if (err) { reject(err); return; }
        cognitoUser.refreshSession(session.getRefreshToken(), (err, newSession) => {
          if (err) { reject(err); return; }
          resolve({ idToken: newSession.getIdToken().getJwtToken(), accessToken: newSession.getAccessToken().getJwtToken() });
        });
      });
    });
  }
}

export default new CognitoAuthService();