import { create } from 'zustand';
import type { Chat, BackendMessage, PinnedMessage, PermissionType } from '../types/api.types';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import { extractErrorMessage } from '../utils/errorHandler';
import { useAuthStore } from './authStore';

interface TypingUser {
  userId: string;
  timestamp: number;
}

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: BackendMessage[];
  pinnedMessages: Map<string, PinnedMessage[]>; // chatId -> pinned messages
  chatPermissions: Map<string, string[]>; // chatId -> permission names
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isLoadingPinned: boolean;
  permissionsLoading: boolean;
  error: string | null;
  typingUsers: Map<string, TypingUser>; // chatId -> typing user info
  onlineUsers: Map<string, boolean>; // userId -> isOnline
  userLastSeen: Map<string, string>; // userId -> lastSeen ISO string

  // Chat methods
  loadChats: () => Promise<void>;
  setCurrentChat: (chat: Chat | null) => void;
  setMessages: (messages: BackendMessage[]) => void;
  loadMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (chatId: string, receiverId: string | undefined, content: string, file?: File) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<boolean>;
  clearError: () => void;

  // Pinned messages methods
  loadPinnedMessages: (chatId: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  getPinnedMessages: (chatId: string) => PinnedMessage[];

  // Permission methods
  loadPermissions: (chatId: string) => Promise<void>;
  hasPermission: (chatId: string, permission: PermissionType) => boolean;
  clearPermissions: (chatId?: string) => void;
  grantPermission: (chatId: string, permissionName: string) => void;
  revokePermission: (chatId: string, permissionName: string) => void;

  // Online status helpers
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => string | undefined;
  getOnlineMembersCount: (chatId: string) => number;
  setInitialPresenceStates: (presenceStates: Record<string, boolean>) => void;

  // Real-time event handlers
  handleReceiveMessage: (message: any) => void;
  handleMessageEdited: (data: { messageId: string; content: string; editedAt: string }) => void;
  handleMessageDeleted: (data: { messageId: string }) => void;
  handleReactionAdded: (data: { messageId: string; reactionType: string; userId: string; chatId: string }) => void;
  handleReactionRemoved: (data: { messageId: string; reactionType: string; userId: string; chatId: string }) => void;
  handleUserOnline: (data: { userId: string; isOnline: boolean }) => void;
  handleUserOffline: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void;
  handleUserTyping: (data: { userId: string; chatId: string }) => void;
  handleUserStoppedTyping: (data: { userId: string; chatId: string }) => void;
  handleMessagePinned: (data: { messageId: string; chatId: string; pinnedById: string; pinnedByUsername: string; pinnedAt: string }) => void;
  handleMessageUnpinned: (data: { messageId: string; chatId: string }) => void;
  handleAddedToChat: (data: { chatId: string; chatName: string; chatType: string; chatAvatarUrl?: string }) => void;
  handleNewConversation: (data: { conversationId: string; senderId: string; senderUsername: string; senderAvatarUrl?: string }) => void;
  handleConversationCreated: (data: { conversationId: string; receiverId: string; receiverUsername: string; receiverAvatarUrl?: string }) => void;

  // Permission real-time handlers
  handlePermissionGranted: (data: { chatId: string; userId: string; permissionName: string }) => void;
  handlePermissionRevoked: (data: { chatId: string; userId: string; permissionName: string }) => void;
  handleAllPermissionsRevoked: (data: { chatId: string; userId: string }) => void;

  // Block real-time handlers
  handleUserBlockedYou: (data: { blockerId: string }) => void;
  handleYouBlockedUser: (data: { blockedUserId?: string }) => void;
  handleUserUnblockedYou: (data: { unblockerId: string }) => void;
  handleYouUnblockedUser: (data: { unblockedUserId?: string }) => void;

  // Chat deletion real-time handlers
  handleChatDeleted: (data: { chatId: string }) => void;
  handleRemovedFromChat: (data: { chatId: string }) => void;

  // Read receipt real-time handlers
  handleMessagesMarkedSeen: (data: { chatId: string; messageIds: string[]; seenByUserId: string; seenAt: string }) => void;

  // Unread count management
  resetUnreadCount: (chatId: string) => void;

  // Block status tracking
  blockedByUsers: Set<string>; // userIds who blocked the current user
  usersYouBlocked: Set<string>; // userIds that the current user blocked
  isBlockedBy: (userId: string) => boolean;
  hasBlocked: (userId: string) => boolean;
  addBlockedUser: (userId: string) => void;
  removeBlockedUser: (userId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  pinnedMessages: new Map(),
  chatPermissions: new Map(),
  isLoadingChats: false,
  isLoadingMessages: false,
  isLoadingPinned: false,
  permissionsLoading: false,
  error: null,
  typingUsers: new Map(),
  onlineUsers: new Map(),
  userLastSeen: new Map(),
  blockedByUsers: new Set(),
  usersYouBlocked: new Set(),

  loadChats: async () => {
    set({ isLoadingChats: true, error: null });
    try {
      // chatService.getAllChats() already normalizes the chats
      const chats = await chatService.getAllChats();
      console.log('[ChatStore] Chats from API (already normalized):', chats);
      console.log('[ChatStore] Sample chat participantsCount:', chats[0]?.participantsCount, chats[0]?.name);

      set({ chats, isLoadingChats: false });
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to load chats');
      console.error('[ChatStore] Error loading chats:', error);
      set({ error: errorMessage, isLoadingChats: false });
    }
  },

  setCurrentChat: (chat: Chat | null) => {
    console.log('[ChatStore] setCurrentChat called with:', {
      chatId: chat?.id,
      chatName: chat?.name,
      participantsCount: chat?.participantsCount,
      membersLength: chat?.members?.length,
    });
    set({ currentChat: chat });
  },

  setMessages: (messages: BackendMessage[]) => {
    set({ messages });
  },

  loadMessages: async (chatId: string, _page = 1) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const { chatService } = await import('../services/chat.service');
      const chatData = await chatService.getChat(chatId);
      set({ messages: chatData.messages || [], isLoadingMessages: false });
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to load messages');
      set({ error: errorMessage, isLoadingMessages: false });
    }
  },

  sendMessage: async (chatId: string, receiverId: string | undefined, content: string, file?: File) => {
    set({ error: null });
    try {
      if (file) {
        // File messages: use HTTP API (required for multipart/form-data)
        const formData = new FormData();
        if (chatId) formData.append('chatId', chatId);
        if (receiverId) formData.append('receiverId', receiverId);
        if (content) formData.append('content', content);
        formData.append('file', file);

        const newMessage = await messageService.sendMessage(formData);
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      } else {
        // Text-only messages: use SignalR for real-time delivery
        // Note: SignalR will broadcast the message to all participants
        // The message will be received via handleReceiveMessage
        const signalRService = await import('../services/signalr.service').then(m => m.signalRService);
        await signalRService.sendMessage(chatId, content, receiverId || undefined, null);
        // Don't add to local state - let SignalR broadcast handle it
      }
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to send message');
      set({ error: errorMessage });
    }
  },

  editMessage: async (messageId: string, content: string) => {
    set({ error: null });
    try {
      const updatedMessage = await messageService.editMessage(messageId, content);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.messageId === messageId ? updatedMessage : msg
        ),
      }));
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to edit message');
      set({ error: errorMessage });
    }
  },

  deleteMessage: async (messageId: string) => {
    set({ error: null });
    try {
      await messageService.deleteMessage(messageId);
      set((state) => ({
        messages: state.messages.filter((msg) => msg.messageId !== messageId),
      }));
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to delete message');
      set({ error: errorMessage });
    }
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    set({ error: null });
    try {
      const wasAdded = await messageService.toggleReactionByEmoji(messageId, emoji);
      // Returns true if reaction was added, false if removed
      return wasAdded;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to toggle reaction');
      set({ error: errorMessage });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // Pinned messages methods
  loadPinnedMessages: async (chatId: string) => {
    set({ isLoadingPinned: true });
    try {
      const pinned = await messageService.getPinnedMessages(chatId);
      set((state) => {
        const newPinnedMessages = new Map(state.pinnedMessages);
        newPinnedMessages.set(chatId, pinned || []);
        return { pinnedMessages: newPinnedMessages, isLoadingPinned: false };
      });
    } catch (error: any) {
      console.error('[ChatStore] Error loading pinned messages:', error);
      set({ isLoadingPinned: false });
    }
  },

  pinMessage: async (messageId: string) => {
    try {
      await messageService.pinMessage(messageId);
      // SignalR will broadcast the update
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to pin message');
      set({ error: errorMessage });
      throw error;
    }
  },

  unpinMessage: async (messageId: string) => {
    try {
      await messageService.unpinMessage(messageId);
      // SignalR will broadcast the update
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to unpin message');
      set({ error: errorMessage });
      throw error;
    }
  },

  getPinnedMessages: (chatId: string) => {
    return get().pinnedMessages.get(chatId) || [];
  },

  // Permission methods
  loadPermissions: async (chatId: string) => {
    const { user } = useAuthStore.getState();
    console.log('[loadPermissions] Called with:', { chatId, userId: user?.id, username: user?.username });
    if (!user || !chatId) {
      console.log('[loadPermissions] Early return - no user or chatId');
      return;
    }

    set({ permissionsLoading: true });
    try {
      const { permissionService } = await import('../services/permission.service');
      console.log('[loadPermissions] Calling API: GET /permissions/', chatId, '/user/', user.id);
      const response = await permissionService.getUserPermissions(chatId, user.id);
      console.log('[loadPermissions] API response:', response);

      // Backend returns { userId, username, chatId, permissions: [{ permissionId, permissionName }] }
      const permissionsArray = response?.permissions || response || [];
      const permissions = Array.isArray(permissionsArray)
        ? permissionsArray.map((p: any) => p.permissionName || p.name || p)
        : [];

      console.log('[ChatStore] Loaded permissions for chat', chatId, ':', permissions);

      set(state => ({
        chatPermissions: new Map(state.chatPermissions).set(chatId, permissions),
        permissionsLoading: false,
      }));
    } catch (error) {
      console.error('[ChatStore] Failed to load permissions:', error);
      // Set empty permissions on error (user has no permissions)
      set(state => ({
        chatPermissions: new Map(state.chatPermissions).set(chatId, []),
        permissionsLoading: false,
      }));
    }
  },

  hasPermission: (chatId: string, permission: PermissionType) => {
    const { currentChat, chatPermissions } = get();
    const { user } = useAuthStore.getState();

    console.log('[hasPermission] Checking permission:', {
      chatId,
      permission,
      currentChatId: currentChat?.id,
      currentChatType: currentChat?.type,
      userId: user?.id,
      createdById: currentChat?.createdById,
      membersCount: currentChat?.members?.length,
    });

    // DMs have no permission restrictions for messaging
    if (currentChat?.type === 'dm') {
      // For DMs, allow all messaging-related permissions
      if (['SendMessage', 'PinMessages'].includes(permission)) {
        console.log('[hasPermission] DM chat - allowing:', permission);
        return true;
      }
      // But not management permissions
      return false;
    }

    // Check if user is the chat creator (has all permissions)
    if (currentChat && user && currentChat.createdById === user.id) {
      console.log('[hasPermission] User is chat creator - granting all permissions');
      return true;
    }

    // Admins have all permissions implicitly
    if (currentChat && user && currentChat.members) {
      const currentMember = currentChat.members.find(m => m.userId === user.id);
      console.log('[hasPermission] Current member:', {
        found: !!currentMember,
        memberId: currentMember?.userId,
        role: currentMember?.role,
      });
      // Check for admin role case-insensitively
      const role = currentMember?.role?.toLowerCase();
      if (role === 'admin' || role === 'owner') {
        console.log('[hasPermission] User has admin/owner role - granting all permissions');
        return true;
      }
    }

    // Check cached permissions from API
    const permissions = chatPermissions.get(chatId) || [];
    const hasIt = permissions.includes(permission);
    console.log('[hasPermission] Checking cached permissions:', {
      cachedPermissions: permissions,
      hasPermission: hasIt,
    });
    return hasIt;
  },

  clearPermissions: (chatId?: string) => {
    if (chatId) {
      set(state => {
        const newMap = new Map(state.chatPermissions);
        newMap.delete(chatId);
        return { chatPermissions: newMap };
      });
    } else {
      set({ chatPermissions: new Map() });
    }
  },

  grantPermission: (chatId: string, permissionName: string) => {
    console.log('[ChatStore] Granting permission:', { chatId, permissionName });
    set((state) => {
      const newPermissions = new Map(state.chatPermissions);
      const currentPerms = newPermissions.get(chatId) || [];
      if (!currentPerms.includes(permissionName)) {
        newPermissions.set(chatId, [...currentPerms, permissionName]);
      }
      return { chatPermissions: newPermissions };
    });
  },

  revokePermission: (chatId: string, permissionName: string) => {
    console.log('[ChatStore] Revoking permission:', { chatId, permissionName });
    set((state) => {
      const newPermissions = new Map(state.chatPermissions);
      const currentPerms = newPermissions.get(chatId) || [];
      newPermissions.set(chatId, currentPerms.filter(p => p !== permissionName));
      return { chatPermissions: newPermissions };
    });
  },

  // Online status helpers
  isUserOnline: (userId: string) => {
    return get().onlineUsers.get(userId) || false;
  },

  getUserLastSeen: (userId: string) => {
    return get().userLastSeen.get(userId);
  },

  getOnlineMembersCount: (chatId: string) => {
    const chat = get().chats.find((c) => c.id === chatId);
    if (!chat || !chat.members) return 0;

    let onlineCount = 0;
    const onlineUsers = get().onlineUsers;

    for (const member of chat.members) {
      if (onlineUsers.get(member.userId)) {
        onlineCount++;
      }
    }

    return onlineCount;
  },

  setInitialPresenceStates: (presenceStates: Record<string, { isOnline: boolean; lastSeen?: string }> | Record<string, boolean>) => {
    console.log('[ChatStore] Setting initial presence states for', Object.keys(presenceStates).length, 'users');
    console.log('[ChatStore] Raw presence states:', presenceStates);

    const newOnlineUsers = new Map<string, boolean>();
    const newLastSeenMap = new Map<string, string>();

    Object.entries(presenceStates).forEach(([userId, state]) => {
      console.log(`[ChatStore] Processing user ${userId}, state:`, state, 'type:', typeof state);
      if (typeof state === 'boolean') {
        // Legacy support: state is just a boolean
        newOnlineUsers.set(userId, state);
        console.log(`[ChatStore] Set user ${userId} to ${state ? 'online' : 'offline'}`);
      } else {
        // New format: state is an object with isOnline and lastSeen
        newOnlineUsers.set(userId, state.isOnline);
        if (state.lastSeen) {
          newLastSeenMap.set(userId, state.lastSeen);
        }
        console.log(`[ChatStore] Set user ${userId} to ${state.isOnline ? 'online' : 'offline'}, lastSeen: ${state.lastSeen || 'none'}`);
      }
    });

    set({
      onlineUsers: newOnlineUsers,
      userLastSeen: newLastSeenMap
    });

    console.log('[ChatStore] Presence states initialized:', {
      online: Array.from(newOnlineUsers.entries()).filter(([_, v]) => v).length,
      total: newOnlineUsers.size,
      onlineUserIds: Array.from(newOnlineUsers.entries()).filter(([_, v]) => v).map(([id]) => id)
    });
  },

  // Real-time event handlers
  handleReceiveMessage: (message: any) => {
    console.log('[ChatStore] Received message:', message);
    const state = get();
    const currentUserId = useAuthStore.getState().user?.id;

    // Add message to state if it's for the current chat
    if (state.currentChat && message.chatId === state.currentChat.id) {
      // Check if message already exists (avoid duplicates)
      const exists = state.messages.some(m => m.messageId === message.messageId);
      if (!exists) {
        const newMessage: BackendMessage = {
          messageId: message.messageId,
          chatId: message.chatId,
          senderId: message.senderId,
          senderUsername: message.senderUsername || 'Unknown',
          senderAvatarUrl: message.senderAvatarUrl,
          content: message.content,
          fileUrl: message.fileUrl,
          replyId: message.replyId,
          sentAt: message.sentAt,
          isSeen: message.isSeen ?? false,
          seenAt: message.seenAt,
          isNotificated: false,
          notificationId: '',
          messageReactions: [],
          isCurrentUser: message.senderId === currentUserId,
        };
        set({ messages: [...state.messages, newMessage] });
        console.log('[ChatStore] Added new message to state, isCurrentUser:', newMessage.isCurrentUser);
      }
    }

    // Update chat list to show new last message
    get().loadChats();
  },

  handleMessageEdited: (data) => {
    console.log('[ChatStore] Message edited:', data);
    set((state) => ({
      messages: state.messages.map(m =>
        m.messageId === data.messageId
          ? { ...m, content: data.content }
          : m
      ),
    }));
  },

  handleMessageDeleted: (data) => {
    console.log('[ChatStore] Message deleted:', data);
    set((state) => ({
      messages: state.messages.filter(m => m.messageId !== data.messageId),
    }));
  },

  handleReactionAdded: (data: { messageId: string; reactionType: string; userId: string; chatId: string }) => {
    console.log('[ChatStore] Reaction added event received:', data);
    const state = get();
    console.log('[ChatStore] Current messages count:', state.messages.length);
    console.log('[ChatStore] Looking for messageId:', data.messageId);
    const foundMessage = state.messages.find(m => m.messageId === data.messageId);
    console.log('[ChatStore] Found message:', foundMessage ? 'YES' : 'NO');

    if (foundMessage) {
      set((state) => ({
        messages: state.messages.map(m =>
          m.messageId === data.messageId
            ? {
                ...m,
                messageReactions: [
                  ...(m.messageReactions || []),
                  { reactionType: data.reactionType, userId: data.userId, userName: '' }
                ]
              }
            : m
        ),
      }));
      console.log('[ChatStore] Reaction added to message');
    }
  },

  handleReactionRemoved: (data: { messageId: string; reactionType: string; userId: string; chatId: string }) => {
    console.log('[ChatStore] Reaction removed:', data);
    set((state) => ({
      messages: state.messages.map(m =>
        m.messageId === data.messageId
          ? {
              ...m,
              messageReactions: (m.messageReactions || []).filter(
                r => !(r.userId === data.userId && r.reactionType === data.reactionType)
              )
            }
          : m
      ),
    }));
  },

  handleUserOnline: (data) => {
    console.log('[ChatStore] User online:', data);
    // Update user status in chats list and online tracking Maps
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      newOnlineUsers.set(data.userId, true);

      const newLastSeen = new Map(state.userLastSeen);
      newLastSeen.delete(data.userId); // Clear lastSeen when online

      return {
        onlineUsers: newOnlineUsers,
        userLastSeen: newLastSeen,
        chats: state.chats.map(chat => {
          // Check if this user is in the chat
          const hasMember = chat.members?.some(m => m.userId === data.userId);

          if (hasMember) {
            return {
              ...chat,
              // Update chat-level isOnline for DMs
              isOnline: chat.type === 'dm' ? true : chat.isOnline,
              // Update member-level status
              members: chat.members?.map(m =>
                m.userId === data.userId
                  ? { ...m, user: { ...m.user, onlineStatus: 'online' as const, lastSeen: '' } }
                  : m
              ),
            };
          }
          return chat;
        }),
      };
    });
  },

  handleUserOffline: (data) => {
    console.log('[ChatStore] User offline:', data);
    // Update user status in chats list and online tracking Maps
    set((state) => {
      const newOnlineUsers = new Map(state.onlineUsers);
      newOnlineUsers.set(data.userId, false);

      const newLastSeen = new Map(state.userLastSeen);
      if (data.lastSeen) {
        newLastSeen.set(data.userId, data.lastSeen);
      }

      return {
        onlineUsers: newOnlineUsers,
        userLastSeen: newLastSeen,
        chats: state.chats.map(chat => {
          const hasMember = chat.members?.some(m => m.userId === data.userId);

          if (hasMember) {
            return {
              ...chat,
              // Update chat-level isOnline for DMs
              isOnline: chat.type === 'dm' ? false : chat.isOnline,
              // Update member-level status
              members: chat.members?.map(m =>
                m.userId === data.userId
                  ? { ...m, user: { ...m.user, onlineStatus: 'offline' as const, lastSeen: data.lastSeen } }
                  : m
              ),
            };
          }
          return chat;
        }),
      };
    });
  },

  handleUserTyping: (data) => {
    console.log('[ChatStore] User typing:', data);
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.set(`${data.chatId}-${data.userId}`, {
        userId: data.userId,
        timestamp: Date.now(),
      });
      return { typingUsers: newTypingUsers };
    });

    // Auto-remove typing indicator after 3 seconds
    setTimeout(() => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        newTypingUsers.delete(`${data.chatId}-${data.userId}`);
        return { typingUsers: newTypingUsers };
      });
    }, 3000);
  },

  handleUserStoppedTyping: (data) => {
    console.log('[ChatStore] User stopped typing:', data);
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.delete(`${data.chatId}-${data.userId}`);
      return { typingUsers: newTypingUsers };
    });
  },

  handleMessagePinned: (data) => {
    console.log('[ChatStore] Message pinned:', data);

    // Update the message in the messages list
    set((state) => ({
      messages: state.messages.map(m =>
        m.messageId === data.messageId
          ? { ...m, isPinned: true, pinnedAt: data.pinnedAt, pinnedById: data.pinnedById, pinnedByUsername: data.pinnedByUsername }
          : m
      ),
    }));

    // Reload pinned messages for this chat
    get().loadPinnedMessages(data.chatId);
  },

  handleMessageUnpinned: (data) => {
    console.log('[ChatStore] Message unpinned:', data);

    // Update the message in the messages list
    set((state) => ({
      messages: state.messages.map(m =>
        m.messageId === data.messageId
          ? { ...m, isPinned: false, pinnedAt: undefined, pinnedById: undefined, pinnedByUsername: undefined }
          : m
      ),
    }));

    // Remove from pinned messages
    set((state) => {
      const newPinnedMessages = new Map(state.pinnedMessages);
      const chatPinned = newPinnedMessages.get(data.chatId) || [];
      newPinnedMessages.set(data.chatId, chatPinned.filter(m => m.messageId !== data.messageId));
      return { pinnedMessages: newPinnedMessages };
    });
  },

  handleAddedToChat: (data) => {
    console.log('[ChatStore] Added to chat:', data);
    // Reload chats to get the new group/channel in the sidebar
    get().loadChats();
  },

  handleNewConversation: (data) => {
    console.log('[ChatStore] New conversation:', data);
    // Reload chats to get the new conversation in the sidebar
    get().loadChats();
  },

  handleConversationCreated: async (data) => {
    console.log('[ChatStore] Conversation created (sender notification):', data);
    const state = get();

    // Check if current chat is a temp DM for the same receiver
    const currentChat = state.currentChat;
    if (currentChat && currentChat.id.startsWith('temp_dm_') && currentChat.id.includes(data.receiverId)) {
      console.log('[ChatStore] Switching from temp chat to real conversation:', data.conversationId);

      // Reload chats to get the new conversation
      await get().loadChats();

      // Find the new conversation in the chats list
      const updatedState = get();
      const newChat = updatedState.chats.find(c => c.id === data.conversationId);

      if (newChat) {
        console.log('[ChatStore] Found new conversation, switching to it:', newChat.id);
        set({ currentChat: newChat });

        // Join the new chat group via SignalR
        try {
          const signalRService = await import('../services/signalr.service').then(m => m.signalRService);
          await signalRService.joinChat(newChat.id);
        } catch (error) {
          console.error('[ChatStore] Failed to join new chat:', error);
        }
      }
    } else {
      // Just reload chats to update the sidebar
      get().loadChats();
    }
  },

  // Permission real-time handlers
  handlePermissionGranted: (data) => {
    console.log('[ChatStore] Permission granted:', data);
    const { user } = useAuthStore.getState();

    // Only update if this is for the current user
    if (user && data.userId === user.id) {
      set((state) => {
        const newPermissions = new Map(state.chatPermissions);
        const currentPerms = newPermissions.get(data.chatId) || [];
        if (!currentPerms.includes(data.permissionName)) {
          newPermissions.set(data.chatId, [...currentPerms, data.permissionName]);
        }
        return { chatPermissions: newPermissions };
      });
    }
  },

  handlePermissionRevoked: (data) => {
    console.log('[ChatStore] Permission revoked:', data);
    const { user } = useAuthStore.getState();

    // Only update if this is for the current user
    if (user && data.userId === user.id) {
      set((state) => {
        const newPermissions = new Map(state.chatPermissions);
        const currentPerms = newPermissions.get(data.chatId) || [];
        newPermissions.set(data.chatId, currentPerms.filter(p => p !== data.permissionName));
        return { chatPermissions: newPermissions };
      });
    }
  },

  handleAllPermissionsRevoked: (data) => {
    console.log('[ChatStore] All permissions revoked:', data);
    const { user } = useAuthStore.getState();

    // Only update if this is for the current user
    if (user && data.userId === user.id) {
      set((state) => {
        const newPermissions = new Map(state.chatPermissions);
        newPermissions.set(data.chatId, []);
        return { chatPermissions: newPermissions };
      });
    }
  },

  // Block real-time handlers
  handleUserBlockedYou: (data) => {
    console.log('[ChatStore] User blocked you:', data);
    set((state) => {
      const newBlockedBy = new Set(state.blockedByUsers);
      newBlockedBy.add(data.blockerId);
      return { blockedByUsers: newBlockedBy };
    });
  },

  handleYouBlockedUser: (data) => {
    console.log('[ChatStore] You blocked user:', data);
    if (data.blockedUserId) {
      set((state) => {
        const newUsersBlocked = new Set(state.usersYouBlocked);
        newUsersBlocked.add(data.blockedUserId!);
        return { usersYouBlocked: newUsersBlocked };
      });
    }
  },

  handleUserUnblockedYou: (data) => {
    console.log('[ChatStore] User unblocked you:', data);
    set((state) => {
      const newBlockedBy = new Set(state.blockedByUsers);
      newBlockedBy.delete(data.unblockerId);
      return { blockedByUsers: newBlockedBy };
    });
  },

  handleYouUnblockedUser: (data) => {
    console.log('[ChatStore] You unblocked user:', data);
    if (data.unblockedUserId) {
      set((state) => {
        const newUsersBlocked = new Set(state.usersYouBlocked);
        newUsersBlocked.delete(data.unblockedUserId!);
        return { usersYouBlocked: newUsersBlocked };
      });
    }
  },

  // Chat deletion real-time handlers
  handleChatDeleted: (data) => {
    console.log('[ChatStore] Chat deleted:', data);
    const state = get();

    // Remove chat from list
    set({
      chats: state.chats.filter(c => c.id !== data.chatId),
      // If current chat is deleted, clear it
      currentChat: state.currentChat?.id === data.chatId ? null : state.currentChat,
      // Clear messages if this was the current chat
      messages: state.currentChat?.id === data.chatId ? [] : state.messages,
    });

    // Clear permissions for deleted chat
    set((state) => {
      const newPermissions = new Map(state.chatPermissions);
      newPermissions.delete(data.chatId);
      return { chatPermissions: newPermissions };
    });
  },

  handleRemovedFromChat: (data) => {
    console.log('[ChatStore] Removed from chat:', data);
    const state = get();

    // Remove chat from list
    set({
      chats: state.chats.filter(c => c.id !== data.chatId),
      // If current chat is the one we were removed from, clear it
      currentChat: state.currentChat?.id === data.chatId ? null : state.currentChat,
      // Clear messages if this was the current chat
      messages: state.currentChat?.id === data.chatId ? [] : state.messages,
    });

    // Clear permissions for this chat
    set((state) => {
      const newPermissions = new Map(state.chatPermissions);
      newPermissions.delete(data.chatId);
      return { chatPermissions: newPermissions };
    });
  },

  // Read receipt handler
  handleMessagesMarkedSeen: (data) => {
    console.log('[ChatStore] Messages marked as seen:', data);
    const state = get();

    // Update messages if this is for the current chat
    if (state.currentChat && data.chatId === state.currentChat.id) {
      set({
        messages: state.messages.map(m =>
          data.messageIds.includes(m.messageId)
            ? { ...m, isSeen: true, seenAt: data.seenAt }
            : m
        ),
      });
    }

    // Update unreadCount for the chat in the chats list
    // When messages are marked as seen, reduce the unread count
    const currentUserId = useAuthStore.getState().user?.id;
    if (currentUserId && data.seenByUserId === currentUserId) {
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === data.chatId
            ? { ...chat, unreadCount: Math.max(0, (chat.unreadCount || 0) - data.messageIds.length) }
            : chat
        ),
        // Also update currentChat if it's the one being marked
        currentChat:
          state.currentChat?.id === data.chatId
            ? { ...state.currentChat, unreadCount: Math.max(0, (state.currentChat.unreadCount || 0) - data.messageIds.length) }
            : state.currentChat,
      }));
    }
  },

  // Reset unread count for a chat (called when opening a chat)
  resetUnreadCount: (chatId: string) => {
    console.log('[ChatStore] Resetting unread count for chat:', chatId);
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ),
      currentChat:
        state.currentChat?.id === chatId
          ? { ...state.currentChat, unreadCount: 0 }
          : state.currentChat,
    }));
  },

  // Block status helpers
  isBlockedBy: (userId: string) => {
    return get().blockedByUsers.has(userId);
  },

  hasBlocked: (userId: string) => {
    return get().usersYouBlocked.has(userId);
  },

  addBlockedUser: (userId: string) => {
    console.log('[ChatStore] Adding blocked user:', userId);
    set((state) => {
      const newUsersBlocked = new Set(state.usersYouBlocked);
      newUsersBlocked.add(userId);
      return { usersYouBlocked: newUsersBlocked };
    });
  },

  removeBlockedUser: (userId: string) => {
    console.log('[ChatStore] Removing blocked user:', userId);
    set((state) => {
      const newUsersBlocked = new Set(state.usersYouBlocked);
      newUsersBlocked.delete(userId);
      return { usersYouBlocked: newUsersBlocked };
    });
  },
}));
