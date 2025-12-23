import api from './api';

// Reaction types supported by the backend
export type ReactionType = 'Like' | 'Love' | 'Laugh' | 'Sad' | 'Angry';

// Map emoji to reaction type
export const EMOJI_TO_REACTION_TYPE: Record<string, ReactionType> = {
  '👍': 'Like',
  '❤️': 'Love',
  '😂': 'Laugh',
  '😢': 'Sad',
  '😡': 'Angry',
};

// Map reaction type to emoji (for display)
export const REACTION_TYPE_TO_EMOJI: Record<ReactionType, string> = {
  'Like': '👍',
  'Love': '❤️',
  'Laugh': '😂',
  'Sad': '😢',
  'Angry': '😡',
};

// All available reactions for the picker
export const AVAILABLE_REACTIONS: { emoji: string; type: ReactionType; label: string }[] = [
  { emoji: '👍', type: 'Like', label: 'Like' },
  { emoji: '❤️', type: 'Love', label: 'Love' },
  { emoji: '😂', type: 'Laugh', label: 'Laugh' },
  { emoji: '😢', type: 'Sad', label: 'Sad' },
  { emoji: '😡', type: 'Angry', label: 'Angry' },
];

export const messageService = {
  /**
   * Send a message to a chat or direct message
   * @param formData FormData containing chatId/receiverId and content
   */
  sendMessage: async (formData: FormData) => {
    try {
      console.log('[MessageService] sendMessage called');
      console.log('[MessageService] FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Must set Content-Type to undefined so axios can auto-set multipart/form-data with boundary
      const response = await api.post<any>('/messages', formData, {
        headers: { 'Content-Type': undefined },
      });
      console.log('[MessageService] Response:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('[MessageService] Error sending message:', error);
      throw error;
    }
  },

  /**
   * Edit an existing message
   * @param messageId Message ID
   * @param content New content
   */
  editMessage: async (messageId: string, content: string) => {
    // Backend expects FormData ([FromForm] attribute)
    // Must remove default Content-Type header so axios can set multipart/form-data with boundary
    const formData = new FormData();
    formData.append('Content', content);
    const response = await api.put<any>(`/messages/${messageId}`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data?.data || response.data;
  },

  /**
   * Delete a message
   * @param messageId Message ID
   */
  deleteMessage: async (messageId: string) => {
    const response = await api.delete<any>(`/messages/${messageId}`);
    return response.data?.data || response.data;
  },

  /**
   * Toggle a reaction on a message (add if not exists, remove if exists)
   * @param messageId Message ID
   * @param reactionType Reaction type (Like, Love, Laugh, Sad, Angry)
   * @returns true if added, false if removed
   */
  toggleReaction: async (messageId: string, reactionType: ReactionType): Promise<boolean> => {
    const response = await api.post<any>(`/messages/${messageId}/reactions/${reactionType}`);
    return response.data?.data ?? response.data;
  },

  /**
   * Toggle a reaction using emoji (maps to reaction type)
   * @param messageId Message ID
   * @param emoji Emoji to toggle
   */
  toggleReactionByEmoji: async (messageId: string, emoji: string): Promise<boolean> => {
    const reactionType = EMOJI_TO_REACTION_TYPE[emoji];
    if (!reactionType) {
      throw new Error(`Unknown emoji: ${emoji}`);
    }
    return messageService.toggleReaction(messageId, reactionType);
  },

  /**
   * Get reactions for a message
   * @param messageId Message ID
   */
  getReactions: async (messageId: string) => {
    const response = await api.get<any>(`/messages/${messageId}/reactions`);
    return response.data?.data || response.data || [];
  },

  /**
   * Pin a message
   * @param messageId Message ID
   */
  pinMessage: async (messageId: string) => {
    const response = await api.post<any>(`/messages/${messageId}/pin`);
    return response.data?.data || response.data;
  },

  /**
   * Unpin a message
   * @param messageId Message ID
   */
  unpinMessage: async (messageId: string) => {
    const response = await api.post<any>(`/messages/${messageId}/unpin`);
    return response.data?.data || response.data;
  },

  /**
   * Get pinned messages for a chat
   * @param chatId Chat ID
   */
  getPinnedMessages: async (chatId: string) => {
    const response = await api.get<any>(`/messages/pinned/${chatId}`);
    return response.data?.data || response.data;
  },
};
