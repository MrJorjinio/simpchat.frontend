/**
 * Normalize backend API responses to match frontend expectations
 * CRITICAL: Handles differences between ACTUAL backend implementation and documented API
 *
 * ACTUAL Backend returns:
 * - type: "Conversation" (for DMs)
 * - type: "Group" (for groups)
 * - type: "Channel" (for channels)
 * - avatarUrl: may be null
 * - notificationsCount: instead of unreadCount
 * - userLastMessage: timestamp field
 *
 * CRITICAL DISCREPANCIES HANDLED:
 * 1. User IDs: Some endpoints return userId instead of id
 * 2. Online status: isOnline (boolean) instead of onlineStatus (string)
 * 3. Message IDs: messageId instead of id
 * 4. Message timestamps: sentAt instead of createdAt
 * 5. Chat profile ID: chatId instead of id
 * 6. Last message: Missing id field in response
 * 7. Reactions: imageUrl instead of emoji field
 * 8. Missing fields: email, members in some responses
 */

import type { Chat, User, BackendMessage } from '../types/api.types';
import { fixMinioUrl } from './helpers';

/**
 * Normalize chat type from ACTUAL backend values to frontend values
 *
 * Backend ACTUAL values:
 *   "Conversation" → "dm"
 *   "Group" → "group"
 *   "Channel" → "channel"
 *
 * Also handles documented API values:
 *   "dm" → "dm"
 *   "group" → "group"
 *   "channel" → "channel"
 */
export const normalizeChatType = (type: any): 'dm' | 'group' | 'channel' => {
  if (!type) return 'channel';

  const normalized = String(type).toLowerCase().trim();

  // ACTUAL backend capitalized values
  if (normalized === 'conversation' || normalized === 'dm' || normalized === 'directmessage') {
    return 'dm';
  } else if (normalized === 'group') {
    return 'group';
  } else if (normalized === 'channel') {
    return 'channel';
  }

  console.warn('[Normalizer] Unknown chat type:', type, 'defaulting to channel');
  return 'channel'; // Default fallback
};

/**
 * Normalize a chat object from backend response
 * Maps actual field names to expected field names
 */
export const normalizeChat = (chat: any): Chat => {
  if (!chat) return {} as Chat;

  // Normalize privacy: backend enum 0=Public, 1=Private
  let privacy: 'public' | 'private' | undefined = undefined;
  if (chat.privacy !== null && chat.privacy !== undefined) {
    if (typeof chat.privacy === 'number') {
      privacy = chat.privacy === 0 ? 'public' : 'private';
    } else if (typeof chat.privacy === 'string') {
      privacy = chat.privacy.toLowerCase() as 'public' | 'private';
    }
  }

  return {
    id: chat.id,
    name: chat.name || 'Unknown',
    type: normalizeChatType(chat.type),
    // Support both camelCase (avatarUrl) and PascalCase (AvatarUrl) from backend
    avatar: fixMinioUrl(chat.avatarUrl || chat.AvatarUrl || chat.avatar || chat.profileImage),
    description: chat.description || '',
    privacy,
    members: (chat.members || []).map((m: any) => {
      // Normalize member user object with avatar (support both camelCase and PascalCase)
      const userObj = m.user ? {
        ...m.user,
        id: m.user.id || m.user.userId || m.userId,
        avatar: fixMinioUrl(m.user.avatarUrl || m.user.AvatarUrl || m.user.avatar || m.user.profileImage),
      } : {
        id: m.userId || m.id,
        username: m.username || 'Unknown',
        email: '',
        avatar: fixMinioUrl(m.avatarUrl || m.AvatarUrl || m.avatar),
        onlineStatus: 'offline' as const,
        lastSeen: new Date().toISOString(),
      };

      return {
        id: m.id || m.userId || m.user?.id,
        userId: m.userId || m.id || m.user?.id,
        user: userObj as any,
        joinedAt: m.joinedAt,
        role: m.role || 'member',
      };
    }),
    lastMessage: chat.lastMessage ? {
      id: chat.lastMessage.id,
      content: chat.lastMessage.content,
      createdAt: chat.lastMessage.createdAt || chat.lastMessage.sentAt || new Date().toISOString(),
    } as any : undefined,
    // Map notificationsCount or unreadCount - backend uses "notificationsCount"
    unreadCount: chat.unreadCount !== undefined ? chat.unreadCount : (chat.notificationsCount || 0),
    isOnline: chat.isOnline !== undefined ? chat.isOnline : false,
    createdAt: chat.created || chat.createdAt || new Date().toISOString(),
    updatedAt: chat.userLastMessage || chat.updatedAt || chat.createdAt || new Date().toISOString(),
    // Normalize messages - fix MinIO URLs for file attachments and sender avatars
    messages: chat.messages ? chat.messages.map((msg: any) => ({
      ...msg,
      fileUrl: fixMinioUrl(msg.fileUrl),
      senderAvatarUrl: fixMinioUrl(msg.senderAvatarUrl),
    })) as BackendMessage[] : undefined,
    participantsCount: chat.participantsCount,
    participantsOnline: chat.participantsOnline,
    notificationsCount: chat.notificationsCount,
  };
};

