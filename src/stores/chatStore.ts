import { create } from 'zustand';
import type { Chat, Message } from '../types/api.types';
import { chatService } from '../services/chat.service';
import { messageService } from '../services/message.service';
import { normalizeChats } from '../utils/normalizers';

interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  error: string | null;

  // Chat methods
  loadChats: () => Promise<void>;
  setCurrentChat: (chat: Chat) => void;
  loadMessages: (chatId: string, page?: number) => Promise<void>;
  sendMessage: (chatId: string, receiverId: string | undefined, content: string, file?: File) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  currentChat: null,
  messages: [],
  isLoadingChats: false,
  isLoadingMessages: false,
  error: null,

  loadChats: async () => {
    set({ isLoadingChats: true, error: null });
    try {
      const rawChats = await chatService.getAllChats();
      console.log('[ChatStore] Raw chats from API:', rawChats);

      // Normalize chats to match frontend expectations
      const normalizedChats = normalizeChats(rawChats);
      console.log('[ChatStore] Normalized chats:', normalizedChats);
      console.log('[ChatStore] Chat types after normalization:', normalizedChats.map((c) => ({ id: c.id, name: c.name, type: c.type })));

      set({ chats: normalizedChats, isLoadingChats: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load chats';
      console.error('[ChatStore] Error loading chats:', error);
      set({ error: errorMessage, isLoadingChats: false });
    }
  },

  setCurrentChat: (chat: Chat) => {
    set({ currentChat: chat });
  },

  loadMessages: async (_chatId: string, _page = 1) => {
    set({ isLoadingMessages: true, error: null });
    try {
      // Note: Message loading is handled by the Dashboard component
      // This is a placeholder for future implementation
      set({ isLoadingMessages: false });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
      set({ error: errorMessage, isLoadingMessages: false });
    }
  },

  sendMessage: async (chatId: string, receiverId: string | undefined, content: string, file?: File) => {
    set({ error: null });
    try {
      const formData = new FormData();
      if (chatId) formData.append('chatId', chatId);
      if (receiverId) formData.append('receiverId', receiverId);
      if (content) formData.append('content', content);
      if (file) formData.append('attachment', file);

      const newMessage = await messageService.sendMessage(formData);
      set((state) => ({
        messages: [...state.messages, newMessage],
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send message';
      set({ error: errorMessage });
    }
  },

  editMessage: async (messageId: string, content: string) => {
    set({ error: null });
    try {
      const updatedMessage = await messageService.editMessage(messageId, content);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? updatedMessage : msg
        ),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to edit message';
      set({ error: errorMessage });
    }
  },

  deleteMessage: async (messageId: string) => {
    set({ error: null });
    try {
      await messageService.deleteMessage(messageId);
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== messageId),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete message';
      set({ error: errorMessage });
    }
  },

  addReaction: async (messageId: string, emoji: string) => {
    set({ error: null });
    try {
      await messageService.addReaction(messageId, emoji);
      // Optimistically update UI - reactions would be updated when messages are refreshed
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to add reaction';
      set({ error: errorMessage });
    }
  },

  removeReaction: async (messageId: string, emoji: string) => {
    set({ error: null });
    try {
      await messageService.removeReaction(messageId, emoji);
      // Optimistically update UI
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to remove reaction';
      set({ error: errorMessage });
    }
  },

  clearError: () => set({ error: null }),
}));
