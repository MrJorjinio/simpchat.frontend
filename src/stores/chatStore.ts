import { create } from 'zustand';
import type { Chat, BackendMessage } from '../types/api.types';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import { extractErrorMessage } from '../utils/errorHandler';

interface TypingUser {
  userId: string;
  timestamp: number;
}

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: BackendMessage[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
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
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  clearError: () => void;

  // Online status helpers
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => string | undefined;
  getOnlineMembersCount: (chatId: string) => number;
  setInitialPresenceStates: (presenceStates: Record<string, boolean>) => void;

  // Real-time event handlers
  handleReceiveMessage: (message: any) => void;
  handleMessageEdited: (data: { messageId: string; content: string; editedAt: string }) => void;
  handleMessageDeleted: (data: { messageId: string }) => void;
  handleReactionAdded: (data: { messageId: string; reactionId: string; userId: string; chatId: string }) => void;
  handleReactionRemoved: (data: { messageId: string; userId: string }) => void;
  handleUserOnline: (data: { userId: string; isOnline: boolean }) => void;
  handleUserOffline: (data: { userId: string; isOnline: boolean; lastSeen: string }) => void;
  handleUserTyping: (data: { userId: string; chatId: string }) => void;
  handleUserStoppedTyping: (data: { userId: string; chatId: string }) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  error: null,
  typingUsers: new Map(),
  onlineUsers: new Map(),
  userLastSeen: new Map(),

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

  loadMessages: async (_chatId: string, _page = 1) => {
    set({ isLoadingMessages: true, error: null });
    try {
      // Note: Message loading is handled by the Dashboard component
      // This is a placeholder for future implementation
      set({ isLoadingMessages: false });
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

  addReaction: async (messageId: string, emoji: string) => {
    set({ error: null });
    try {
      await messageService.addReaction(messageId, emoji);
      // Optimistically update UI - reactions would be updated when messages are refreshed
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to add reaction');
      set({ error: errorMessage });
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    set({ error: null });
    try {
      await messageService.removeReaction(messageId, emoji);
      // Optimistically update UI
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Failed to remove reaction');
      set({ error: errorMessage });
    }
  },

  clearError: () => set({ error: null }),

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
          isSeen: false,
          isNotificated: false,
          notificationId: '',
          messageReactions: [],
          isCurrentUser: false, // Will be determined by UI
        };
        set({ messages: [...state.messages, newMessage] });
        console.log('[ChatStore] Added new message to state');
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

  handleReactionAdded: (data: { messageId: string; reactionId: string; userId: string; chatId: string }) => {
    console.log('[ChatStore] Reaction added:', data);
    // Backend doesn't send emoji/userName in the event, so we add a placeholder
    // The full reaction data will be available when messages are reloaded
    set((state) => ({
      messages: state.messages.map(m =>
        m.messageId === data.messageId
          ? {
              ...m,
              messageReactions: [
                ...(m.messageReactions || []),
                { id: data.reactionId, emoji: '', userId: data.userId, userName: '' }
              ]
            }
          : m
      ),
    }));
  },

  handleReactionRemoved: (data) => {
    console.log('[ChatStore] Reaction removed:', data);
    // For now just log - proper implementation would need reaction ID
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
}));
