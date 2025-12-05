import api from './api';

export const notificationService = {
  /**
   * Get all notifications for the current user
   * Fetches from GET /notifications endpoint and normalizes the response
   */
  getNotifications: async () => {
    try {
      console.log('[NotificationService] Fetching notifications from GET /notifications');
      const response = await api.get<any>('/notifications');

      console.log('[NotificationService] Raw API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      // Backend returns: { success: true, statusCode: 200, data: [...], error: null }
      let rawNotifications = [];
      if (response.data?.success && response.data?.data) {
        rawNotifications = response.data.data;
        console.log('[NotificationService] Got notifications from response.data.data:', rawNotifications.length, 'items');
      } else if (response.data && Array.isArray(response.data)) {
        rawNotifications = response.data;
        console.log('[NotificationService] Response is direct array:', rawNotifications.length, 'items');
      } else {
        console.log('[NotificationService] Unexpected response format:', response.data);
        rawNotifications = [];
      }

      // Normalize backend response: map notificationId to id
      const notifications = Array.isArray(rawNotifications)
        ? rawNotifications.map((n: any) => {
            const normalized = {
              id: n.notificationId || n.id,
              chatId: n.chatId,
              messageId: n.messageId,
              chatName: n.chatName || '',
              chatAvatar: n.chatAvatar || '',
              senderName: n.senderName || '',
              content: n.content || '',
              fileUrl: n.fileUrl,
              sentTime: n.sentTime || new Date().toISOString(),
              seen: n.seen !== undefined ? n.seen : false,
            };
            return normalized;
          })
        : [];

      console.log('[NotificationService] Returning', notifications.length, 'normalized notifications');
      return notifications;
    } catch (error: any) {
      console.error('[NotificationService] Failed to fetch notifications:', error.message);
      console.error('[NotificationService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      return [];
    }
  },

  /**
   * Mark a single notification as seen
   * Uses PUT /notifications/seen with notificationId as query parameter
   */
  markAsSeen: async (notificationId: string) => {
    try {
      console.log('[NotificationService] Marking notification as seen:', notificationId);
      const response = await api.put<any>(`/notifications/seen?notificationId=${notificationId}`);
      console.log('[NotificationService] Mark as seen response:', response.data);
      return response.data?.data || response.data;
    } catch (error: any) {
      console.error('[NotificationService] Failed to mark notification as seen:', error);
      console.error('[NotificationService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  },

  /**
   * Mark multiple notifications as seen (batch operation)
   */
  markMultipleAsSeen: async (notificationIds: string[]) => {
    try {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        console.warn('[NotificationService] No notification IDs provided');
        return { success: true };
      }

      console.log('[NotificationService] Marking multiple notifications as seen:', notificationIds);
      console.log('[NotificationService] Notification IDs (type, count):', typeof notificationIds[0], notificationIds.length);

      // Backend expects List<Guid>, so convert string IDs to proper format
      const requestBody = {
        notificationIds: notificationIds, // Backend will deserialize as Guid list
      };

      console.log('[NotificationService] Request body:', JSON.stringify(requestBody));

      const response = await api.put<any>('/notifications/seen/batch', requestBody);

      console.log('[NotificationService] Mark multiple response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      if (response.data?.success || response.status === 200) {
        console.log('[NotificationService] Successfully marked', notificationIds.length, 'notifications as seen');
        return response.data || { success: true };
      } else {
        console.warn('[NotificationService] Response indicates potential issue:', response.data);
        return response.data || { success: true };
      }
    } catch (error: any) {
      console.error('[NotificationService] Failed to mark multiple notifications as seen:', error);
      console.error('[NotificationService] Full error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestData: error.config?.data,
        headers: error.config?.headers,
      });
      throw error;
    }
  },

  /**
   * Mark all notifications as seen
   * NOTE: Backend may not implement this endpoint
   */
  markAllAsSeen: async () => {
    try {
      const response = await api.put<any>('/notifications/seen/all');
      return response.data?.data || response.data;
    } catch (error) {
      console.warn('[NotificationService] PUT /notifications/seen/all may not be implemented:', error);
      // Fallback: try batch marking if all endpoint doesn't exist
      // This would require getting all notification IDs first (which we can't do without a GET endpoint)
      throw error;
    }
  },
};
