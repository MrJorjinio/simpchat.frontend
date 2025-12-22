import React, { useState, useRef, useEffect } from 'react';
import { Users, Megaphone } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { chatService } from '../services/chat.service';
import { notificationService } from '../services/notification.service';
import type { Chat, BackendMessage, User, ChatType, ChatMember } from '../types/api.types';
import { Avatar } from './common/Avatar';
import { OnlineStatusIndicator } from './common/OnlineStatusIndicator';
import { PinnedMessagesPanel } from './PinnedMessagesPanel';
import { usePermissions } from '../hooks/usePermission';
import { getInitials, formatTime, fixMinioUrl } from '../utils/helpers';
import { extractErrorMessage, isUserBlockError, isBlockedByUser, getUserBlockErrorMessage } from '../utils/errorHandler';
import { toast } from './common/Toast';
import { confirm } from './common/ConfirmModal';
import styles from './Dashboard.module.css';

export interface ChatViewProps {
  currentChat: Chat | null;
  messages: BackendMessage[];
  isLoadingMessages: boolean;
  onSendMessage: (content: string, file?: File, replyId?: string) => Promise<void>;
  onOpenGroupCreate: () => void;
  onOpenChannelCreate: () => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenMobileSidebar?: () => void;
  onOpenChatProfile?: () => void;
}

// Add Member Modal
export interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatType: ChatType;
  onMemberAdded: () => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatType,
  onMemberAdded,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const userService = await import('../services/user.service').then((m) => m.userService);
        const users = await userService.searchUsers(query);
        setSearchResults(users);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleAddMember = async (userId: string, username: string) => {
    setIsAdding(true);
    try {
      if (chatType === 'group') {
        await chatService.addMemberToGroup(chatId, userId);
      } else if (chatType === 'channel') {
        await chatService.addMemberToChannel(chatId, userId);
      }
      toast.success(`${username} has been added to the chat.`);
      await onMemberAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error(extractErrorMessage(error, 'Failed to add member'));
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className={styles.modalHeader}>
          <h2>Add Member</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Search Users</label>
            <input
              type="text"
              placeholder="Type username to search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className={styles.formInput}
            />
          </div>

          {isSearching && <div className={styles.loadingState}>Searching...</div>}

          {searchResults.length > 0 && (
            <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--background)',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ marginRight: '10px' }}>
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.username}
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '13px',
                        }}
                      >
                        {getInitials(user.username)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{user.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.id, user.username)}
                    disabled={isAdding}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className={styles.emptyState}>No users found</div>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.primaryButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Permission Management Modal
export interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  member: ChatMember;
  onPermissionsChanged: () => Promise<void>;
}

