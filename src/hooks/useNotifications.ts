import { useNotificationStore } from '../stores/notificationStore';

export const useNotifications = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const error = useNotificationStore((state) => state.error);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markAsSeen = useNotificationStore((state) => state.markAsSeen);
  const markMultipleAsSeen = useNotificationStore((state) => state.markMultipleAsSeen);
  const markAllAsSeen = useNotificationStore((state) => state.markAllAsSeen);
  const clearError = useNotificationStore((state) => state.clearError);

  const unreadCount = notifications.filter((n) => !n.seen).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    loadNotifications,
    markAsSeen,
    markMultipleAsSeen,
    markAllAsSeen,
    clearError,
  };
};
