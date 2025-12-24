// Authentication Types
export interface LoginCredentials {
  credential: string; // username or email
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface OTPResponse {
  success: boolean;
  message: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  otpCode: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeen: string;
  createdAt?: string;
  addMePolicy: 'everyone' | 'chatted' | 'nobody';
  isBlocked?: boolean;
}

// Chat Types
export type ChatType = 'dm' | 'group' | 'channel';

export interface Chat {
  id: string;
  name: string;
  type: ChatType;
  avatar?: string;
  description?: string;
  privacy?: 'public' | 'private';
  members: ChatMember[];
  lastMessage?: Message;
  unreadCount: number;
  isOnline?: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  // For GET /api/chats/{chatId} response
  messages?: BackendMessage[];
  participantsCount?: number;
  participantsOnline?: number;
  notificationsCount?: number;
}

// Backend message format from GET /api/chats/{chatId}
export interface BackendMessage {
  messageId: string;
  chatId?: string; // Present in SignalR messages
  content: string;
  fileUrl?: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  replyId?: string;
  sentAt: string;
  isSeen: boolean;
  seenAt?: string;
  isNotificated: boolean;
  notificationId: string;
  messageReactions: BackendReaction[];
  isCurrentUser: boolean;
  // Pinning fields
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedById?: string;
  pinnedByUsername?: string;
}

// Pinned message format from GET /api/messages/pinned/{chatId}
export interface PinnedMessage {
  messageId: string;
  content?: string;
  fileUrl?: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  sentAt: string;
  pinnedAt?: string;
  pinnedById?: string;
  pinnedByUsername?: string;
  messageReactions: BackendReaction[];
}

export interface BackendReaction {
  id?: string;
  reactionType: string;  // "Like", "Love", "Laugh", "Sad", "Angry"
  userId: string;
  userName: string;
  // Legacy support
  emoji?: string;
  type?: string;
}

export interface ChatMember {
  id: string;
  userId: string;
  user: User;
  joinedAt: string;
  role: 'admin' | 'moderator' | 'member';
}

// Message Types
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender: User;
  content: string;
  fileUrl?: string;
  attachment?: Attachment;
  reactions: Reaction[];
  replyTo?: Message;
  replyId?: string;
  edited: boolean;
  editedAt?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'file' | 'video';
  fileName: string;
  fileSize: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: User;
}

// Notification Types
export interface Notification {
  id: string; // notificationId from backend
  chatId: string;
  messageId: string;
  chatName: string;
  chatAvatar: string;
  senderName: string;
  content: string;
  fileUrl?: string;
  sentTime: string;
  seen?: boolean;
}

// Permission Types
export type PermissionType =
  | 'SendMessage'
  | 'ManageMessages'
  | 'AddUsers'
  | 'ManageUsers'
  | 'ManageChatInfo'
  | 'ManageBans'
  | 'PinMessages';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface UserPermission {
  userId: string;
  permissions: Permission[];
}

// API Error Response
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