const AVAILABLE_PERMISSIONS = [
  { name: 'SendMessages', label: 'Send Messages' },
  { name: 'ManageMessages', label: 'Manage Messages' },
  { name: 'ManageUsers', label: 'Manage Users' },
  { name: 'ManageChatInfo', label: 'Manage Chat Info' },
  { name: 'ManageBans', label: 'Manage Bans' },
  { name: 'PinMessages', label: 'Pin Messages' },
];

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  chatId,
  member,
  onPermissionsChanged,
}) => {
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, chatId, member.userId]);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const { permissionService } = await import('../services/permission.service');
      const permissions = await permissionService.getUserPermissions(chatId, member.userId);
      // Extract permission names from the response
      const permissionNames = Array.isArray(permissions)
        ? permissions.map((p: any) => p.name || p)
        : [];
      setUserPermissions(permissionNames);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setUserPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = async (permissionName: string) => {
    const hasPermission = userPermissions.includes(permissionName);
    setIsUpdating(true);

    try {
      const { permissionService } = await import('../services/permission.service');

      if (hasPermission) {
        await permissionService.revokePermission(chatId, member.userId, permissionName);
        setUserPermissions(userPermissions.filter((p) => p !== permissionName));
      } else {
        await permissionService.grantPermission(chatId, member.userId, permissionName);
        setUserPermissions([...userPermissions, permissionName]);
      }

      await onPermissionsChanged();
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error(extractErrorMessage(error, 'Failed to update permission'));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
        <div className={styles.modalHeader}>
          <h2>Manage Permissions - {member.user.username}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {isLoading ? (
            <div className={styles.loadingState}>Loading permissions...</div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>Current Role: {member.role}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Grant or revoke specific permissions for this user.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {AVAILABLE_PERMISSIONS.map((permission) => {
                  const hasPermission = userPermissions.includes(permission.name);
                  return (
                    <div
                      key={permission.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: hasPermission ? 'rgba(76, 175, 80, 0.1)' : 'var(--background)',
                        border: hasPermission ? '2px solid #4caf50' : '2px solid var(--border)',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{permission.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {permission.name}
                        </div>
                      </div>
                      <button
                        onClick={() => handleTogglePermission(permission.name)}
                        disabled={isUpdating}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: hasPermission ? '#dc3545' : '#4caf50',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                      >
                        {hasPermission ? '✕ Revoke' : '✓ Grant'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.primaryButton}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  currentChat,
  messages,
  isLoadingMessages,
  onSendMessage,
  onOpenGroupCreate,
  onOpenChannelCreate,
  onOpenUserProfile,
  onOpenMobileSidebar,
  onOpenChatProfile,
}) => {
  const [messageText, setMessageText] = useState('');
  const [isSending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<BackendMessage | null>(null);
  const [isUserBlocked, setIsUserBlocked] = useState(false); // Other user blocked me
  const [didIBlockUser, setDidIBlockUser] = useState(false); // I blocked the other user
  const [isCheckingBlockStatus, setIsCheckingBlockStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // File attachment state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat store selectors for online status
  const { isUserOnline, getUserLastSeen, getOnlineMembersCount, loadPermissions } = useChatStore();
  const { user: currentUser } = useAuthStore();

  // Track messages that have been marked as seen to avoid duplicate API calls
  const seenMessagesRef = useRef<Set<string>>(new Set());

  // Track previous state to control auto-scroll behavior
  const prevChatIdRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef<number>(0);

  // Refs for IntersectionObserver to avoid re-creating on every render
  const messagesRef = useRef(messages);
  const pendingNotificationsRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Keep messagesRef updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // IntersectionObserver for detecting when messages come into view
  useEffect(() => {
    if (!currentChat || !currentUser) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    // Reset seen messages when chat changes
    seenMessagesRef.current = new Set();
    pendingNotificationsRef.current = new Set();

    const flushPendingNotifications = async () => {
      const pending = Array.from(pendingNotificationsRef.current);
      if (pending.length === 0) return;

      pendingNotificationsRef.current = new Set();

      try {
        // Only call notification service - SignalR will broadcast the update
        await notificationService.markMultipleAsSeen(pending);
      } catch (error) {
        console.error('[ChatView] Failed to mark notifications as seen:', error);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = (entry.target as HTMLElement).dataset.messageId;
            if (!messageId || seenMessagesRef.current.has(messageId)) return;

            // Find the message in our messages ref (not state to avoid dependency)
            const msg = messagesRef.current.find((m) => m.messageId === messageId);
            if (!msg) return;

            // Only process messages NOT from current user that have unseen notifications
            if (!msg.isCurrentUser && msg.isNotificated && msg.notificationId) {
              seenMessagesRef.current.add(messageId);
              pendingNotificationsRef.current.add(msg.notificationId);

              // Debounce the API call - wait 500ms after last visible message
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              debounceTimerRef.current = setTimeout(flushPendingNotifications, 500);
            }
          }
        });
      },
      {
        root: container,
        rootMargin: '0px',
        threshold: 0.5,
      }
    );

    // Store observer in ref for re-observing new messages
    observerRef.current = observer;

    // Observe all message elements
    const messageElements = container.querySelectorAll('[data-message-id]');
    messageElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentChat?.id, currentUser]); // Removed messages from dependencies!

  // Re-observe new message elements when messages are added
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !observerRef.current) return;

    // Only run when new messages are added
    const messageElements = container.querySelectorAll('[data-message-id]');
    messageElements.forEach((el) => {
      const messageId = (el as HTMLElement).dataset.messageId;
      if (messageId && !seenMessagesRef.current.has(messageId)) {
        observerRef.current?.observe(el);
      }
    });
  }, [messages.length]); // Only re-run when message count changes

  // Permission checks
  const { canSendMessage, canPinMessages, canManageMessages, isLoading: permissionsLoading } = usePermissions(currentChat?.id);

  // Load permissions when chat changes (for groups/channels only)
  useEffect(() => {
    console.log('[ChatView] Permission useEffect triggered:', {
      hasChatId: !!currentChat?.id,
      chatType: currentChat?.type,
      hasLoadPermissions: typeof loadPermissions === 'function',
    });
    if (currentChat && (currentChat.type === 'group' || currentChat.type === 'channel')) {
      console.log('[ChatView] Calling loadPermissions for chat:', currentChat.id);
      loadPermissions(currentChat.id);
    }
  }, [currentChat?.id, loadPermissions]);

  // Check block status for DM chats
  useEffect(() => {
    const checkBlockStatus = async () => {
      console.log('[ChatView] checkBlockStatus called:', {
        hasCurrent: !!currentChat,
        type: currentChat?.type,
        hasUser: !!currentUser,
        members: currentChat?.members?.map(m => ({ id: m.id, odUserId: m.userId }))
      });

      if (!currentChat || currentChat.type !== 'dm' || !currentUser) {
        setIsUserBlocked(false);
        setDidIBlockUser(false);
        return;
      }

      // Try both userId and id since API may return either
      const otherMember = currentChat.members?.find(m => {
        const memberId = m.userId || m.id;
        return memberId !== currentUser.id;
      });
      console.log('[ChatView] otherMember found:', otherMember, 'using userId:', otherMember?.userId, 'or id:', otherMember?.id);
      if (!otherMember) {
        setIsUserBlocked(false);
        setDidIBlockUser(false);
        return;
      }

      setIsCheckingBlockStatus(true);
      try {
        const { userService } = await import('../services/user.service');
        // Check mutual block status - both directions
        const otherUserId = otherMember.userId || otherMember.id;
        console.log('[ChatView] Checking mutual block status for user:', otherUserId);
        const { iBlockedThem, theyBlockedMe } = await userService.getMutualBlockStatus(otherUserId);
        console.log('[ChatView] Block status result:', { iBlockedThem, theyBlockedMe });
        setDidIBlockUser(iBlockedThem);
        setIsUserBlocked(theyBlockedMe);
      } catch (error) {
        console.error('Failed to check block status:', error);
      } finally {
        setIsCheckingBlockStatus(false);
      }
    };

    checkBlockStatus();
  }, [currentChat?.id, currentChat?.type, currentChat?.members, currentUser?.id]);

  // Subscribe to store's block status changes for real-time updates
  const { usersYouBlocked, blockedByUsers } = useChatStore();

  useEffect(() => {
    if (!currentChat || currentChat.type !== 'dm' || !currentUser) {
      return;
    }

    // Get the other user's ID
    const otherMember = currentChat.members?.find(m => {
      const memberId = m.userId || m.id;
      return memberId !== currentUser.id;
    });

    if (!otherMember) return;

    const otherUserId = otherMember.userId || otherMember.id;
    if (!otherUserId) return;

    // Check if block status changed in the store
    const iBlockedInStore = usersYouBlocked.has(otherUserId);
    const blockedByInStore = blockedByUsers.has(otherUserId);

    console.log('[ChatView] Store block status changed:', {
      otherUserId,
      iBlockedInStore,
      blockedByInStore,
      currentDidIBlock: didIBlockUser,
      currentIsBlocked: isUserBlocked
    });

    // Update local state if store has different values
    if (iBlockedInStore !== didIBlockUser) {
      setDidIBlockUser(iBlockedInStore);
    }
    if (blockedByInStore !== isUserBlocked) {
      setIsUserBlocked(blockedByInStore);
    }
  }, [currentChat?.id, currentChat?.type, currentChat?.members, currentUser?.id, usersYouBlocked, blockedByUsers]);

  // Helper to get the other user's ID from a DM chat
  const getOtherUserId = (chat: Chat): string | null => {
    if (chat.type !== 'dm' || !chat.members || !currentUser) return null;
    const otherMember = chat.members.find(m => m.userId !== currentUser.id);
    return otherMember?.userId || null;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle scroll to show/hide scroll button (seen detection now handled by IntersectionObserver)
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if scrolled to bottom (within 100px)
    const scrollHeight = container.scrollHeight;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(!isNearBottom);
  };

  // Auto-scroll only when: chat changes OR new messages are added (not on property updates like isSeen)
  useEffect(() => {
    const chatChanged = currentChat?.id !== prevChatIdRef.current;
    const newMessagesAdded = messages.length > prevMessageCountRef.current;

    // Update refs
    prevChatIdRef.current = currentChat?.id || null;
    prevMessageCountRef.current = messages.length;

    // Only scroll to bottom if chat changed or new messages were added
    if (chatChanged || newMessagesAdded) {
      scrollToBottom();
      setShowScrollButton(false);
    }
  }, [messages, currentChat?.id]);

  const handleSendMessage = async () => {
    console.log('[ChatView] handleSendMessage called', {
      messageText,
      selectedFile: selectedFile ? { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type } : null,
      currentChat: currentChat?.id
    });

    if ((!messageText.trim() && !selectedFile) || !currentChat) {
      console.log('[ChatView] Early return - no content or no chat');
      return;
    }

    setSending(true);
    try {
      // Pass message text, file, and replyId to onSendMessage
      console.log('[ChatView] Calling onSendMessage with file:', selectedFile ? selectedFile.name : 'none', 'replyId:', replyToMessage?.messageId);
      await onSendMessage(messageText, selectedFile || undefined, replyToMessage?.messageId);
      console.log('[ChatView] onSendMessage completed');
      setMessageText('');
      setSelectedFile(null);
      setReplyToMessage(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('[ChatView] Failed to send message:', error);
      // Handle block errors
      if (isUserBlockError(error)) {
        if (isBlockedByUser(error)) {
          setIsUserBlocked(true);
        } else {
          setDidIBlockUser(true);
        }
        toast.error(getUserBlockErrorMessage(error));
      } else {
        toast.error(extractErrorMessage(error, 'Failed to send message'));
      }
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      const { messageService } = await import('../services/message.service');
      await messageService.toggleReactionByEmoji(messageId, emoji);
      // Reload messages to reflect the change
      const chatStore = useChatStore.getState();
      if (currentChat) {
        await chatStore.loadMessages(currentChat.id);
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string, _isOwnMessage: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    // Show context menu for all messages (own messages get edit/delete, all get pin/unpin)
    setContextMenu({ messageId, x: e.clientX, y: e.clientY });
  };

  // canPinMessages is now provided by usePermissions hook

  const handlePinMessage = async (messageId: string) => {
    try {
      const chatStore = useChatStore.getState();
      await chatStore.pinMessage(messageId);
      setContextMenu(null);
      toast.success('Message pinned');
    } catch (error) {
      console.error('Failed to pin message:', error);
      toast.error(extractErrorMessage(error, 'Failed to pin message'));
    }
  };

  const handleUnpinMessage = async (messageId: string) => {
    try {
      const chatStore = useChatStore.getState();
      await chatStore.unpinMessage(messageId);
      setContextMenu(null);
      toast.success('Message unpinned');
    } catch (error) {
      console.error('Failed to unpin message:', error);
      toast.error(extractErrorMessage(error, 'Failed to unpin message'));
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('message-highlight');
      setTimeout(() => messageElement.classList.remove('message-highlight'), 2000);
    }
  };

  const handleEditMessage = (messageId: string) => {
    const msg = messages.find((m) => m.messageId === messageId);
    if (msg) {
      setEditingMessageId(messageId);
      setEditingContent(msg.content);
      setContextMenu(null);
    }
  };

  const handleSaveEdit = async (messageId: string) => {
    if (editingContent.trim()) {
      try {
        const messageService = await import('../services/message.service').then((m) => m.messageService);
        await messageService.editMessage(messageId, editingContent);
        setEditingMessageId(null);
        setEditingContent('');
        // Reload messages
        const chatStore = useChatStore.getState();
        if (currentChat) {
          await chatStore.loadMessages(currentChat.id);
        }
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        const messageService = await import('../services/message.service').then((m) => m.messageService);
        await messageService.deleteMessage(messageId);
        setContextMenu(null);
        // Reload messages
        const chatStore = useChatStore.getState();
        if (currentChat) {
          await chatStore.loadMessages(currentChat.id);
        }
        toast.success('Message deleted');
      } catch (error) {
        console.error('Failed to delete message:', error);
        toast.error('Failed to delete message');
      }
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  if (!currentChat) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.emptyScreen}>
          <div className={styles.emptyIcon}>💬</div>
          <h2>Select a chat to start messaging</h2>
          <p>Choose a conversation from the list or start a new one</p>
          <div className={styles.emptyActions}>
            <button className={styles.actionButton} onClick={onOpenGroupCreate}>
              Create Group
            </button>
            <button className={styles.actionButton} onClick={onOpenChannelCreate}>
              Create Channel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainContent} style={{ position: 'relative' }}>
      {/* Chat Header */}
      <div className={styles.chatHeaderBar}>
        <div className={styles.headerLeft}>
          {/* Mobile Menu Button */}
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className={styles.mobileMenuButton}
              style={{
                display: 'none',
                padding: '8px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text)',
                marginRight: '8px',
              }}
              aria-label="Open menu"
            >
              ☰
            </button>
          )}
          <div className={styles.headerAvatar}>
            <Avatar src={currentChat.avatar} name={currentChat.name} fallbackClass={styles.avatarFallback} />
          </div>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>
              {currentChat.name}
              <span className={styles.headerChatType} title={currentChat.type}>
                {currentChat.type === 'dm' ? ' 👤' : currentChat.type === 'group' ? ' 👥' : currentChat.type === 'channel' ? ' 📢' : ' ❓'}
              </span>
            </h2>
            <div className={styles.headerStatus}>
              {currentChat.type === 'dm' ? (
                (() => {
                  const otherUserId = getOtherUserId(currentChat);
                  // If we have the other user's ID, check their presence state
                  if (otherUserId) {
                    const online = isUserOnline(otherUserId);
                    const lastSeen = getUserLastSeen(otherUserId);
                    return (
                      <OnlineStatusIndicator
                        isOnline={online}
                        lastSeen={lastSeen}
                        size="sm"
                        showLabel={true}
                        position="standalone"
                      />
                    );
                  }
                  // Fallback: use the chat's isOnline field (from backend UserChatResponseDto)
                  return (
                    <OnlineStatusIndicator
                      isOnline={currentChat.isOnline || false}
                      size="sm"
                      showLabel={true}
                      position="standalone"
                    />
                  );
                })()
              ) : (
                (() => {
                  const onlineCount = getOnlineMembersCount(currentChat.id);
                  // Use participantsCount from backend if members array is empty
                  const totalMembers = currentChat.members?.length || currentChat.participantsCount || 0;
                  console.log('[ChatView] Member count debug:', {
                    chatId: currentChat.id,
                    chatName: currentChat.name,
                    membersLength: currentChat.members?.length,
                    participantsCount: currentChat.participantsCount,
                    totalMembers,
                    fullChat: currentChat
                  });
                  return (
                    <span>
                      {totalMembers > 0 ? (
                        <>
                          {totalMembers} member{totalMembers !== 1 ? 's' : ''}
                          {onlineCount > 0 && (
                            <>
                              <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>•</span>
                              <span style={{ color: '#51cf66', fontWeight: 600 }}>{onlineCount} online</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Members</span>
                      )}
                    </span>
                  );
                })()
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {/* Profile button - only show for groups/channels */}
          {currentChat.type !== 'dm' && (
            <button
              onClick={() => {
                onOpenChatProfile && onOpenChatProfile();
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                cursor: 'pointer',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '12px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2))';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title={`View ${currentChat.type === 'channel' ? 'Channel' : 'Group'} Profile`}
            >
              {currentChat.type === 'channel' ? (
                <Megaphone size={16} color="#818cf8" />
              ) : (
                <Users size={16} color="#818cf8" />
              )}
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#818cf8',
                letterSpacing: '0.3px'
              }}>
                {currentChat.type === 'channel' ? 'Channel' : 'Group'} Profile
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Pinned Messages Panel */}
      <PinnedMessagesPanel
        chatId={currentChat.id}
        onJumpToMessage={handleJumpToMessage}
        canUnpin={canPinMessages}
      />

      {/* Messages Container */}
      <div
        className={styles.messagesContainer}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {isLoadingMessages && <div className={styles.loading}>Loading messages...</div>}
        {!isLoadingMessages && (!messages || messages.length === 0) && (
          <div className={styles.noMessages}>No messages yet. Start the conversation!</div>
        )}
        {Array.isArray(messages) && messages.map((msg) => (
          <div
            key={msg.messageId}
            data-message-id={msg.messageId}
            className={`${styles.messageGroup} ${msg.isCurrentUser ? styles.ownMessage : styles.otherMessage} ${msg.isCurrentUser ? 'message-self-enter' : 'message-other-enter'} ${msg.isPinned ? 'message-pinned' : ''}`}
            style={{ position: 'relative' }}
          >
            {!msg.isCurrentUser && (
              <div
                className={styles.senderAvatar}
                onClick={() => onOpenUserProfile(msg.senderId)}
                style={{ cursor: 'pointer' }}
              >
                {msg.senderAvatarUrl ? (
                  <img src={msg.senderAvatarUrl} alt={msg.senderUsername} />
                ) : (
                  <div className={styles.avatarFallback}>{getInitials(msg.senderUsername)}</div>
                )}
              </div>
            )}
            {editingMessageId === msg.messageId ? (
              // Edit mode
              <div className={styles.messageBubble} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '2px solid var(--accent)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text)',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    minHeight: '60px',
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSaveEdit(msg.messageId)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--border)',
                      color: 'var(--text)',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Normal message display
              <div
                className={styles.messageBubble}
                onContextMenu={(e) => handleContextMenu(e, msg.messageId, msg.isCurrentUser)}
                style={{ position: 'relative' }}
              >
                {!msg.isCurrentUser && <div className={styles.senderName}>{msg.senderUsername}</div>}
                {msg.replyId && (() => {
                  // Find the original message being replied to
                  const replyToMsg = messages.find(m => m.messageId === msg.replyId);
                  const replyContent = replyToMsg
                    ? (replyToMsg.content?.substring(0, 40) || (replyToMsg.fileUrl ? '📎 File' : '...'))
                    : 'Message deleted';
                  return (
                    <div
                      onClick={() => replyToMsg && handleJumpToMessage(msg.replyId!)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        marginBottom: '4px',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        backgroundColor: msg.isCurrentUser ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)',
                        borderRadius: '4px',
                        cursor: replyToMsg ? 'pointer' : 'default',
                        borderLeft: '2px solid var(--accent)',
                      }}
                    >
                      <span style={{ opacity: 0.7 }}>↩</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '10px' }}>
                        {replyToMsg?.senderUsername || 'Unknown'}:
                      </span>
                      <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {replyContent}{replyToMsg?.content && replyToMsg.content.length > 40 ? '...' : ''}
                      </span>
                    </div>
                  );
                })()}
                <div className={styles.messageContent}>{msg.content}</div>
                {msg.fileUrl && (() => {
                  const fileUrl = fixMinioUrl(msg.fileUrl) || msg.fileUrl;
                  return (
                    <div style={{ marginTop: '8px' }}>
                      {/* Image preview */}
                      {/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileUrl) ? (
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={fileUrl}
                            alt="Attachment"
                            style={{
                              maxWidth: '300px',
                              maxHeight: '200px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                            onError={(e) => {
                              // If image fails to load, show fallback link
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div style={{ display: 'none', alignItems: 'center', gap: '6px', padding: '8px 12px', background: 'var(--background)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            📷 Image (click to view)
                          </div>
                        </a>
                      ) : /\.(mp4|webm|ogg|mov)$/i.test(fileUrl) ? (
                        /* Video preview */
                        <video
                          src={fileUrl}
                          controls
                          style={{
                            maxWidth: '300px',
                            maxHeight: '200px',
                            borderRadius: '8px',
                          }}
                        />
                      ) : /\.(mp3|wav|ogg|m4a)$/i.test(fileUrl) ? (
                        /* Audio preview */
                        <audio
                          src={fileUrl}
                          controls
                          style={{ maxWidth: '300px' }}
                        />
                      ) : (
                        /* Other files - show download link */
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            background: 'var(--background)',
                            borderRadius: '8px',
                            color: 'var(--text)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--background)'}
                        >
                          <span style={{ fontSize: '18px' }}>
                            {/\.pdf$/i.test(fileUrl) ? '📄' : /\.(doc|docx)$/i.test(fileUrl) ? '📝' : /\.(xls|xlsx)$/i.test(fileUrl) ? '📊' : /\.(zip|rar|7z)$/i.test(fileUrl) ? '📦' : '📎'}
                          </span>
                          <span>
                            {fileUrl.split('/').pop()?.substring(37) || 'Download file'}
                          </span>
                        </a>
                      )}
                    </div>
                  );
                })()}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {/* Timestamp and seen indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span className={styles.messageTime}>{formatTime(msg.sentAt)}</span>
                    {/* Show seen status on all messages */}
                    <span
                      style={{
                        fontSize: '11px',
                        color: msg.isSeen ? '#51cf66' : 'rgba(255,255,255,0.5)',
                        fontWeight: 500,
                      }}
                      title={msg.isSeen ? 'Seen' : 'Sent'}
                    >
                      {msg.isSeen ? '✓✓' : '✓'}
                    </span>
                  </div>
                  {/* Compact reactions badge */}
                  {msg.messageReactions && msg.messageReactions.length > 0 && (() => {
                    const reactionCounts = msg.messageReactions.reduce((acc: Record<string, { count: number; users: string[] }>, r: any) => {
                      const type = r.reactionType || r.type || 'Like';
                      if (!acc[type]) acc[type] = { count: 0, users: [] };
                      acc[type].count++;
                      acc[type].users.push(r.userName || r.userId);
                      return acc;
                    }, {});
                    const typeToEmoji: Record<string, string> = {
                      'Like': '👍', 'Love': '❤️', 'Laugh': '😂', 'Sad': '😢', 'Angry': '😡'
                    };
                    return (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: '2px 6px',
                          backgroundColor: 'rgba(0,0,0,0.15)',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                      >
                        {Object.entries(reactionCounts).map(([type, data]: [string, any]) => (
                          <span
                            key={type}
                            onClick={() => handleToggleReaction(msg.messageId, typeToEmoji[type] || '👍')}
                            title={data.users.join(', ')}
                            style={{ cursor: 'pointer' }}
                          >
                            {typeToEmoji[type]}{data.count > 1 && <span style={{ fontSize: '10px', marginLeft: '1px' }}>{data.count}</span>}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenu({ messageId: msg.messageId, x: e.clientX, y: e.clientY });
                    }}
                    title="Actions"
                    style={{
                      padding: '2px 6px',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      opacity: 0.6,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                  >
                    ⋯
                  </button>
                </div>
              </div>
            )}
            {/* Context Menu with Reactions */}
            {contextMenu?.messageId === msg.messageId && (
              <div
                ref={contextMenuRef}
                style={{
                  position: 'fixed',
                  top: Math.min(Math.max(contextMenu.y - 20, 10), window.innerHeight - 180),
                  left: Math.min(Math.max(contextMenu.x - 70, 10), window.innerWidth - 150),
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  width: '140px',
                  padding: '4px',
                }}
              >
                {/* Compact reactions row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  padding: '4px 2px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '2px',
                }}>
                  {['👍', '❤️', '😂', '😢', '😡'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleToggleReaction(msg.messageId, emoji);
                        setContextMenu(null);
                      }}
                      style={{
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {/* Reply option */}
                <button
                  onClick={() => {
                    setReplyToMessage(msg);
                    setContextMenu(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '14px' }}>↩️</span>
                  Reply
                </button>
                {/* Pin/Unpin option */}
                {canPinMessages && (
                  <button
                    onClick={() => msg.isPinned ? handleUnpinMessage(msg.messageId) : handlePinMessage(msg.messageId)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '14px' }}>📌</span>
                    {msg.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {/* Edit option */}
                {(msg.isCurrentUser || canManageMessages) && (
                  <button
                    onClick={() => handleEditMessage(msg.messageId)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '14px' }}>✏️</span>
                    Edit
                  </button>
                )}
                {/* Delete option */}
                {(msg.isCurrentUser || canManageMessages) && (
                  <button
                    onClick={() => handleDeleteMessage(msg.messageId)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '14px' }}>🗑️</span>
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          title="Scroll to bottom"
          style={{
            position: 'absolute',
            bottom: '90px',
            right: '24px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.4)';
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      )}

      {/* Message Input */}
      {/* Show loading state while checking block status for DM chats */}
      {currentChat.type === 'dm' && isCheckingBlockStatus ? (
        <div
          style={{
            padding: '16px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderTop: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '14px',
          }}
        >
          Loading...
        </div>
      ) : currentChat.type === 'dm' && isUserBlocked ? (
        <div
          style={{
            padding: '16px 20px',
            textAlign: 'center',
            color: '#f87171',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderTop: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🚫</span>
          This user has blocked you. You cannot send them messages.
        </div>
      ) : currentChat.type === 'dm' && didIBlockUser ? (
        <div
          style={{
            padding: '16px 20px',
            textAlign: 'center',
            color: '#f87171',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderTop: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🚫</span>
          You have blocked this user. Unblock them to send messages.
        </div>
      ) : currentChat.type !== 'dm' && permissionsLoading ? (
        <div
          style={{
            padding: '16px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            borderTop: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '14px',
          }}
        >
          Loading...
        </div>
      ) : !canSendMessage && currentChat.type !== 'dm' ? (
        <div
          style={{
            padding: '16px 20px',
            textAlign: 'center',
            color: '#94a3b8',
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            borderTop: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>🔒</span>
          You don't have permission to send messages in this chat
        </div>
      ) : (
      <div className={styles.messageInput}>
        {replyToMessage && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              padding: '10px 14px',
              backgroundColor: 'var(--surface)',
              borderTop: '3px solid var(--accent)',
              borderRadius: '8px 8px 0 0',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>↩️</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>
                    Replying to {replyToMessage.senderUsername}
                  </span>
                </div>
                <div
                  style={{
                    padding: '8px 10px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '6px',
                    borderLeft: '3px solid var(--accent)',
                  }}
                >
                  {replyToMessage.fileUrl && (
                    <div style={{ marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      📎 Attachment
                    </div>
                  )}
                  <div style={{ color: 'var(--text)', fontSize: '13px', wordBreak: 'break-word' }}>
                    {replyToMessage.content ? (
                      <>
                        {replyToMessage.content.substring(0, 100)}
                        {replyToMessage.content.length > 100 ? '...' : ''}
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        {replyToMessage.fileUrl ? 'File attachment' : 'No content'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setReplyToMessage(null)}
                style={{
                  padding: '6px',
                  backgroundColor: 'var(--background)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                title="Cancel reply"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <input
          type="text"
          placeholder={replyToMessage ? 'Type your reply...' : 'Type a message...'}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          className={styles.inputField}
          disabled={isSending}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            console.log('[ChatView] File selected:', file ? { name: file.name, size: file.size, type: file.type } : null);
            if (file) {
              setSelectedFile(file);
            }
          }}
        />
        <button
          type="button"
          className={styles.attachButton}
          title="Attach file"
          onClick={() => {
            console.log('[ChatView] Attach button clicked, fileInputRef:', fileInputRef.current);
            fileInputRef.current?.click();
          }}
        >
          📎
        </button>
        {selectedFile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: 'var(--background)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              maxWidth: '200px',
            }}
          >
            {/* Show image preview for images */}
            {selectedFile.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '4px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <span style={{ fontSize: '24px' }}>
                {selectedFile.type.includes('pdf') ? '📄' : selectedFile.type.includes('video') ? '🎬' : '📎'}
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: 'var(--text-secondary)',
                padding: '2px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={(!messageText.trim() && !selectedFile) || isSending}
          className={styles.sendButton}
        >
          {isSending ? '...' : '→'}
        </button>
      </div>
      )}
    </div>
  );
};
