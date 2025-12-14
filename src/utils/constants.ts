export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://10.30.1.77:5213/api';

export const COLORS = {
  light: {
    primary: '#1a365d',
    secondary: '#718096',
    background: '#f7fafc',
    surface: '#ffffff',
    chatSelf: '#3182ce',
    chatOther: '#e2e8f0',
    text: '#2d3748',
    textMuted: '#718096',
    accent: '#63b3ed',
    border: '#e2e8f0',
  },
  dark: {
    primary: '#4299e1',
    secondary: '#a0aec0',
    background: '#1a202c',
    surface: '#2d3748',
    chatSelf: '#2c5282',
    chatOther: '#2d3748',
    text: '#e2e8f0',
    textMuted: '#a0aec0',
    accent: '#3182ce',
    border: '#4a5568',
  },
};

export const MESSAGE_POLL_INTERVAL = 5000; // 5 seconds
export const LAST_SEEN_UPDATE_INTERVAL = 30000; // 30 seconds

export const PERMISSIONS = [
  'SEND_MESSAGES',
  'MANAGE_MESSAGES',
  'MANAGE_USERS',
  'MANAGE_CHAT_INFO',
  'MANAGE_BANS',
  'PIN_MESSAGES',
];

export const CHAT_TYPES = {
  DM: 'dm',
  GROUP: 'group',
  CHANNEL: 'channel',
} as const;

export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  MENTION: 'mention',
  JOIN: 'join',
  SYSTEM: 'system',
} as const;