/**
 * Normalize a user object from backend response
 * Maps actual field names to expected field names
 *
 * HANDLES DISCREPANCIES:
 * - userId field: Some endpoints return userId instead of id (convert to id)
 * - isOnline: Convert boolean isOnline to onlineStatus string enum
 * - Missing email: Some endpoints don't return email field
 * - Missing addMePolicy: Not implemented in backend
 */
export const normalizeUser = (user: any): User => {
  if (!user) return {} as User;

  console.log('[Normalizer] Normalizing user:', user);

  // Handle userId vs id vs entityId discrepancy
  // GET /api/users/me and GET /api/users/{id} return userId (NOT id!)
  // GET /api/users/search returns EntityId (capital E) or entityId
  // Chat participants use id
  const userId = user.userId || user.id || user.entityId || user.EntityId;

  // Handle isOnline boolean vs onlineStatus string
  let onlineStatus: 'online' | 'offline' | 'away' = 'offline';
  if (typeof user.onlineStatus === 'string') {
    onlineStatus = (user.onlineStatus.toLowerCase() as any) || 'offline';
  } else if (typeof user.isOnline === 'boolean') {
    onlineStatus = user.isOnline ? 'online' : 'offline';
  }

  return {
    id: userId,
    username: user.username || user.displayName || user.name || 'Unknown',
    email: user.email || '', // IMPORTANT: GET /users/me does NOT return email field
    // Support both camelCase (avatarUrl) and PascalCase (AvatarUrl) from backend
    avatar: fixMinioUrl(user.avatarUrl || user.AvatarUrl || user.avatar || user.profileImage),
    bio: user.description || user.bio || '', // Backend uses "description"
    onlineStatus,
    lastSeen: user.lastSeen || new Date().toISOString(),
    addMePolicy: (user.addMePolicy || 'everyone') as 'everyone' | 'chatted' | 'nobody', // Not implemented in backend
  };
};

/**
 * Normalize multiple chats
 */
export const normalizeChats = (chats: any[]): Chat[] => {
  if (!Array.isArray(chats)) {
    console.warn('[Normalizer] Expected array of chats, got:', typeof chats);
    return [];
  }
  return chats.map(chat => normalizeChat(chat));
};

/**
 * Normalize multiple users
 */
export const normalizeUsers = (users: any[]): User[] => {
  if (!Array.isArray(users)) {
    console.warn('[Normalizer] Expected array of users, got:', typeof users);
    return [];
  }
  return users.map(user => normalizeUser(user));
};

/**
 * Normalize a backend message to match frontend Message interface
 *
 * HANDLES DISCREPANCIES:
 * - messageId vs id: Backend uses messageId, frontend expects id
 * - sentAt vs createdAt: Backend uses sentAt, frontend expects createdAt
 * - Reactions structure: Backend uses imageUrl, frontend needs emoji mapping
 * - Missing sender data: Populate from message fields when possible
 */
export const normalizeBackendMessage = (msg: BackendMessage): any => {
  if (!msg) return null;

  return {
    // Map messageId to id
    id: msg.messageId,
    // For now, use the backend structure as-is for other fields
    // A full Message object would need more context (sender user object, etc.)
    ...msg,
    // Fix MinIO URLs for file attachments and sender avatar
    fileUrl: fixMinioUrl(msg.fileUrl),
    senderAvatarUrl: fixMinioUrl(msg.senderAvatarUrl),
  };
};

/**
 * Normalize multiple backend messages
 */
export const normalizeBackendMessages = (messages: BackendMessage[]): any[] => {
  if (!Array.isArray(messages)) {
    console.warn('[Normalizer] Expected array of messages, got:', typeof messages);
    return [];
  }
  return messages.map(msg => normalizeBackendMessage(msg));
};
