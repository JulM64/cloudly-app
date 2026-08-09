// src/components/Navigation.js
// Restructured from a top navbar into a left sidebar + top bar, matching the
// Stitch reference screens. Nav items map 1:1 onto the existing routes in
// App.js — no route, permission, or auth logic changed, only presentation.
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  IconDashboard, IconDepartments, IconRoles, IconUsers, IconScan,
  IconSettings, IconAdmin, IconSearch, IconBell, IconHelp, IconLogout,
  IconFolder,
} from './icons';
import Avatar from './Avatar';
import './Navigation.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: IconFolder, roles: null },
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard, roles: null },
  { to: '/departments', label: 'Departments', icon: IconDepartments, roles: ['SUPER_ADMIN', 'DEPT_HEAD', 'UNIT_HEAD'] },
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
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!currentUser) return null;

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(currentUser.role));

  return (
    <>
      <aside className="cl-sidebar">
        <div className="cl-sidebar-brand">
          <span className="cl-brand-mark">C</span>
          <div>
            <div className="cl-brand-name">Cloudly</div>
            <div className="cl-brand-sub">{ROLE_LABEL[currentUser.role] || 'Member'}</div>
          </div>
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
        <div className="cl-topbar-search">
          <IconSearch size={16} />
          <input type="text" placeholder="Search..." aria-label="Search" />
        </div>

        <div className="cl-topbar-actions">
          <button type="button" className="cl-icon-btn" aria-label="Notifications"><IconBell size={18} /></button>
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
