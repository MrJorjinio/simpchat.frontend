import { useEffect, useRef } from 'react';
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
  const isLoadingMessages = useChatStore(state => state.isLoadingMessages);
  const currentChat = useChatStore(state => state.currentChat);
  const loadPermissions = useChatStore(state => state.loadPermissions);
  const user = useAuthStore(state => state.user);

  // Track which chatIds we've already triggered loading for
  const loadedChatsRef = useRef<Set<string>>(new Set());

  // Subscribe directly to this chat's permissions array for instant reactivity
  // Use stable EMPTY_PERMISSIONS reference to avoid infinite re-render loops
  const permissions = useChatStore(state =>
    chatId ? (state.chatPermissions.get(chatId) ?? EMPTY_PERMISSIONS) : EMPTY_PERMISSIONS
  );

  // Auto-load permissions when chat changes (for groups/channels)
  useEffect(() => {
    if (!chatId || !currentChat) return;

    // Only load for groups and channels, not DMs
    if (currentChat.type !== 'group' && currentChat.type !== 'channel') return;

    // Don't reload if we've already triggered loading for this chat
    if (loadedChatsRef.current.has(chatId)) return;

    // Don't start loading if already loading
    if (permissionsLoading) return;

    console.log('[usePermissions] Auto-loading permissions for chat:', chatId);
    loadedChatsRef.current.add(chatId);
    loadPermissions(chatId);
  }, [chatId, currentChat?.type, permissionsLoading, loadPermissions]);

  // Check if chat data is still loading (members not yet populated)
  // Members are loaded via loadMessages -> getChatProfile
  const isChatDataLoading = isLoadingMessages && (!currentChat?.members || currentChat.members.length === 0);

  // DEBUG LOGGING
  console.log('[usePermissions] State:', {
    chatId,
    chatType: currentChat?.type,
    userId: user?.id,
    createdById: currentChat?.createdById,
    isCreator: currentChat?.createdById === user?.id,
    membersCount: currentChat?.members?.length,
    membersLoaded: !!(currentChat?.members && currentChat.members.length > 0),
    permissionsLoading,
    isLoadingMessages,
    isChatDataLoading,
    cachedPermissions: permissions,
  });

  // Check if user is creator or admin (these have all permissions)
  const isCreatorOrAdmin = (() => {
    if (!chatId || !currentChat || !user) {
      console.log('[usePermissions] isCreatorOrAdmin: false (missing data)', { chatId: !!chatId, currentChat: !!currentChat, user: !!user });
      return false;
    }

    // Check if chat creator
    if (currentChat.createdById === user.id) {
      console.log('[usePermissions] isCreatorOrAdmin: true (is creator)');
      return true;
    }

    // Check if admin role (only if members are loaded)
    if (currentChat.members && currentChat.members.length > 0) {
      const member = currentChat.members.find(m => m.userId === user.id);
      const role = member?.role?.toLowerCase();
      console.log('[usePermissions] Member check:', { memberFound: !!member, role, userId: user.id });
      if (role === 'admin' || role === 'owner') {
        console.log('[usePermissions] isCreatorOrAdmin: true (is admin/owner)');
        return true;
      }
    }

    console.log('[usePermissions] isCreatorOrAdmin: false (no match)');
    return false;
  })();

  // Helper to check if user has a specific permission
  const hasPermission = (permission: PermissionType): boolean => {
    if (isCreatorOrAdmin) return true;
    return permissions.includes(permission);
  };

  // Combined loading state - true if either permissions OR chat data (members) is loading
  const isLoading = permissionsLoading || isChatDataLoading;

  console.log('[usePermissions] Result:', { isCreatorOrAdmin, isLoading, canSendMessage: isLoading ? 'loading...' : hasPermission('SendMessage') });

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

  // If still loading, return true for basic permissions to avoid flashing "no permission" message
  // The actual permissions will be evaluated once loading completes
  if (isLoading) {
    return {
      canSendMessage: true, // Optimistic - assume permission while loading
      canAddUsers: false,
      canPinMessages: false,
      canManageMessages: false,
      canManageBans: false,
      canManageChatInfo: false,
      canManageUsers: false,
      isLoading: true,
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
    isLoading: false,
  };
};
