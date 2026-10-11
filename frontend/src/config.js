// Backend origin. Set VITE_API_URL in .env.development / .env.production.
export const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Kept in sync with backend/utils/constants.js.
export const ROOM_CODE_REGEX = /^[A-Z0-9]{8}$/;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MAX_LENGTH = 100;
export const MESSAGE_MAX_LENGTH = 1000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export const LIFETIME_OPTIONS = [
  { minutes: 10, label: '10 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 180, label: '3 hours' },
  { minutes: 1440, label: '24 hours' },
];
export const DEFAULT_LIFETIME_MINUTES = 60;

export const END_POLICY_OPTIONS = [
  { value: 'host_leaves', label: 'When I leave' },
  { value: 'everyone_leaves', label: 'When everyone leaves' },
  { value: 'timer_only', label: 'Only when the timer runs out' },
];

export const BURN_OPTIONS = [
  { seconds: 0, label: 'Off' },
  { seconds: 10, label: '10s' },
  { seconds: 60, label: '1 min' },
  { seconds: 300, label: '5 min' },
];

export const SLOW_MODE_OPTIONS = [
  { seconds: 0, label: 'Off' },
  { seconds: 5, label: '5 seconds' },
  { seconds: 15, label: '15 seconds' },
  { seconds: 60, label: '1 minute' },
];

export const EXTEND_OPTIONS_MINUTES = [15, 60];
