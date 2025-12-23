import api from './api';

export interface Reaction {
  id: string;
  name: string;
  imageUrl: string;
}

export const reactionService = {
  /**
   * Get all reactions
   */
  getAllReactions: async (): Promise<Reaction[]> => {
    try {
      const response = await api.get<any>('/reactions');
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Error fetching reactions:', error);
      throw error;
    }
  },

  /**
   * Get a reaction by ID
   */
  getReactionById: async (reactionId: string): Promise<Reaction> => {
    try {
      const response = await api.get<any>(`/reactions/${reactionId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching reaction:', error);
      throw error;
    }
  },

  /**
   * Create a new custom reaction
   * @param formData FormData containing name and optional image file
   */
  createReaction: async (formData: FormData): Promise<string> => {
    try {
      // Don't set Content-Type header - axios will set it automatically with correct boundary
      const response = await api.post<any>('/reactions', formData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating reaction:', error);
      throw error;
    }
  },

  /**
   * Update an existing reaction
   * @param reactionId Reaction ID
   * @param formData FormData containing name and optional image file
   */
  updateReaction: async (reactionId: string, formData: FormData): Promise<void> => {
    try {
      // Don't set Content-Type header - axios will set it automatically with correct boundary
      const response = await api.put<any>(`/reactions/${reactionId}`, formData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating reaction:', error);
      throw error;
    }
  },

  /**
   * Delete a reaction
   * @param reactionId Reaction ID
   */
  deleteReaction: async (reactionId: string): Promise<void> => {
    try {
      const response = await api.delete<any>(`/reactions/${reactionId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error deleting reaction:', error);
      throw error;
    }
  },
};
