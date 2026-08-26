// src/components/Navigation.js
// Restructured from a top navbar into a left sidebar + top bar, matching the
// Stitch reference screens. Nav items map 1:1 onto the existing routes in
// App.js — no route, permission, or auth logic changed, only presentation.
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  IconDashboard, IconDepartments, IconRoles, IconUsers, IconScan,
  IconSettings, IconAdmin, IconSearch, IconBell, IconHelp, IconLogout,
  IconFolder, IconLayers, IconMenu, IconClose,
} from './icons';
import Avatar from './Avatar';
import apiService from '../services/apiService';
import './Navigation.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: IconFolder, roles: null },
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard, roles: null },
  { to: '/departments', label: 'Departments', icon: IconDepartments, roles: ['SUPER_ADMIN', 'DEPT_HEAD', 'UNIT_HEAD'] },
  { to: '/archive', label: 'Archive', icon: IconLayers, roles: ['SUPER_ADMIN', 'DEPT_HEAD', 'UNIT_HEAD'] },
  { to: '/role-requests', label: 'Roles', icon: IconRoles, roles: ['SUPER_ADMIN', 'DEPT_HEAD'] },
  { to: '/team', label: 'Team', icon: IconUsers, roles: ['DEPT_HEAD', 'UNIT_HEAD'] },
  { to: '/scan', label: 'Scan', icon: IconScan, roles: null },
  { to: '/settings', label: 'Settings', icon: IconSettings, roles: null },
  { to: '/admin', label: 'Admin Panel', icon: IconAdmin, roles: ['SUPER_ADMIN'] },
];

const ROLE_LABEL = {
  SUPER_ADMIN: 'Enterprise Admin',
  DEPT_HEAD: 'Department Head',
  UNIT_HEAD: 'Unit Head',
  MEMBER: 'Member',
};

const Navigation = ({ currentUser, signOut }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close the mobile drawer automatically whenever the route changes (i.e.
  // the user tapped a nav link) — otherwise it stays open covering the page
  // after navigating.
  const location = useLocation();
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // Lock background scroll while the mobile drawer is open, same pattern
  // any full-screen mobile menu needs.
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  // Notification badge = pending items this role can actually act on:
  // Super Admin sees pending role-change AND file-delete requests (only
  // role that can approve both); Dept Head sees pending role-change
  // requests scoped to their own department. Unit Head / Member have
  // nothing actionable via notifications today, so they get no badge.
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (!['SUPER_ADMIN', 'DEPT_HEAD'].includes(role)) {
      setNotificationCount(0);
      return;
    }

    let cancelled = false;
    const loadCount = async () => {
      try {
        const roleCountPromise = apiService.getPendingRoleCount();
        const fileCountPromise = role === 'SUPER_ADMIN' ? apiService.getFileDeletePendingCount() : Promise.resolve({ pendingCount: 0 });
        const [roleRes, fileRes] = await Promise.all([roleCountPromise, fileCountPromise]);
        if (!cancelled) setNotificationCount((roleRes.pendingCount || 0) + (fileRes.pendingCount || 0));
      } catch (err) {
        console.warn('Could not load notification count:', err.message);
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 60000);
    window.addEventListener('focus', loadCount);
    // Fired the instant a role-change or file-delete request is
    // approved/rejected (see RoleRequestsPage.js / AdminPanel.js) — refresh
    // right away instead of waiting on the 60s timer or a manual reload.
    window.addEventListener('cloudly-notifications-changed', loadCount);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', loadCount);
      window.removeEventListener('cloudly-notifications-changed', loadCount);
    };
  }, [currentUser?.userId, currentUser?.role]);

  const handleBellClick = () => {
    if (['SUPER_ADMIN', 'DEPT_HEAD'].includes(currentUser.role)) navigate('/role-requests');
  };

  if (!currentUser) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(currentUser.role));

  return (
    <>
      {mobileNavOpen && <div className="cl-sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`cl-sidebar ${mobileNavOpen ? 'cl-sidebar--open' : ''}`}>
        <div className="cl-sidebar-brand">
          <span className="cl-brand-mark">C</span>
          <div>
            <div className="cl-brand-name">Cloudly</div>
            <div className="cl-brand-sub">{ROLE_LABEL[currentUser.role] || 'Member'}</div>
          </div>
          <button type="button" className="cl-sidebar-close" aria-label="Close menu" onClick={() => setMobileNavOpen(false)}>
            <IconClose size={18} />
          </button>
        </div>

        <nav className="cl-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `cl-nav-item ${isActive ? 'cl-nav-item--active' : ''}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="cl-topbar">
        <button type="button" className="cl-hamburger" aria-label="Open menu" onClick={() => setMobileNavOpen(true)}>
          <IconMenu size={20} />
        </button>

        <div className="cl-topbar-search">
          <IconSearch size={16} />
          <input type="text" placeholder="Search..." aria-label="Search" />
        </div>

        <div className="cl-topbar-actions">
          <button type="button" className="cl-icon-btn" aria-label={notificationCount > 0 ? `${notificationCount} notifications` : 'Notifications'} onClick={handleBellClick}>
            <IconBell size={18} />
            {notificationCount > 0 && (
              <span className="cl-notification-badge">{notificationCount > 9 ? '9+' : notificationCount}</span>
            )}
          </button>
          <button type="button" className="cl-icon-btn" aria-label="Help"><IconHelp size={18} /></button>

          <div className="cl-user-menu" ref={menuRef}>
            <button type="button" className="cl-user-trigger" onClick={() => setMenuOpen((o) => !o)}>
              <Avatar name={`${currentUser.firstName} ${currentUser.lastName}`} email={currentUser.email} src={currentUser.avatar} size={34} />
            </button>
            {menuOpen && (
              <div className="cl-dropdown">
                <div className="cl-dropdown-header">
                  <div className="cl-dropdown-name">{currentUser.firstName} {currentUser.lastName}</div>
                  <div className="cl-dropdown-email">{currentUser.email}</div>
                </div>
                <button type="button" className="cl-dropdown-item" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                  <IconSettings size={16} /> Settings
                </button>
                <button type="button" className="cl-dropdown-item cl-dropdown-item--danger" onClick={() => { setMenuOpen(false); signOut(); }}>
                  <IconLogout size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Navigation;