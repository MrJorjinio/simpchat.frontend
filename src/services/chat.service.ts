import api from './api';
import type { Chat } from '../types/api.types';
import { normalizeChats, normalizeChat } from '../utils/normalizers';

export const chatService = {
  getAllChats: async () => {
    const response = await api.get<any>('/chats/me');
    const rawChats = response.data?.data || response.data;
    // Normalize to match frontend expectations
    return normalizeChats(rawChats);
  },

  getChat: async (chatId: string) => {
    const response = await api.get<any>(`/chats/${chatId}`);
    const rawChat = response.data?.data || response.data;
    return normalizeChat(rawChat);
  },

  getChatProfile: async (chatId: string) => {
    const response = await api.get<any>(`/chats/${chatId}/profile`);
    const rawChat = response.data?.data || response.data;
    return normalizeChat(rawChat);
  },

  createGroup: async (formData: FormData) => {
    const response = await api.post<any>('/groups', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const rawChat = response.data?.data || response.data;
    return normalizeChat(rawChat);
  },

  createChannel: async (formData: FormData) => {
    const response = await api.post<any>('/channels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const rawChat = response.data?.data || response.data;
    return normalizeChat(rawChat);
  },

  updateChat: async (chatId: string, formData: FormData) => {
    const response = await api.put<any>(`/groups/${chatId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data?.data || response.data;
  },

  deleteChat: async (chatId: string) => {
    const response = await api.delete<any>(`/groups/${chatId}`);
    return response.data?.data || response.data;
  },

  joinChat: async (chatId: string, chatType: 'group' | 'channel') => {
    // Backend has different endpoints for groups and channels
    const endpoint = chatType === 'group'
      ? `/groups/join?groupId=${chatId}`
      : `/channels/join?channelId=${chatId}`;

    const response = await api.post<any>(endpoint);
    return response.data?.data || response.data;
  },

  leaveChat: async (chatId: string) => {
    const response = await api.post<any>(`/chats/${chatId}/leave`);
    return response.data?.data || response.data;
  },

  searchChats: async (searchTerm: string) => {
    const response = await api.post<any>('/chats/search', {
      pageNumber: 1,
      pageSize: 10,
      searchTerm,
    });

    console.log('[ChatService] searchChats full response:', response);
    const rawData = response.data?.data;

    if (!Array.isArray(rawData)) {
      console.warn('[ChatService] Search returned non-array data:', rawData);
      return [];
    }

    // Normalize the search results - backend returns different type formats
    const normalizedResults = rawData.map((item: any) => {
      // Normalize chat type from backend values (Conversation, Group, Channel) to frontend values (dm, group, channel)
      const type = item.type || item.chatType;
      const normalized = String(type).toLowerCase().trim();

      let normalizedType: 'dm' | 'group' | 'channel' = 'channel';
      if (normalized === 'conversation' || normalized === 'dm' || normalized === 'directmessage') {
        normalizedType = 'dm';
      } else if (normalized === 'group') {
        normalizedType = 'group';
      } else if (normalized === 'channel') {
        normalizedType = 'channel';
      }

      return {
        id: item.id || item.entityId,
        name: item.name || item.displayName || 'Unknown',
        type: normalizedType,
        avatar: item.avatarUrl || item.avatar || item.profileImage,
        description: item.description || '',
        memberCount: item.memberCount || item.participantsCount || 0,
      };
    });

    console.log('[ChatService] Normalized search results:', normalizedResults);
    return normalizedResults;
  },

  banUser: async (chatId: string, userId: string) => {
    const response = await api.post<any>(`/chats/ban/${userId}`, { chatId });
    return response.data?.data || response.data;
  },

  unbanUser: async (chatId: string, userId: string) => {
    const response = await api.post<any>(`/chats/unban/${userId}`, { chatId });
    return response.data?.data || response.data;
  },

  addMemberToGroup: async (groupId: string, userId: string) => {
    const response = await api.post<any>('/groups/add-member', {
      groupId,
      userId,
    });
    return response.data?.data || response.data;
  },

  addMemberToChannel: async (channelId: string, userId: string) => {
    const response = await api.post<any>('/channels/add-member', {
      channelId,
      userId,
    });
    return response.data?.data || response.data;
  },

  updateChatPrivacy: async (chatId: string, privacyType: 'public' | 'private') => {
    const response = await api.put<any>('/chats/privacy-type', {
      chatId,
      privacyType,
    });
    return response.data?.data || response.data;
  },

  createOrGetDM: async (recipientId: string, initialMessage?: string) => {
    try {
      console.log('[ChatService] createOrGetDM called with:', {
        recipientId,
        recipientIdType: typeof recipientId,
        initialMessage,
        isRecipientIdValid: recipientId && recipientId !== 'undefined',
      });

      // Validate recipientId before proceeding
      if (!recipientId || recipientId === 'undefined') {
        throw new Error(`Invalid recipientId: ${recipientId}`);
      }

      // Fetch all chats to find existing DM
      const chats = await chatService.getAllChats();
      console.log('[ChatService] Fetched chats, looking for existing DM with recipient:', recipientId);

      // Find DM by checking both id and userId fields in members (API returns both)
      let dmChat: Chat | undefined = undefined;

      for (const chat of chats) {
        console.log('[ChatService] Checking chat:', { chatId: chat.id, type: chat.type, memberCount: chat.members?.length || 0 });

        if (chat.type !== 'dm') continue;

        // If chat has members, check them directly
        if (chat.members && chat.members.length > 0) {
          const hasMatch = chat.members.some((m: any) => {
            const match = m.userId === recipientId || m.id === recipientId || m.user?.id === recipientId;
            if (match) console.log('[ChatService] Found matching member:', m);
            return match;
          });

          if (hasMatch) {
            dmChat = chat;
            break;
          }
        } else {
          // Members array is empty - fetch full chat details to get members
          console.log('[ChatService] Members array empty for DM, fetching full details for chat:', chat.id);
          try {
            const fullChat = await chatService.getChat(chat.id);
            console.log('[ChatService] Full chat details:', { id: fullChat.id, memberCount: fullChat.members?.length || 0, members: fullChat.members?.map(m => ({ userId: m.userId, id: m.id })) });

            if (fullChat.members && fullChat.members.length > 0) {
              const hasMatch = fullChat.members.some((m: any) => {
                const match = m.userId === recipientId || m.id === recipientId || m.user?.id === recipientId;
                if (match) console.log('[ChatService] Found matching member in full chat:', m);
                return match;
              });

              if (hasMatch) {
                dmChat = fullChat;
                break;
              }
            }
          } catch (error) {
            console.error('[ChatService] Error fetching full chat details:', error);
          }
        }
      }

      console.log('[ChatService] DM chat found:', dmChat?.id || 'NOT FOUND');

      // If DM exists and we have an initial message, send it with chatId
      if (dmChat && initialMessage) {
        console.log('[ChatService] Sending to existing DM with chatId:', dmChat.id);
        const formData = new FormData();
        formData.append('chatId', dmChat.id);
        formData.append('content', initialMessage);

        console.log('[ChatService] FormData entries:', {
          chatId: dmChat.id,
          content: initialMessage,
        });

        await api.post<any>('/messages/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log('[ChatService] Message sent to existing DM:', dmChat.id);
        return dmChat;
      }

      // If DM doesn't exist but we have initial message, send with receiverId
      // Backend will auto-create the conversation
      if (!dmChat && initialMessage) {
        console.log('[ChatService] Creating new DM conversation with user:', recipientId);
        const formData = new FormData();
        formData.append('receiverId', recipientId);
        formData.append('content', initialMessage);

        console.log('[ChatService] FormData entries for new DM:', {
          receiverId: recipientId,
          content: initialMessage,
        });

        const response = await api.post<any>('/messages/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log('[ChatService] Message sent to new DM, conversation auto-created. Response:', response);

        // Re-fetch chats to get the newly created DM
        const updatedChats = await chatService.getAllChats();
        const newDmChat = updatedChats.find((chat: Chat) =>
          chat.type === 'dm' &&
          chat.members?.some((m: any) => m.id === recipientId || m.userId === recipientId)
        );

        console.log('[ChatService] Newly created DM:', newDmChat?.id || 'NOT FOUND');
        return newDmChat;
      }

      // No message to send, just return existing DM (or undefined if doesn't exist)
      console.log('[ChatService] No action taken (no message to send)');
      return dmChat;
    } catch (error) {
      console.error('[ChatService] Error in createOrGetDM:', error);
      throw error;
    }
  },
};
