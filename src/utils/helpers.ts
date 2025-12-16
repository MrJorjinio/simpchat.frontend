export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
};

export const formatTimeOfDay = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getInitials = (name: string | undefined | null): string => {
  if (!name || name === 'undefined' || name === 'null') {
    return '?';
  }
  const trimmed = String(name).trim();
  if (!trimmed || trimmed.length === 0) {
    return '?';
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || '?';
  }
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
};

export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const getAvatarUrl = (username: string, avatar?: string): string => {
  if (avatar) return avatar;
  // Generate placeholder avatar from username
  const initials = getInitials(username);
  const bgColor = hashCode(username);
  return `https://via.placeholder.com/40/${bgColor}/FFFFFF?text=${initials}`;
};

const hashCode = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const color = Math.abs(hash).toString(16).substring(0, 6);
  return color.padEnd(6, '0');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Formats a last seen timestamp into a human-readable string
 * Examples: "just now", "5 minutes ago", "2 hours ago", "Yesterday at 3:45 PM", "Monday at 10:30 AM"
 */
/**
 * Fixes MinIO URLs by replacing internal Docker hostname with accessible IP
 * This handles URLs stored in database with the internal hostname
 */
export const fixMinioUrl = (url: string | undefined | null): string | undefined => {
  if (!url) return undefined;
  // Replace internal Docker hostname with network IP for browser access
  return url
    .replace('simpchat.filestorage:9000', '192.168.100.25:9000')
    .replace('localhost:9000', '192.168.100.25:9000');
};

export const formatLastSeen = (lastSeenISO: string): string => {
  if (!lastSeenISO) return 'Unknown';

  const lastSeen = new Date(lastSeenISO);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now (< 1 minute)
  if (diffMins < 1) return 'just now';

  // Minutes ago (1-59 minutes)
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;

  // Hours ago (1-23 hours)
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  // Yesterday with time
  if (diffDays === 1) {
    const timeStr = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Yesterday at ${timeStr}`;
  }

  // Last week with day name and time
  if (diffDays < 7) {
    const dayStr = lastSeen.toLocaleDateString([], { weekday: 'long' });
    const timeStr = lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${dayStr} at ${timeStr}`;
  }

  // More than a week ago
  return lastSeen.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};
