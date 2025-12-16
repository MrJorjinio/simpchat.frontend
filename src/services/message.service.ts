import api from './api';

// Reaction emoji to GUID mapping (cached after first load)
let EMOJI_TO_REACTION_ID: Record<string, string> = {};
let reactionsCached = false;

async function loadReactionMapping() {
  if (reactionsCached) return;

  try {
    const response = await api.get<any>('/reactions');
    const reactions = response.data?.data || response.data;

    // Build emoji to GUID mapping from backend reactions
    reactions.forEach((reaction: any) => {
      // Match emoji in reaction name (e.g., "👍 Thumbs Up" -> "👍")
      const emojiMatch = reaction.name.match(/^(.)/);
      if (emojiMatch) {
        EMOJI_TO_REACTION_ID[emojiMatch[1]] = reaction.id;
      }
    });

    reactionsCached = true;
  } catch (error) {
    console.warn('Failed to load reaction mapping:', error);
    // Fall back to default mapping
    EMOJI_TO_REACTION_ID = {
      '👍': '00000000-0000-0000-0000-000000000001',
      '❤️': '00000000-0000-0000-0000-000000000002',
      '😂': '00000000-0000-0000-0000-000000000003',
      '😢': '00000000-0000-0000-0000-000000000004',
      '😡': '00000000-0000-0000-0000-000000000005',
      '🎉': '00000000-0000-0000-0000-000000000006',
    };
  }
}

function getReactionId(emoji: string): string {
  return EMOJI_TO_REACTION_ID[emoji] || emoji;
}

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

      const response = await api.post<any>('/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
    const formData = new FormData();
    formData.append('Content', content);

    const response = await api.put<any>(`/messages/${messageId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
   * Add a reaction to a message
   * @param messageId Message ID
   * @param emoji Emoji to add
   */
  addReaction: async (messageId: string, emoji: string) => {
    // Load reaction mapping if not already cached
    await loadReactionMapping();

    // Map emoji to backend reaction GUID
    const reactionId = getReactionId(emoji);
    const params = new URLSearchParams();
    params.append('messageId', messageId);
    params.append('reactionId', reactionId);

    const response = await api.post<any>(`/messages/reaction?${params.toString()}`);
    return response.data?.data || response.data;
  },

  /**
   * Remove a reaction from a message
   * @param messageId Message ID
   * @param emoji Emoji to remove
   */
  removeReaction: async (messageId: string, emoji: string) => {
    // Load reaction mapping if not already cached
    await loadReactionMapping();

    // Map emoji to backend reaction GUID
    const reactionId = getReactionId(emoji);
    const params = new URLSearchParams();
    params.append('messageId', messageId);
    params.append('reactionId', reactionId);

    const response = await api.delete<any>(`/messages/reaction?${params.toString()}`);
    return response.data?.data || response.data;
  },
};
