/**
 * Unified icon system for CetecTimeLogger
 * Uses a single consistent set of flat icons throughout the app
 */

export const Icons = {
  // Navigation
  orders: '≡',
  history: '⟲',
  create: '+',
  settings: '⚙',

  // Controls
  play: '▶',
  pause: '⏸',
  close: '✕',
  menu: '☰',
  notifications: '◐',
  search: '⊙',

  // Formatting
  bold: 'B',
  italic: 'I',
  list: '☐',
  microphone: '◆',

  // Status
  add: '+',
  location: '◆',
} as const;

export type IconKey = keyof typeof Icons;
