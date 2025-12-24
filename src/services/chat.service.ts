import api from './api';
import type { Chat } from '../types/api.types';
import { normalizeChats, normalizeChat } from '../utils/normalizers';
import { fixMinioUrl } from '../utils/helpers';

export const chatService = {
  getAllChats: async () => {
    const response = await api.get<any>('/chats/me');
    console.log('[ChatService] Raw API response:', response.data);
    const rawChats = response.data?.data || response.data;
    console.log('[ChatService] Extracted rawChats:', rawChats);
    console.log('[ChatService] First chat participantsCount:', rawChats?.[0]?.participantsCount);
    // Normalize to match frontend expectations
    const normalized = normalizeChats(rawChats);
    console.log('[ChatService] After normalization, first chat participantsCount:', normalized?.[0]?.participantsCount);
    return normalized;
  },

  getChat: async (chatId: string) => {
    const response = await api.get<any>(`/chats/${chatId}`);
    const rawChat = response.data?.data || response.data;
    console.log('[ChatService] getChat raw response:', {
      chatId,
      rawChat,
      hasMembers: !!rawChat?.members,
      membersLength: rawChat?.members?.length,
      members: rawChat?.members,
    });
    return normalizeChat(rawChat);
  },

  getChatProfile: async (chatId: string) => {
    const response = await api.get<any>(`/chats/${chatId}/profile`);
    const rawChat = response.data?.data || response.data;
    console.log('[ChatService] getChatProfile raw response:', {
      chatId,
      rawChat,
      hasMembers: !!rawChat?.members,
      membersLength: rawChat?.members?.length,
      hasParticipants: !!rawChat?.participants,
      participantsLength: rawChat?.participants?.length,
      createdById: rawChat?.createdById,
      ownerId: rawChat?.ownerId,
      CreatedById: rawChat?.CreatedById,
      OwnerId: rawChat?.OwnerId,
    });
    return normalizeChat(rawChat);
  },

  createGroup: async (formData: FormData) => {
    console.log('[ChatService] createGroup called');
    // Log FormData contents
    console.log('[ChatService] FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    // Don't set Content-Type - let axios/browser set it automatically with correct boundary
    const response = await api.post<any>('/groups', formData);
    console.log('[ChatService] createGroup raw response:', response);
    console.log('[ChatService] createGroup response.data:', response.data);
    const rawChat = response.data?.data || response.data;
    console.log('[ChatService] createGroup rawChat:', rawChat);
    return normalizeChat(rawChat);
  },

  createChannel: async (formData: FormData) => {
    console.log('[ChatService] createChannel called');
    // Log FormData contents
    console.log('[ChatService] FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    // Don't set Content-Type - let axios/browser set it automatically with correct boundary
    const response = await api.post<any>('/channels', formData);
    console.log('[ChatService] createChannel raw response:', response);
    console.log('[ChatService] createChannel response.data:', response.data);
    const rawChat = response.data?.data || response.data;
    console.log('[ChatService] createChannel rawChat:', rawChat);
    return normalizeChat(rawChat);
  },

  updateChat: async (chatId: string, chatType: 'group' | 'channel', formData: FormData) => {
    const endpoint = chatType === 'group' ? '/groups' : '/channels';
    // Log FormData contents for debugging
    console.log('[ChatService] updateChat FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
    }
    // Set Content-Type to undefined to remove the default 'application/json' header
    // This lets axios/browser set it automatically with correct multipart/form-data boundary
    const response = await api.put<any>(endpoint, formData, {
      params: { chatId },
      headers: { 'Content-Type': undefined },
    });
    console.log('[ChatService] updateChat response:', response.data);
    return response.data?.data || response.data;
  },

  deleteChat: async (chatId: string, chatType: 'group' | 'channel') => {
    const endpoint = chatType === 'group' ? '/groups' : '/channels';
    const response = await api.delete<any>(endpoint, {
      params: { chatId }
    });
    return response.data?.data || response.data;
  },

  deleteConversation: async (conversationId: string) => {
    const response = await api.delete<any>('/conversations', {
      params: { conversationId }
    });
    return response.data?.data || response.data;
  },

  joinChat: async (chatId: string, chatType: 'group' | 'channel') => {
    // Backend has different endpoints for groups and channels
    const endpoint = chatType === 'group' ? '/groups/join' : '/channels/join';
    const paramKey = chatType === 'group' ? 'groupId' : 'channelId';

    const response = await api.post<any>(endpoint, null, {
      params: { [paramKey]: chatId }
    });
    return response.data?.data || response.data;
  },

  leaveChat: async (chatId: string, chatType: 'group' | 'channel') => {
    // Backend uses POST method with chatId query parameter
    const endpoint = chatType === 'group' ? '/groups/leave' : '/channels/leave';
    const response = await api.post<any>(endpoint, null, {
      params: { chatId }
    });
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
        avatar: fixMinioUrl(item.avatarUrl || item.avatar || item.profileImage),
        description: item.description || '',
        memberCount: item.memberCount || item.participantsCount || 0,
      };
    });

    console.log('[ChatService] Normalized search results:', normalizedResults);
    return normalizedResults;
  },

  banUser: async (chatId: string, userId: string) => {
    const response = await api.post<any>(`/chats/ban/${userId}`, null, {
      params: { chatId }
    });
    return response.data?.data || response.data;
  },

  unbanUser: async (chatId: string, userId: string) => {
    const response = await api.post<any>(`/chats/unban/${userId}`, null, {
      params: { chatId }
    });
    return response.data?.data || response.data;
  },

  getBannedUsers: async (chatId: string) => {
    const response = await api.get<any>(`/chats/${chatId}/banned-users`);
    return response.data?.data || response.data || [];
  },

  addMemberToGroup: async (chatId: string, addingUserId: string) => {
    const response = await api.post<any>('/groups/add-member', null, {
      params: { chatId, addingUserId }
    });
    return response.data?.data || response.data;
  },

  addMemberToChannel: async (chatId: string, addingUserId: string) => {
    const response = await api.post<any>('/channels/add-member', null, {
      params: { chatId, addingUserId }
    });
    return response.data?.data || response.data;
  },

  removeMemberFromGroup: async (chatId: string, userId: string) => {
    const response = await api.post<any>('/groups/remove-member', null, {
      params: { chatId, removingUserId: userId }
    });
    return response.data?.data || response.data;
  },

  removeMemberFromChannel: async (chatId: string, userId: string) => {
    const response = await api.post<any>('/channels/remove-member', null, {
      params: { chatId, removingUserId: userId }
    });
    return response.data?.data || response.data;
  },

  updateChatPrivacy: async (chatId: string, privacyType: 'public' | 'private') => {
    // Backend expects: 0 = Public, 1 = Private as query parameters
    const numericPrivacy = privacyType === 'public' ? 0 : 1;
    const response = await api.put<any>('/chats/privacy-type', null, {
      params: { chatId, privacyType: numericPrivacy }
    });
    return response.data?.data || response.data;
  },

  addUserPermission: async (chatId: string, userId: string, permissionName: string) => {
    const response = await api.post<any>('/chats/add-user-permission', null, {
      params: { chatId, addingUserId: userId, permissionName }
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

        // Must set Content-Type to undefined so axios can auto-set multipart/form-data with boundary
        await api.post<any>('/messages/', formData, {
          headers: { 'Content-Type': undefined },
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

        // Must set Content-Type to undefined so axios can auto-set multipart/form-data with boundary
        const response = await api.post<any>('/messages/', formData, {
          headers: { 'Content-Type': undefined },
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
