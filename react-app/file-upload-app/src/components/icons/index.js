// src/components/icons/index.js
// Small, dependency-free line-icon set matching the Stitch reference visual
// language (1.5px stroke, 20x20 grid, currentColor). Replaces every emoji
// used across the app. Import individually: `import { IconDashboard } from
// '../components/icons'`.
import React from 'react';

const base = (props) => ({
  width: props.size || 18,
  height: props.size || 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: props.strokeWidth || 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: props.className,
  style: props.style,
});

export const IconDashboard = (p) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
);

export const IconDepartments = (p) => (
  <svg {...base(p)}><path d="M3 21V7l7-4 7 4v14" /><path d="M13 21V11h4v10" /><path d="M7 9h.01M7 12h.01M7 15h.01M7 18h.01" /></svg>
);

export const IconRoles = (p) => (
  <svg {...base(p)}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" /><path d="M9.5 12l1.8 1.8L14.5 10" /></svg>
);

export const IconUsers = (p) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.25" /><path d="M3.5 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5" /><path d="M16 5.2c1.3.4 2.25 1.6 2.25 3s-.95 2.6-2.25 3" /><path d="M18.75 15.3c1.75.6 3 2.1 3.4 4.2" /></svg>
);

export const IconScan = (p) => (
  <svg {...base(p)}><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M4 16v2a2 2 0 0 0 2 2h2" /><path d="M20 8V6a2 2 0 0 0-2-2h-2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M3 12h18" /></svg>
);

export const IconSettings = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 13a7.97 7.97 0 0 0 0-2l2-1.6-2-3.5-2.4.8a8 8 0 0 0-1.7-1L14.8 3h-4l-.5 2.7a8 8 0 0 0-1.7 1l-2.4-.8-2 3.5L6.2 11a7.97 7.97 0 0 0 0 2l-2 1.6 2 3.5 2.4-.8a8 8 0 0 0 1.7 1l.5 2.7h4l.5-2.7a8 8 0 0 0 1.7-1l2.4.8 2-3.5-2-1.6z" /></svg>
);

export const IconAdmin = (p) => (
  <svg {...base(p)}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" /><circle cx="12" cy="10" r="2" /><path d="M9 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4" /></svg>
);

export const IconSearch = (p) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);

export const IconBell = (p) => (
  <svg {...base(p)}><path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
);

export const IconHelp = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 1 1 3.9 2.1c-.9.6-1.4 1.1-1.4 2.1" /><path d="M12 17h.01" /></svg>
);

export const IconChevronDown = (p) => (
  <svg {...base(p)}><path d="M6 9l6 6 6-6" /></svg>
);

export const IconChevronRight = (p) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
);

export const IconUpload = (p) => (
  <svg {...base(p)}><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);

export const IconUploadCloud = (p) => (
  <svg {...base(p)}><path d="M7 18a4.5 4.5 0 0 1-1-8.9 5.5 5.5 0 0 1 10.7-1.7A4.5 4.5 0 0 1 17 18H7z" /><path d="M12 12v6" /><path d="M9.5 14.5L12 12l2.5 2.5" /></svg>
);

export const IconFile = (p) => (
  <svg {...base(p)}><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4" /></svg>
);

export const IconFileText = (p) => (
  <svg {...base(p)}><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4" /><path d="M8 13h8M8 17h5" /></svg>
);

export const IconCheckCircle = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.3l2.3 2.3 4.7-4.9" /></svg>
);

export const IconXCircle = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></svg>
);

export const IconClock = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);

export const IconAlertCircle = (p) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></svg>
);

export const IconTrash = (p) => (
  <svg {...base(p)}><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M10 11v6M14 11v6" /></svg>
);

export const IconEdit = (p) => (
  <svg {...base(p)}><path d="M4 20h4L18.5 9.5a1.9 1.9 0 0 0-4-4L4 16v4z" /></svg>
);

export const IconPlus = (p) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconClose = (p) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export const IconLogout = (p) => (
  <svg {...base(p)}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);

export const IconMenu = (p) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

export const IconCamera = (p) => (
  <svg {...base(p)}><path d="M4 8a2 2 0 0 1 2-2h1l1.5-2h7L17 6h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" /><circle cx="12" cy="13" r="3.5" /></svg>
);

export const IconRefresh = (p) => (
  <svg {...base(p)}><path d="M4 12a8 8 0 0 1 14-5.3L20 8" /><path d="M20 4v4h-4" /><path d="M20 12a8 8 0 0 1-14 5.3L4 16" /><path d="M4 20v-4h4" /></svg>
);

export const IconDownload = (p) => (
  <svg {...base(p)}><path d="M12 4v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>
);

export const IconEye = (p) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
);

export const IconBuilding = (p) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01" /></svg>
);

export const IconFolder = (p) => (
  <svg {...base(p)}><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" /></svg>
);

export const IconMail = (p) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);

export const IconLock = (p) => (
  <svg {...base(p)}><rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);

export const IconShield = (p) => (
  <svg {...base(p)}><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" /></svg>
);

export const IconMessage = (p) => (
  <svg {...base(p)}><path d="M4 5h16v11H8l-4 4V5z" /></svg>
);

export const IconCrown = (p) => (
  <svg {...base(p)}><path d="M4 18h16l-1.5-8-4 3-2.5-5-2.5 5-4-3L4 18z" /></svg>
);

export const IconLayers = (p) => (
  <svg {...base(p)}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>
);

export const IconImage = (p) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.75" /><path d="M21 17l-5.5-5.5L6 21" /></svg>
);
