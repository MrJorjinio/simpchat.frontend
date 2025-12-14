import { create } from 'zustand';
import type { Notification } from '../types/api.types';
import { notificationService } from '../services/notification.service';

interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;

  loadNotifications: () => Promise<void>;
  markAsSeen: (notificationId: string) => Promise<void>;
  markMultipleAsSeen: (notificationIds: string[]) => Promise<void>;
  markAllAsSeen: () => Promise<void>;
  clearError: () => void;

  // Real-time event handlers
  handleNewNotification: (notification: any) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  isLoading: false,
  error: null,

  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const notifications = await notificationService.getNotifications();
      set({ notifications, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load notifications';
      set({ error: errorMessage, isLoading: false });
    }
  },

  markAsSeen: async (notificationId: string) => {
    set({ error: null });
    try {
      await notificationService.markAsSeen(notificationId);
      set((state) => ({
        notifications: state.notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, seen: true } : notif
        ),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark notification as seen';
      set({ error: errorMessage });
    }
  },

  markMultipleAsSeen: async (notificationIds: string[]) => {
    set({ error: null });
    try {
      await notificationService.markMultipleAsSeen(notificationIds);
      set((state) => ({
        notifications: state.notifications.map((notif) =>
          notificationIds.includes(notif.id) ? { ...notif, seen: true } : notif
        ),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark notifications as seen';
      set({ error: errorMessage });
    }
  },

  markAllAsSeen: async () => {
    set({ error: null });
    try {
      await notificationService.markAllAsSeen();
      set((state) => ({
        notifications: state.notifications.map((notif) => ({
          ...notif,
          seen: true,
        })),
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to mark all notifications as seen';
      set({ error: errorMessage });
    }
  },

  clearError: () => set({ error: null }),

  // Real-time event handlers
  handleNewNotification: (notification: any) => {
    console.log('[NotificationStore] New notification:', notification);
    set((state) => {
      // Convert backend notification format to frontend Notification type
      const newNotification: Notification = {
        id: notification.messageId, // Using messageId as notification ID for now
        messageId: notification.messageId,
        chatId: notification.chatId,
        chatName: notification.chatName,
        chatAvatar: notification.chatAvatar,
        senderName: notification.senderName,
        content: notification.content,
        sentTime: notification.sentTime,
        seen: false,
        fileUrl: notification.fileUrl,
      };

      // Add to beginning of array (most recent first)
      // Check if notification already exists to avoid duplicates
      const exists = state.notifications.some(n =>
        n.chatId === newNotification.chatId &&
        n.sentTime === newNotification.sentTime
      );

      if (!exists) {
        return { notifications: [newNotification, ...state.notifications] };
      }
      return state;
    });
  },
}));
