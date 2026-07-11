// src/utils/avatarUtils.js

// Curated palette of pleasant, accessible colors for avatar backgrounds
const AVATAR_COLORS = [
  '#F56565', '#ED8936', '#ECC94B', '#48BB78', '#38B2AC',
  '#4299E1', '#667EEA', '#9F7AEA', '#ED64A6', '#F687B3',
  '#0BC5EA', '#00B5D8', '#68D391', '#F6AD55', '#B794F4',
];

// Simple deterministic string hash (same input -> same output, always)
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash);
}

/** Consistent single background color for a seed (email/name/userId) */
export function getAvatarColor(seed = '') {
  if (!seed) return AVATAR_COLORS[0];
  return AVATAR_COLORS[hashString(seed) % AVATAR_COLORS.length];
}

/** Consistent two-tone gradient for a seed — nicer visual than flat color */
export function getAvatarGradient(seed = '') {
  if (!seed) return `linear-gradient(135deg, ${AVATAR_COLORS[0]} 0%, ${AVATAR_COLORS[5]} 100%)`;
  const hash = hashString(seed);
  const c1 = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  const c2 = AVATAR_COLORS[(hash + 5) % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
}

/** Extract up to 2 initials from a display name or an email address */
export function getInitials(nameOrEmail = '') {
  if (!nameOrEmail) return '?';
  const namePart = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
  const cleaned = namePart.replace(/[._\-0-9]+/g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return nameOrEmail.charAt(0).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}