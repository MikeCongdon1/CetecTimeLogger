export const Colors = {
  primary: '#137fec',
  primaryHover: '#0a66d2',
  primaryActive: '#0854a8',

  // Background colors
  backgroundLight: '#f6f7f8',
  backgroundDark: '#101922',

  // Surface colors (cards, panels)
  surfaceLight: '#ffffff',
  surfaceDark: '#1c2b36',
  surfaceDarkAlt: '#151f28',

  // Text colors - main
  text: '#ffffff',
  textDark: '#0f172a',
  textPrimary: '#0f172a',
  textPrimaryDark: '#ffffff',
  textSecondary: '#94a3b8',
  textSecondaryDark: '#cbd5e1',
  textTertiary: '#cbd5e1',
  textMuted: '#94a3b8',
  textMutedDark: '#64748b',

  // Status colors
  statusSuccess: '#10b981',
  statusError: '#ef4444',
  statusWarning: '#f59e0b',
  statusInfo: '#06b6d4',

  // Borders
  borderLight: '#e2e8f0',
  borderDark: '#334155',
  borderColor: '#334155',

  // Semantic colors
  destructive: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#06b6d4',

  // Overlay
  overlay50: 'rgba(0, 0, 0, 0.05)',
  overlay10: 'rgba(255, 255, 255, 0.1)',
} as const;

export type ColorKey = keyof typeof Colors;
