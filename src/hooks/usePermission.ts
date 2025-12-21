import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import type { PermissionType } from '../types/api.types';

// Stable empty array reference to avoid infinite loops in Zustand selectors
const EMPTY_PERMISSIONS: string[] = [];

/**
 * Hook to check a single permission for the current chat
 */
export const usePermission = (chatId: string | undefined, permission: PermissionType): boolean => {
  const hasPermission = useChatStore(state => state.hasPermission);

  if (!chatId) return false;
  return hasPermission(chatId, permission);
};

/**
 * Hook to get all permission checks for the current chat
 * Directly subscribes to the permissions array for proper reactivity
 */
export const usePermissions = (chatId: string | undefined) => {
  const permissionsLoading = useChatStore(state => state.permissionsLoading);
  const currentChat = useChatStore(state => state.currentChat);
  const user = useAuthStore(state => state.user);

  // Subscribe directly to this chat's permissions array for instant reactivity
  // Use stable EMPTY_PERMISSIONS reference to avoid infinite re-render loops
  const permissions = useChatStore(state =>
    chatId ? (state.chatPermissions.get(chatId) ?? EMPTY_PERMISSIONS) : EMPTY_PERMISSIONS
  );

  // Check if user is creator or admin (these have all permissions)
  const isCreatorOrAdmin = (() => {
    if (!chatId || !currentChat || !user) return false;

    // Check if chat creator
    if (currentChat.createdById === user.id) return true;

    // Check if admin role
    const member = currentChat.members?.find(m => m.userId === user.id);
    const role = member?.role?.toLowerCase();
    return role === 'admin' || role === 'owner';
  })();

  // Helper to check if user has a specific permission
  const hasPermission = (permission: PermissionType): boolean => {
    if (isCreatorOrAdmin) return true;
    return permissions.includes(permission);
  };

  // For DMs, allow all messaging permissions by default
  if (currentChat?.type === 'dm') {
    return {
      canSendMessage: true,
      canAddUsers: false,
      canPinMessages: true,
      canManageMessages: false,
      canManageBans: false,
      canManageChatInfo: false,
      canManageUsers: false,
      isLoading: false,
    };
  }

  if (!chatId) {
    return {
      canSendMessage: false,
      canAddUsers: false,
      canPinMessages: false,
      canManageMessages: false,
      canManageBans: false,
      canManageChatInfo: false,
      canManageUsers: false,
      isLoading: false,
    };
  }

  return {
    canSendMessage: hasPermission('SendMessage'),
    canAddUsers: hasPermission('AddUsers'),
    canPinMessages: hasPermission('PinMessages'),
    canManageMessages: hasPermission('ManageMessages'),
    canManageBans: hasPermission('ManageBans'),
    canManageChatInfo: hasPermission('ManageChatInfo'),
    canManageUsers: hasPermission('ManageUsers'),
    isLoading: permissionsLoading,
  };
};
