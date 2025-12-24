import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  ChevronLeft,
  ChevronDown,
  Users,
  Menu,
  MessageCircle,
  Send,
  Paperclip,
  Radio,
  Loader2,
  Reply,
  Pin,
  Pencil,
  Trash2,
  Info,
  Ban,
  Settings,
  Bell,
  User as UserIcon,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useThemeStore } from '../stores/themeStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { userService } from '../services/user.service';
import { signalRService } from '../services/signalr.service';
import { getInitials, formatTime, formatTimeOfDay, fixMinioUrl, truncateText } from '../utils/helpers';
// Toast removed - using visual feedback instead
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../services/chat.service';
import { usePermissions } from '../hooks/usePermission';
import type { Chat, BackendMessage, User } from '../types/api.types';
import { PermissionModal, type ChatMember } from './modals/PermissionModal';
import { UserProfileViewerModal } from './modals/UserProfileViewerModal';
import { GroupProfileModal } from './modals/GroupProfileModal';
import { BlockedUsersModal } from './modals/BlockedUsersModal';
import AdminPanel from './AdminPanel';
import { SettingsPanel } from './SettingsPanel';
import { confirm } from './common/ConfirmModal';
import styles from '../styles/DashboardLayout.module.css';

// Search result type for combined search
interface SearchResult {
  id: string;
  name: string;
  type: 'user' | 'group' | 'channel';
  avatar?: string;
  username?: string;
}

export const DashboardLayout = () => {
  const { user: currentUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { fancyAnimations, toggleFancyAnimations } = usePreferencesStore();
  const isDarkMode = theme === 'dark';

  // Chat store connections
  const {
    chats,
    currentChat,
    messages,
    isLoadingChats,
    isLoadingMessages,
    setCurrentChat,
    loadChats,
    loadMessages,
    sendMessage,
    isUserOnline,
    deleteMessage,
    editMessage,
    isBlockedBy,
    hasBlocked,
    loadPinnedMessages,
    getPinnedMessages,
    unpinMessage,
    isLoadingPinned,
    addBlockedUser,
    removeBlockedUser,
    setInitialPresenceStates,
  } = useChatStore();

  // Get permissions for current chat
  const { canSendMessage } = usePermissions(currentChat?.id);

  // Check block status for DM chats
  const getOtherUserId = (): string | null => {
    if (!currentChat || currentChat.type !== 'dm' || !currentUser) return null;
    const otherMember = currentChat.members?.find(m => (m.userId || m.id) !== currentUser.id);
    return otherMember?.userId || otherMember?.id || null;
  };

  const otherUserId = getOtherUserId();
  const isBlockedByOther = otherUserId ? isBlockedBy(otherUserId) : false;
  const hasBlockedOther = otherUserId ? hasBlocked(otherUserId) : false;
  const isBlocked = isBlockedByOther || hasBlockedOther;

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(() => window.innerWidth > 768);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Context menu & reply state
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<BackendMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<BackendMessage | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Modal state
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showEditUserProfile, setShowEditUserProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [userProfileUserId, setUserProfileUserId] = useState<string | null>(null);
  const [_profileUser, setProfileUser] = useState<User | null>(null);

  // Enhanced modal states
  const [_userProfileLoading, setUserProfileLoading] = useState(false);
  const [_userProfileError, setUserProfileError] = useState<string | null>(null);
  const [_iBlockedThem, setIBlockedThem] = useState(false);
  const [_theyBlockedMe, setTheyBlockedMe] = useState(false);

  // Group profile enhanced states
  const [groupProfileData, setGroupProfileData] = useState<any>(null);
  const [_groupProfileLoading, setGroupProfileLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<User[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [showBannedUsers, setShowBannedUsers] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [isLoadingBannedUsers, setIsLoadingBannedUsers] = useState(false);

  // Permission modal state
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMemberForPermissions, setSelectedMemberForPermissions] = useState<ChatMember | null>(null);

  // Edit group modal state
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState<File | null>(null);
  const [editGroupAvatarPreview, setEditGroupAvatarPreview] = useState<string | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  // Create Group/Channel modal state
  const [createGroupName, setCreateGroupName] = useState('');
  const [createGroupDescription, setCreateGroupDescription] = useState('');
  const [createGroupAvatar, setCreateGroupAvatar] = useState<File | null>(null);
  const [createGroupAvatarPreview, setCreateGroupAvatarPreview] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupPrivacy, setCreateGroupPrivacy] = useState<'public' | 'private'>('public');

  // Edit user profile modal state
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserBio, setEditUserBio] = useState('');
  const [editUserAvatar, setEditUserAvatar] = useState<File | null>(null);
  const [editUserAvatarPreview, setEditUserAvatarPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Pinned messages bar state
  const [pinnedExpanded, setPinnedExpanded] = useState(false);

  // Refs
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedChatIdRef = useRef<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Initialize - load chats on mount
  useEffect(() => {
    if (chats.length === 0) {
      loadChats();
    }
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
      if (mobile) {
        setRightPanelOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load messages when current chat changes
  useEffect(() => {
    if (currentChat && currentChat.id !== loadedChatIdRef.current) {
      loadedChatIdRef.current = currentChat.id;
      loadMessages(currentChat.id);
      loadPinnedMessages(currentChat.id);

      // Join SignalR room
      signalRService.joinChat(currentChat.id);

      // Mark messages as seen when opening the chat
      signalRService.markMessagesAsSeen(currentChat.id).catch((err) => {
        console.warn('[DashboardLayout] Failed to mark messages as seen:', err);
      });

      // Reset unread count immediately
      useChatStore.getState().resetUnreadCount(currentChat.id);

      // Reset pinned expanded state
      setPinnedExpanded(false);
    }
  }, [currentChat?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

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
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Handle scroll for scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentChat?.id]);

  // Context menu handler
  const handleContextMenu = (e: React.MouseEvent, msg: BackendMessage) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ messageId: msg.messageId, x: e.clientX, y: e.clientY });
  };

  // Toggle reaction - uses optimistic update via SignalR events (no reload needed)
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      // Use the store's toggleReaction which handles SignalR events
      await useChatStore.getState().toggleReaction(messageId, emoji);
      // SignalR will broadcast the reaction change via handleReactionAdded/handleReactionRemoved
      // No need to reload messages - the store updates automatically
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
    setContextMenu(null);
  };

  // Handle reply
  const handleReply = (msg: BackendMessage) => {
    setReplyToMessage(msg);
    setContextMenu(null);
    messageInputRef.current?.focus();
  };

  // Handle edit
  const handleStartEdit = (msg: BackendMessage) => {
    setEditingMessage(msg);
    setMessageText(msg.content || '');
    setContextMenu(null);
    messageInputRef.current?.focus();
  };

  // Handle delete
  const handleDeleteMessage = async (messageId: string) => {
    const confirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'delete',
    });
    if (!confirmed) return;
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
    setContextMenu(null);
  };

  // Handle pin/unpin - uses SignalR events for state update (no reload needed)
  const handleTogglePin = async (msg: BackendMessage) => {
    try {
      if (msg.isPinned) {
        await unpinMessage(msg.messageId);
      } else {
        await useChatStore.getState().pinMessage(msg.messageId);
      }
      // SignalR will broadcast the pin change via handleMessagePinned/handleMessageUnpinned
      // No need to reload messages - the store updates automatically
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
    setContextMenu(null);
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Jump to message (for replies)
  const handleJumpToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add(styles.highlighted);
      setTimeout(() => element.classList.remove(styles.highlighted), 2000);
    }
  };

  // Emoji mapping
  const reactionEmojis = ['👍', '❤️', '😂', '😢', '😡'];
  const typeToEmoji: Record<string, string> = {
    'Like': '👍', 'Love': '❤️', 'Laugh': '😂', 'Sad': '😢', 'Angry': '😡'
  };

  // Debounced combined search (users, groups, channels)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Search users and chats in parallel
        const [users, chats] = await Promise.all([
          userService.searchUsers(query).catch(() => []),
          chatService.searchChats(query).catch(() => []),
        ]);

        // Transform users to SearchResult format
        const userResults: SearchResult[] = users.map((u: User) => ({
          id: u.id,
          name: u.username,
          type: 'user' as const,
          avatar: u.avatar,
          username: u.username,
        }));

        // Transform chats to SearchResult format - EXCLUDE DM chats
        const chatResults: SearchResult[] = chats
          .filter((c: any) => {
            // Filter out DM chats (type 0 or 'dm') - we only want groups and channels
            const chatType = c.type || c.chatType;
            return chatType !== 'dm' && chatType !== 0;
          })
          .map((c: any) => ({
            id: c.id || c.entityId,
            name: c.name || c.displayName,
            type: (c.type === 'group' || c.chatType === 1) ? 'group' as const :
                  (c.type === 'channel' || c.chatType === 2) ? 'channel' as const : 'group' as const,
            avatar: c.avatar || c.avatarUrl,
          }));

        // Combine results
        const combined: SearchResult[] = [...userResults, ...chatResults];

        // Deduplicate by name+type (not just id) to avoid showing same name twice
        const seen = new Set<string>();
        const deduplicated = combined.filter(item => {
          // Use lowercase name + type as key to catch duplicates
          const key = `${item.type}-${item.name.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Sort: users first, then groups, then channels
        deduplicated.sort((a, b) => {
          const order = { user: 0, group: 1, channel: 2 };
          return order[a.type] - order[b.type];
        });

        setSearchResults(deduplicated);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Filter chats for sidebar
  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showSearchDropdown = searchFocused && searchQuery.length > 0;

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  // Handle search result selection (users, groups, channels)
  const handleSearchResultSelect = async (result: SearchResult) => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);

    if (result.type === 'user') {
      // Open user profile when clicking on a user
      loadUserProfile(result.id);
      setShowUserProfile(true);
    } else {
      // For groups/channels, try to find existing chat or load profile
      const existingChat = chats.find(c => c.id === result.id);
      if (existingChat) {
        setCurrentChat(existingChat);
        setMobileSidebarOpen(false);
      } else {
        // Load the group/channel profile
        try {
          const profileData = await chatService.getChatProfile(result.id);
          setGroupProfileData(profileData);
          // Create a temporary chat object to show profile
          const tempChat: Chat = {
            id: result.id,
            name: result.name,
            type: result.type,
            avatar: result.avatar,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            unreadCount: 0,
            members: [],
          };
          setCurrentChat(tempChat);
          setShowGroupProfile(true);
        } catch (error) {
          console.error('Failed to load profile:', error);
        }
      }
    }
  };

  const handleSelectChat = (chat: Chat) => {
    setCurrentChat(chat);
    setMobileSidebarOpen(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('[DashboardLayout] handleSendMessage called', {
      hasText: !!messageText.trim(),
      hasFile: !!selectedFile,
      fileName: selectedFile?.name,
      chatId: currentChat?.id,
    });

    if ((!messageText.trim() && !selectedFile) || !currentChat || isSending) {
      console.log('[DashboardLayout] Skipping send - validation failed');
      return;
    }

    setIsSending(true);
    try {
      // Handle editing
      if (editingMessage) {
        await editMessage(editingMessage.messageId, messageText.trim());
        setEditingMessage(null);
        setMessageText('');
        return;
      }

      // Get receiver ID for DM chats
      let receiverId: string | undefined;
      if (currentChat.type === 'dm' && currentChat.members) {
        const otherMember = currentChat.members.find(m =>
          (m.userId || m.id) !== currentUser?.id
        );
        receiverId = otherMember?.userId || otherMember?.id;
      }

      // Send message with optional replyId
      console.log('[DashboardLayout] Sending message...', {
        chatId: currentChat.id,
        receiverId,
        hasFile: !!selectedFile,
        replyId: replyToMessage?.messageId,
      });

      await sendMessage(
        currentChat.id,
        receiverId,
        messageText.trim(),
        selectedFile || undefined,
        replyToMessage?.messageId
      );

      console.log('[DashboardLayout] Message sent successfully');
      setMessageText('');
      setSelectedFile(null);
      setReplyToMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[DashboardLayout] Failed to send message:', error);
    } finally {
      console.log('[DashboardLayout] Send complete, resetting isSending');
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get online status for a chat
  const getChatOnlineStatus = (chat: Chat): boolean => {
    if (chat.type !== 'dm') return false;
    if (!chat.members || !currentUser) return chat.isOnline || false;

    const otherMember = chat.members.find(m =>
      (m.userId || m.id) !== currentUser.id
    );
    if (!otherMember) return false;

    const otherUserId = otherMember.userId || otherMember.id;
    return isUserOnline(otherUserId);
  };

  // Get last message preview
  const getLastMessagePreview = (chat: Chat): string => {
    if (chat.lastMessage) {
      const content = chat.lastMessage.content || '';
      if (chat.lastMessage.fileUrl && !content) {
        return '📎 Attachment';
      }
      return truncateText(content, 40);
    }
    return 'No messages yet';
  };

  // Get time for chat item
  const getChatTime = (chat: Chat): string => {
    if (chat.lastMessage?.createdAt) {
      return formatTime(chat.lastMessage.createdAt);
    }
    return formatTime(chat.updatedAt || chat.createdAt);
  };

  // ===== ENHANCED USER PROFILE FUNCTIONS =====
  const loadUserProfile = async (userId: string) => {
    setUserProfileUserId(userId); // Track which user we're viewing
    setUserProfileLoading(true);
    setUserProfileError(null);
    try {
      const profile = await userService.getUserProfile(userId);
      setProfileUser(profile);
      // Check block status
      const status = await userService.getMutualBlockStatus(userId);
      setIBlockedThem(status.iBlockedThem);
      setTheyBlockedMe(status.theyBlockedMe);
    } catch (err: any) {
      setUserProfileError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setUserProfileLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    // Confirmation already shown in UserProfileViewerModal
    try {
      await userService.blockUser(userId);
      addBlockedUser(userId);
      setIBlockedThem(true);
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    // Confirmation already shown in UserProfileViewerModal
    try {
      await userService.unblockUser(userId);
      removeBlockedUser(userId);
      setIBlockedThem(false);
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  const handleStartDMFromProfile = async (userId: string) => {
    try {
      // First, search for existing DM in loaded chats
      const existingDM = chats.find(chat => {
        if (chat.type !== 'dm') return false;
        // Check if this DM has the target user as a member
        if (chat.members && chat.members.length > 0) {
          return chat.members.some(m => (m.userId || m.id) === userId);
        }
        return false;
      });

      if (existingDM) {
        // Found existing DM - just navigate to it
        setCurrentChat(existingDM);
        setShowUserProfile(false);
        setMobileSidebarOpen(false);
        return;
      }

      // No existing DM found - check if we need to fetch more chat details
      // Some DMs might not have members loaded, search by fetching profiles
      for (const chat of chats.filter(c => c.type === 'dm')) {
        if (!chat.members || chat.members.length === 0) {
          try {
            const profile = await chatService.getChatProfile(chat.id);
            if (profile.members?.some((m: any) => m.userId === userId || m.user?.id === userId)) {
              setCurrentChat(chat);
              setShowUserProfile(false);
              setMobileSidebarOpen(false);
              return;
            }
          } catch {
            // Continue searching
          }
        }
      }

      // No existing DM found - create new one
      const dm = await chatService.createOrGetDM(userId);
      if (dm) {
        setCurrentChat(dm);
        await loadChats(); // Refresh to get the new chat in list
      }
      setShowUserProfile(false);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      console.error('Failed to start conversation');
    }
  };

  // ===== ENHANCED GROUP PROFILE FUNCTIONS =====
  const loadGroupProfile = async (chatId: string) => {
    setGroupProfileLoading(true);
    try {
      const profileData = await chatService.getChatProfile(chatId);
      setGroupProfileData(profileData);

      // Load presence states for all members
      const memberIds = profileData.members?.map((m: any) => m.userId) || [];
      if (memberIds.length > 0) {
        try {
          const presenceStates = await signalRService.getPresenceStates(memberIds);
          if (Object.keys(presenceStates).length > 0) {
            setInitialPresenceStates(presenceStates);
          }
        } catch (err) {
          console.error('Failed to load presence states:', err);
        }
      }
    } catch (error) {
      console.error('Failed to load group profile:', error);
    } finally {
      setGroupProfileLoading(false);
    }
  };

  const handleSearchMembersToAdd = async (query: string) => {
    setAddMemberQuery(query);
    if (!query.trim()) {
      setAddMemberResults([]);
      return;
    }
    setIsSearchingMembers(true);
    try {
      const results = await userService.searchUsers(query);
      // Filter out existing members
      const memberIds = new Set(groupProfileData?.members?.map((m: any) => m.userId) || []);
      const filtered = results.filter((u: User) => !memberIds.has(u.id));
      setAddMemberResults(filtered);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const handleAddMemberToGroup = async (userId: string) => {
    if (!currentChat) return;
    try {
      if (currentChat.type === 'group') {
        await chatService.addMemberToGroup(currentChat.id, userId);
      } else if (currentChat.type === 'channel') {
        await chatService.addMemberToChannel(currentChat.id, userId);
      }
      setShowAddMember(false);
      setAddMemberQuery('');
      setAddMemberResults([]);
      await loadGroupProfile(currentChat.id);
    } catch (error: any) {
      console.error('Failed to add member:', error);
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!currentChat) return;
    // Confirmation already shown in GroupProfileModal
    try {
      if (currentChat.type === 'group') {
        await chatService.removeMemberFromGroup(currentChat.id, userId);
      } else if (currentChat.type === 'channel') {
        await chatService.removeMemberFromChannel(currentChat.id, userId);
      }
      await loadGroupProfile(currentChat.id);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleBanMember = async (userId: string) => {
    if (!currentChat) return;
    // Confirmation already shown in GroupProfileModal
    try {
      await chatService.banUser(currentChat.id, userId);
      await loadGroupProfile(currentChat.id);
    } catch (error) {
      console.error('Failed to ban member:', error);
    }
  };

  const handleUnbanMember = async (userId: string, _username: string) => {
    if (!currentChat) return;
    // Confirmation already shown in GroupProfileModal
    try {
      await chatService.unbanUser(currentChat.id, userId);
      await loadBannedUsersList();
    } catch (error) {
      console.error('Failed to unban member:', error);
    }
  };

  const loadBannedUsersList = async () => {
    if (!currentChat) return;
    setIsLoadingBannedUsers(true);
    try {
      const banned = await chatService.getBannedUsers(currentChat.id);
      setBannedUsers(banned);
    } catch (error) {
      console.error('Failed to load banned users:', error);
    } finally {
      setIsLoadingBannedUsers(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentChat) return;
    // Confirmation already shown in GroupProfileModal
    try {
      await chatService.leaveChat(currentChat.id, currentChat.type as 'group' | 'channel');
      setShowGroupProfile(false);
      setCurrentChat(null);
      loadChats();
    } catch (error) {
      console.error('Failed to leave:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!currentChat) return;
    // Confirmation already shown in GroupProfileModal
    try {
      await chatService.deleteChat(currentChat.id, currentChat.type as 'group' | 'channel');
      setShowGroupProfile(false);
      setCurrentChat(null);
      loadChats();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleUpdatePrivacy = async (privacy: 'public' | 'private') => {
    if (!currentChat) return;
    // Confirmation already shown in GroupProfileModal
    try {
      await chatService.updateChatPrivacy(currentChat.id, privacy);
      // Immediately update local state for instant UI feedback
      setCurrentChat({ ...currentChat, privacy });
      // Reload in background to sync with server
      loadGroupProfile(currentChat.id);
    } catch (error) {
      console.error('Failed to update privacy:', error);
    }
  };

  // Open edit group modal
  const handleOpenEditGroup = () => {
    if (!currentChat) return;
    setEditGroupName(currentChat.name || '');
    setEditGroupDescription(currentChat.description || '');
    setEditGroupAvatar(null);
    setEditGroupAvatarPreview(currentChat.avatar ? fixMinioUrl(currentChat.avatar) ?? null : null);
    setShowEditGroup(true);
  };

  // Handle avatar file selection
  const handleEditGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditGroupAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditGroupAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save group changes
  const handleSaveGroupChanges = async () => {
    if (!currentChat || !editGroupName.trim()) return;

    setIsUpdatingGroup(true);
    try {
      const formData = new FormData();
      // Use PascalCase field names to match backend DTO (UpdateChatDto)
      formData.append('Name', editGroupName.trim());
      formData.append('Description', editGroupDescription.trim());
      if (editGroupAvatar) {
        // 'file' matches the IFormFile parameter name in the backend controller
        formData.append('file', editGroupAvatar);
        console.log('[EditGroup] Appending avatar file:', editGroupAvatar.name, editGroupAvatar.size, 'bytes');
      }

      console.log('[EditGroup] Sending update for chat:', currentChat.id, currentChat.type);
      await chatService.updateChat(currentChat.id, currentChat.type as 'group' | 'channel', formData);

      // Immediately update local state for instant UI feedback
      const updatedChat = {
        ...currentChat,
        name: editGroupName.trim(),
        description: editGroupDescription.trim(),
        // Use the preview URL temporarily if avatar was changed
        ...(editGroupAvatar && editGroupAvatarPreview ? { avatar: editGroupAvatarPreview } : {})
      };

      // Update current chat for instant header/panel update
      setCurrentChat(updatedChat);

      // Close modal first for instant feedback
      setShowEditGroup(false);

      // Reload chats list immediately to update sidebar, then reload profile in background
      loadChats();
      setTimeout(() => {
        loadGroupProfile(currentChat.id);
      }, 300);
    } catch (error) {
      console.error('Failed to update group:', error);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Reset create group/channel form
  const resetCreateGroupForm = () => {
    setCreateGroupName('');
    setCreateGroupDescription('');
    setCreateGroupAvatar(null);
    setCreateGroupAvatarPreview(null);
    setCreateGroupPrivacy('public');
  };

  // Handle create group avatar change
  const handleCreateGroupAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreateGroupAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCreateGroupAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create group handler
  const handleCreateGroup = async () => {
    console.log('[DashboardLayout] handleCreateGroup called');
    console.log('[DashboardLayout] createGroupName:', createGroupName);

    if (!createGroupName.trim()) {
      console.log('[DashboardLayout] Group name is empty, returning');
      return;
    }

    setIsCreatingGroup(true);
    try {
      const formData = new FormData();
      formData.append('Name', createGroupName.trim());
      formData.append('Description', createGroupDescription.trim());
      // Backend expects PrivacyType enum: "Public" or "Private" (capitalized)
      formData.append('PrivacyType', createGroupPrivacy === 'public' ? 'Public' : 'Private');
      if (createGroupAvatar) {
        formData.append('file', createGroupAvatar);
      }

      // Log FormData contents
      console.log('[DashboardLayout] FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
      }

      console.log('[DashboardLayout] Calling chatService.createGroup...');
      const newChat = await chatService.createGroup(formData);
      console.log('[DashboardLayout] createGroup response:', newChat);

      setShowCreateGroup(false);
      resetCreateGroupForm();
      await loadChats();
      if (newChat) {
        setCurrentChat(newChat);
      }
      console.log('[DashboardLayout] Group created successfully!');
    } catch (error) {
      console.error('[DashboardLayout] Failed to create group:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Create channel handler
  const handleCreateChannel = async () => {
    if (!createGroupName.trim()) return;

    setIsCreatingGroup(true);
    try {
      const formData = new FormData();
      formData.append('Name', createGroupName.trim());
      formData.append('Description', createGroupDescription.trim());
      // Backend expects PrivacyType enum: "Public" or "Private" (capitalized)
      formData.append('PrivacyType', createGroupPrivacy === 'public' ? 'Public' : 'Private');
      if (createGroupAvatar) {
        formData.append('file', createGroupAvatar);
      }

      const newChat = await chatService.createChannel(formData);
      setShowCreateChannel(false);
      resetCreateGroupForm();
      await loadChats();
      if (newChat) {
        setCurrentChat(newChat);
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Open edit profile modal
  const handleOpenEditProfile = () => {
    setEditUserUsername(currentUser?.username || '');
    setEditUserBio(currentUser?.bio || '');
    setEditUserAvatar(null);
    setEditUserAvatarPreview(currentUser?.avatar ? fixMinioUrl(currentUser.avatar) ?? null : null);
    setShowEditUserProfile(true);
  };

  // Handle edit profile avatar change
  const handleEditProfileAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditUserAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditUserAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile changes
  const handleSaveProfileChanges = async () => {
    if (!editUserUsername.trim()) return;

    setIsUpdatingProfile(true);
    try {
      const formData = new FormData();
      formData.append('Username', editUserUsername.trim());
      // Backend expects "Description" not "Bio"
      formData.append('Description', editUserBio.trim());
      if (editUserAvatar) {
        formData.append('file', editUserAvatar);
      }

      const updatedUser = await userService.updateProfile(formData);
      if (updatedUser) {
        useAuthStore.getState().setUser(updatedUser);
      }
      setShowEditUserProfile(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Mobile Overlay */}
      <div
        className={`${styles.mobileOverlay} ${mobileSidebarOpen ? styles.visible : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Wrapper */}
      <div className={styles.mainWrapper}>
        {/* Left Sidebar */}
        <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.open : ''}`}>
          {/* Search Section */}
          <div className={styles.searchSection} ref={searchRef}>
            <div className={styles.searchContainer}>
              <div className={styles.searchWrapper}>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                />
                <Search className={styles.searchIcon} size={15} strokeWidth={2} />
                {searchQuery && (
                  <button
                    className={styles.clearSearch}
                    onClick={handleClearSearch}
                    aria-label="Clear"
                    type="button"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearchDropdown && (
                <div className={styles.searchDropdown}>
                  {isSearching ? (
                    <div className={styles.noResults}>
                      <Loader2 size={18} className={styles.spinner} />
                      <span>Searching...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      {/* Users Section */}
                      {searchResults.filter(r => r.type === 'user').length > 0 && (
                        <>
                          <div className={styles.dropdownHeader}>
                            <Users size={12} />
                            Users
                          </div>
                          {searchResults.filter(r => r.type === 'user').map((result) => (
                            <button
                              key={`user-${result.id}`}
                              className={styles.searchResultItem}
                              onClick={() => handleSearchResultSelect(result)}
                              type="button"
                            >
                              <div className={styles.resultAvatar}>
                                {result.avatar ? (
                                  <img src={fixMinioUrl(result.avatar)} alt={result.name} />
                                ) : (
                                  getInitials(result.name)
                                )}
                              </div>
                              <div className={styles.resultInfo}>
                                <span className={styles.resultName}>{result.name}</span>
                                <span className={styles.resultUsername}>@{result.username || result.name}</span>
                              </div>
                              <div className={styles.resultTypeIcon}>
                                <Users size={14} />
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Groups Section */}
                      {searchResults.filter(r => r.type === 'group').length > 0 && (
                        <>
                          <div className={styles.dropdownHeader}>
                            <Users size={12} />
                            Groups
                          </div>
                          {searchResults.filter(r => r.type === 'group').map((result) => (
                            <button
                              key={`group-${result.id}`}
                              className={styles.searchResultItem}
                              onClick={() => handleSearchResultSelect(result)}
                              type="button"
                            >
                              <div className={`${styles.resultAvatar} ${styles.group}`}>
                                {result.avatar ? (
                                  <img src={fixMinioUrl(result.avatar)} alt={result.name} />
                                ) : (
                                  <Users size={16} />
                                )}
                              </div>
                              <div className={styles.resultInfo}>
                                <span className={styles.resultName}>{result.name}</span>
                                <span className={styles.resultType}>Group</span>
                              </div>
                              <div className={`${styles.resultTypeIcon} ${styles.group}`}>
                                <Users size={14} />
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Channels Section */}
                      {searchResults.filter(r => r.type === 'channel').length > 0 && (
                        <>
                          <div className={styles.dropdownHeader}>
                            <Radio size={12} />
                            Channels
                          </div>
                          {searchResults.filter(r => r.type === 'channel').map((result) => (
                            <button
                              key={`channel-${result.id}`}
                              className={styles.searchResultItem}
                              onClick={() => handleSearchResultSelect(result)}
                              type="button"
                            >
                              <div className={`${styles.resultAvatar} ${styles.channel}`}>
                                {result.avatar ? (
                                  <img src={fixMinioUrl(result.avatar)} alt={result.name} />
                                ) : (
                                  <Radio size={16} />
                                )}
                              </div>
                              <div className={styles.resultInfo}>
                                <span className={styles.resultName}>{result.name}</span>
                                <span className={styles.resultType}>Channel</span>
                              </div>
                              <div className={`${styles.resultTypeIcon} ${styles.channel}`}>
                                <Radio size={14} />
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <div className={styles.noResults}>
                      <Search size={18} strokeWidth={1.5} />
                      <span>No results found</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className={styles.chatList}>
            {isLoadingChats ? (
              <div className={styles.loadingChats}>
                <Loader2 size={24} className={styles.spinner} />
                <span>Loading chats...</span>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className={styles.noChats}>
                <MessageCircle size={24} strokeWidth={1.5} />
                <span>No conversations yet</span>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`${styles.chatItem} ${currentChat?.id === chat.id ? styles.active : ''}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className={`${styles.chatAvatar} ${chat.type !== 'dm' ? styles.group : ''}`}>
                    {chat.avatar ? (
                      <img src={fixMinioUrl(chat.avatar)} alt={chat.name} />
                    ) : chat.type === 'group' ? (
                      <Users size={18} strokeWidth={2} />
                    ) : chat.type === 'channel' ? (
                      <Radio size={18} strokeWidth={2} />
                    ) : (
                      getInitials(chat.name)
                    )}
                    {chat.type === 'dm' && getChatOnlineStatus(chat) && (
                      <div className={styles.chatOnlineStatus} />
                    )}
                  </div>
                  <div className={styles.chatInfo}>
                    <div className={styles.chatNameRow}>
                      <span className={styles.chatName}>{chat.name}</span>
                      <span className={styles.chatTime}>{getChatTime(chat)}</span>
                    </div>
                    <div className={styles.chatPreviewRow}>
                      <span className={styles.chatPreview}>{getLastMessagePreview(chat)}</span>
                      {chat.unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{chat.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sidebar Footer - Settings Button */}
          <div className={styles.sidebarFooter}>
            <button
              className={styles.settingsButton}
              onClick={() => setShowSettings(true)}
              type="button"
            >
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  {currentUser?.avatar ? (
                    <img src={fixMinioUrl(currentUser.avatar)} alt={currentUser.username} />
                  ) : (
                    getInitials(currentUser?.username || 'U')
                  )}
                </div>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{currentUser?.username || 'User'}</span>
                  <span className={styles.userStatus}>Online</span>
                </div>
              </div>
              <Settings size={18} strokeWidth={2} />
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          {/* Mobile Header */}
          <div className={styles.mobileHeader}>
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle menu"
              type="button"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
            <span className={styles.mobileTitle}>
              {currentChat ? currentChat.name : 'Messages'}
            </span>
          </div>

          {!currentChat ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <MessageCircle size={32} strokeWidth={1.5} />
              </div>
              <h2 className={styles.emptyStateTitle}>Select a conversation</h2>
              <p className={styles.emptyStateText}>
                Choose a chat from the sidebar to start messaging
              </p>
            </div>
          ) : (
            <div className={styles.chatViewContainer}>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                  <div className={`${styles.chatHeaderAvatar} ${currentChat.type !== 'dm' ? styles.group : ''}`}>
                    {currentChat.avatar ? (
                      <img src={fixMinioUrl(currentChat.avatar)} alt={currentChat.name} />
                    ) : currentChat.type === 'group' ? (
                      <Users size={20} strokeWidth={2} />
                    ) : currentChat.type === 'channel' ? (
                      <Radio size={20} strokeWidth={2} />
                    ) : (
                      getInitials(currentChat.name)
                    )}
                  </div>
                  <div className={styles.chatHeaderInfo}>
                    <h3 className={styles.chatHeaderName}>{currentChat.name}</h3>
                    <span className={styles.chatHeaderStatus}>
                      {currentChat.type === 'dm' ? (
                        getChatOnlineStatus(currentChat) ? 'Online' : 'Offline'
                      ) : (
                        `${currentChat.members?.length || currentChat.participantsCount || 0} members`
                      )}
                    </span>
                  </div>
                </div>
                <div className={styles.chatHeaderRight}>
                  {currentChat.type !== 'dm' && (
                    <button
                      className={styles.chatHeaderBtn}
                      onClick={() => {
                        setShowGroupProfile(true);
                        loadGroupProfile(currentChat.id);
                      }}
                      title={`${currentChat.type === 'channel' ? 'Channel' : 'Group'} Info`}
                      type="button"
                    >
                      <Info size={18} strokeWidth={2} style={{ flexShrink: 0, minWidth: 18 }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline Pinned Messages Bar */}
              {(() => {
                const pinnedMessages = getPinnedMessages(currentChat.id);
                if (pinnedMessages.length === 0) return null;
                return (
                  <div className={styles.pinnedBar}>
                    <button
                      className={styles.pinnedBarHeader}
                      onClick={() => setPinnedExpanded(!pinnedExpanded)}
                      type="button"
                    >
                      <div className={styles.pinnedBarLeft}>
                        <Pin size={14} />
                        <span>{pinnedMessages.length} pinned message{pinnedMessages.length !== 1 ? 's' : ''}</span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`${styles.pinnedBarChevron} ${pinnedExpanded ? styles.expanded : ''}`}
                      />
                    </button>
                    <AnimatePresence>
                      {pinnedExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={styles.pinnedBarContent}
                        >
                          {isLoadingPinned ? (
                            <div className={styles.pinnedLoading}>
                              <Loader2 size={16} className={styles.spinner} />
                            </div>
                          ) : (
                            pinnedMessages.map((pm) => (
                              <div key={pm.messageId} className={styles.pinnedItem}>
                                <div className={styles.pinnedItemInfo}>
                                  <span className={styles.pinnedItemSender}>{pm.senderUsername}</span>
                                  <span className={styles.pinnedItemPreview}>
                                    {pm.content ? truncateText(pm.content, 50) : (pm.fileUrl ? 'Attachment' : 'Empty')}
                                  </span>
                                </div>
                                <button
                                  className={styles.pinnedItemJump}
                                  onClick={() => handleJumpToMessage(pm.messageId)}
                                  type="button"
                                >
                                  Jump
                                </button>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* Messages Container */}
              <div className={styles.messagesContainer} ref={messagesContainerRef}>
                {isLoadingMessages ? (
                  <div className={styles.loadingMessages}>
                    <Loader2 size={24} className={styles.spinner} />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.noMessages}>
                    <MessageCircle size={24} strokeWidth={1.5} />
                    <span>No messages yet. Start the conversation!</span>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.messageId}
                      id={`msg-${msg.messageId}`}
                      className={`${styles.message} ${msg.isCurrentUser ? styles.own : ''}`}
                    >
                      {!msg.isCurrentUser && (
                        <div
                          className={styles.messageAvatar}
                          onClick={() => {
                            if (msg.senderId) {
                              loadUserProfile(msg.senderId);
                              setShowUserProfile(true);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          title={`View ${msg.senderUsername}'s profile`}
                        >
                          {msg.senderAvatarUrl ? (
                            <img src={fixMinioUrl(msg.senderAvatarUrl)} alt={msg.senderUsername} />
                          ) : (
                            getInitials(msg.senderUsername)
                          )}
                        </div>
                      )}
                      <div
                        className={styles.messageBubble}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                        onClick={(e) => {
                          // Mobile tap to open menu (only on touch devices)
                          if ('ontouchstart' in window && e.detail === 1) {
                            // Don't open if clicking on interactive elements
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('a') || target.closest(`.${styles.replyPreview}`)) {
                              return;
                            }
                            e.preventDefault();
                            setContextMenu({ messageId: msg.messageId, x: e.clientX, y: e.clientY });
                          }
                        }}
                      >
                        {!msg.isCurrentUser && currentChat.type !== 'dm' && (
                          <span
                            className={styles.messageSender}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.senderId) {
                                loadUserProfile(msg.senderId);
                                setShowUserProfile(true);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                            title={`View ${msg.senderUsername}'s profile`}
                          >
                            {msg.senderUsername}
                          </span>
                        )}

                        {/* Reply Preview */}
                        {msg.replyId && (() => {
                          const replyToMsg = messages.find(m => m.messageId === msg.replyId);
                          return (
                            <div
                              className={styles.replyPreview}
                              onClick={() => replyToMsg && handleJumpToMessage(msg.replyId!)}
                            >
                              <Reply size={12} />
                              <span className={styles.replyAuthor}>
                                {replyToMsg?.senderUsername || 'Unknown'}
                              </span>
                              <span className={styles.replyContent}>
                                {replyToMsg?.content?.substring(0, 40) || (replyToMsg?.fileUrl ? '📎 File' : 'Deleted')}
                                {replyToMsg?.content && replyToMsg.content.length > 40 ? '...' : ''}
                              </span>
                            </div>
                          );
                        })()}

                        {msg.fileUrl && (
                          <div className={styles.messageAttachment}>
                            {/\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl) ? (
                              <img
                                src={fixMinioUrl(msg.fileUrl)}
                                alt="Attachment"
                                className={styles.attachmentImage}
                              />
                            ) : (
                              <a
                                href={fixMinioUrl(msg.fileUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.attachmentLink}
                              >
                                <Paperclip size={14} />
                                <span>View Attachment</span>
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content && (
                          <p className={styles.messageText}>{msg.content}</p>
                        )}

                        {/* Reactions Display */}
                        {msg.messageReactions && msg.messageReactions.length > 0 && (() => {
                          const reactionCounts = msg.messageReactions.reduce((acc: Record<string, { count: number; users: string[] }>, r: any) => {
                            const type = r.reactionType || r.type || 'Like';
                            if (!acc[type]) acc[type] = { count: 0, users: [] };
                            acc[type].count++;
                            acc[type].users.push(r.userName || r.userId || 'User');
                            return acc;
                          }, {});
                          return (
                            <div className={styles.messageReactions}>
                              {Object.entries(reactionCounts).map(([type, data]: [string, any]) => (
                                <button
                                  key={type}
                                  className={styles.reactionBadge}
                                  onClick={() => handleToggleReaction(msg.messageId, typeToEmoji[type] || '👍')}
                                  title={data.users.join(', ')}
                                >
                                  {typeToEmoji[type] || '👍'}
                                  {data.count > 1 && <span>{data.count}</span>}
                                </button>
                              ))}
                            </div>
                          );
                        })()}

                        <div className={styles.messageFooter}>
                          <span className={styles.messageTime}>
                            {formatTimeOfDay(msg.sentAt)}
                            {(msg as any).editedAt && <span className={styles.editedLabel}> (edited)</span>}
                          </span>
                          {'isSeen' in msg && (
                            <span className={`${styles.seenIndicator} ${msg.isSeen ? styles.seen : styles.delivered}`}>
                              {msg.isSeen ? '\u2713\u2713' : '\u2713'}
                            </span>
                          )}
                        </div>

                        {/* Context Menu */}
                        {contextMenu?.messageId === msg.messageId && (
                          <div
                            ref={contextMenuRef}
                            className={styles.contextMenu}
                            style={{
                              position: 'fixed',
                              top: Math.min(contextMenu.y, window.innerHeight - 220),
                              left: Math.min(contextMenu.x, window.innerWidth - 160),
                            }}
                          >
                            {/* Quick Reactions */}
                            <div className={styles.contextReactions}>
                              {reactionEmojis.map((emoji) => (
                                <button
                                  key={emoji}
                                  className={styles.contextReactionBtn}
                                  onClick={() => handleToggleReaction(msg.messageId, emoji)}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                            <div className={styles.contextDivider} />
                            {/* Reply */}
                            <button className={styles.contextMenuItem} onClick={() => handleReply(msg)}>
                              <Reply size={14} /> Reply
                            </button>
                            {/* Pin/Unpin */}
                            <button className={styles.contextMenuItem} onClick={() => handleTogglePin(msg)}>
                              <Pin size={14} /> {msg.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            {/* Edit (own messages only) */}
                            {msg.isCurrentUser && (
                              <button className={styles.contextMenuItem} onClick={() => handleStartEdit(msg)}>
                                <Pencil size={14} /> Edit
                              </button>
                            )}
                            {/* Delete (own messages only) */}
                            {msg.isCurrentUser && (
                              <button
                                className={`${styles.contextMenuItem} ${styles.danger}`}
                                onClick={() => handleDeleteMessage(msg.messageId)}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollButton && (
                <button
                  className={styles.scrollToBottomBtn}
                  onClick={scrollToBottom}
                  type="button"
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown size={18} />
                </button>
              )}

              {/* Message Input */}
              <div className={styles.messageInputContainer}>
                {/* Block/Permission Notice */}
                {isBlocked ? (
                  <div className={styles.inputDisabledNotice}>
                    <span>
                      {hasBlockedOther
                        ? 'You have blocked this user. Unblock to send messages.'
                        : 'You cannot message this user.'}
                    </span>
                  </div>
                ) : !canSendMessage && currentChat.type !== 'dm' ? (
                  <div className={styles.inputDisabledNotice}>
                    <span>You don't have permission to send messages in this chat.</span>
                  </div>
                ) : (
                  <>
                    {/* Reply Bar */}
                    {replyToMessage && (
                      <div className={styles.replyBar}>
                        <div className={styles.replyBarContent}>
                          <div className={styles.replyBarIcon}>
                            <Reply size={14} />
                          </div>
                          <div className={styles.replyBarInfo}>
                            <span className={styles.replyBarLabel}>
                              Replying to {replyToMessage.senderUsername}
                            </span>
                            <span className={styles.replyBarText}>
                              {replyToMessage.content?.substring(0, 50) || '📎 Attachment'}
                              {replyToMessage.content && replyToMessage.content.length > 50 ? '...' : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          className={styles.replyBarClose}
                          onClick={() => setReplyToMessage(null)}
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Edit Bar */}
                    {editingMessage && (
                      <div className={styles.editBar}>
                        <div className={styles.editBarContent}>
                          <div className={styles.editBarIcon}>
                            <Pencil size={14} />
                          </div>
                          <div className={styles.editBarInfo}>
                            <span className={styles.editBarLabel}>Editing message</span>
                            <span className={styles.editBarText}>
                              {editingMessage.content?.substring(0, 50) || ''}
                              {editingMessage.content && editingMessage.content.length > 50 ? '...' : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          className={styles.editBarClose}
                          onClick={() => {
                            setEditingMessage(null);
                            setMessageText('');
                          }}
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {selectedFile && (
                      <div className={styles.filePreview}>
                        <span className={styles.fileName}>{selectedFile.name}</span>
                        <button
                          className={styles.removeFile}
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                    <div className={styles.messageInputRow}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className={styles.fileInput}
                        onChange={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const file = e.target.files?.[0] || null;
                          console.log('[DashboardLayout] File selected:', file?.name, file?.size);
                          setSelectedFile(file);
                        }}
                      />
                      <button
                        className={styles.attachBtn}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        <Paperclip size={18} strokeWidth={2} />
                      </button>
                      <input
                        type="text"
                        className={styles.messageInput}
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isSending}
                      />
                      <button
                        className={styles.sendBtn}
                        onClick={(e) => handleSendMessage(e)}
                        disabled={(!messageText.trim() && !selectedFile) || isSending}
                        type="button"
                      >
                        {isSending ? (
                          <Loader2 size={18} className={styles.spinner} />
                        ) : (
                          <Send size={18} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Toggle Right Panel Button */}
          {!rightPanelOpen && currentChat && (
            <button
              className={styles.togglePanelBtn}
              onClick={() => setRightPanelOpen(true)}
              aria-label="Open panel"
              type="button"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
          )}
        </main>

        {/* Right Panel */}
        <aside className={`${styles.rightPanel} ${!rightPanelOpen ? styles.collapsed : ''}`}>
          <div className={styles.rightPanelHeader}>
            <span className={styles.rightPanelTitle}>Details</span>
            <button
              className={styles.closePanel}
              onClick={() => setRightPanelOpen(false)}
              aria-label="Close panel"
              type="button"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          <div className={styles.rightPanelContent}>
            {currentChat ? (
              <div
                className={`${styles.panelDetails} ${styles.clickable}`}
                onClick={() => {
                  console.log('[DashboardLayout] Panel details clicked', {
                    chatType: currentChat.type,
                    members: currentChat.members,
                    currentUserId: currentUser?.id,
                  });
                  if (currentChat.type === 'dm') {
                    // Get the other user from the DM using the existing helper
                    const userId = getOtherUserId();
                    console.log('[DashboardLayout] DM profile click, otherUserId:', userId);
                    if (userId) {
                      setShowUserProfile(true);
                      loadUserProfile(userId);
                    } else {
                      console.warn('[DashboardLayout] Could not find other user in DM');
                    }
                  } else if (currentChat.type === 'group' || currentChat.type === 'channel') {
                    // Open group/channel profile modal
                    setShowGroupProfile(true);
                    loadGroupProfile(currentChat.id);
                  }
                }}
              >
                <div className={styles.panelAvatar}>
                  {currentChat.avatar ? (
                    <img src={fixMinioUrl(currentChat.avatar)} alt={currentChat.name} />
                  ) : currentChat.type === 'group' ? (
                    <Users size={32} strokeWidth={1.5} />
                  ) : currentChat.type === 'channel' ? (
                    <Radio size={32} strokeWidth={1.5} />
                  ) : (
                    <span>{getInitials(currentChat.name)}</span>
                  )}
                </div>
                <h3 className={styles.panelName}>{currentChat.name}</h3>
                <p className={styles.panelType}>
                  {currentChat.type === 'dm' ? 'Direct Message' :
                   currentChat.type === 'group' ? 'Group Chat' : 'Channel'}
                </p>
                {currentChat.description && (
                  <p className={styles.panelDescription}>{currentChat.description}</p>
                )}
                {currentChat.type !== 'dm' && (
                  <div className={styles.panelMemberCount}>
                    <Users size={16} />
                    <span>{currentChat.members?.length || currentChat.participantsCount || 0} members</span>
                  </div>
                )}
                <p className={styles.panelClickHint}>
                  {currentChat.type === 'dm' ? 'Click to view profile' : 'Click to view details'}
                </p>
              </div>
            ) : (
              <div className={styles.panelPlaceholder}>
                <Users size={28} strokeWidth={1.5} />
                <p>Select a conversation to view details</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onCreateGroup={() => { resetCreateGroupForm(); setShowCreateGroup(true); }}
        onCreateChannel={() => { resetCreateGroupForm(); setShowCreateChannel(true); }}
        onEditProfile={handleOpenEditProfile}
        onShowNotifications={() => setShowNotifications(true)}
        onShowAdminPanel={() => setShowAdminPanel(true)}
        onShowBlockedUsers={() => setShowBlockedUsersModal(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
        onLogout={logout}
        fancyAnimations={fancyAnimations}
        onToggleFancyAnimations={toggleFancyAnimations}
      />

      {/* User Profile Modal - Using redesigned component */}
      {userProfileUserId && (
        <UserProfileViewerModal
          isOpen={showUserProfile}
          onClose={() => {
            setShowUserProfile(false);
            setUserProfileUserId(null);
          }}
          userId={userProfileUserId}
          onSendMessage={(userId) => {
            handleStartDMFromProfile(userId);
          }}
          onBlockUser={(userId) => {
            handleBlockUser(userId);
          }}
          onUnblockUser={(userId) => {
            handleUnblockUser(userId);
          }}
          fancyAnimations={fancyAnimations}
        />
      )}

      {/* Group/Channel Profile Modal - Using redesigned component */}
      {currentChat && currentChat.type !== 'dm' && (
        <GroupProfileModal
          isOpen={showGroupProfile}
          onClose={() => setShowGroupProfile(false)}
          chat={currentChat}
          currentUserId={currentUser?.id || ''}
          onEditGroup={handleOpenEditGroup}
          onDeleteGroup={handleDeleteGroup}
          onLeaveGroup={handleLeaveGroup}
          onKickMember={handleKickMember}
          onViewUserProfile={(userId) => {
            setShowGroupProfile(false);
            loadUserProfile(userId);
            setShowUserProfile(true);
          }}
          onBanMember={async (userId) => {
            await handleBanMember(userId);
          }}
          onUnbanMember={async (userId) => {
            await handleUnbanMember(userId, 'User');
          }}
          onUpdatePrivacy={async (privacy) => {
            await handleUpdatePrivacy(privacy);
          }}
          fancyAnimations={fancyAnimations}
        />
      )}

      {/* Edit Group/Channel Modal */}
      <AnimatePresence>
        {showEditGroup && currentChat && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditGroup(false)}
          >
            <motion.div
              className={styles.subModal}
              style={{ maxWidth: '400px', width: '90%' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>Edit {currentChat.type === 'channel' ? 'Channel' : 'Group'}</h3>
                <button onClick={() => setShowEditGroup(false)} type="button" disabled={isUpdatingGroup}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent} style={{ padding: '20px', position: 'relative' }}>
                {/* Loading Overlay */}
                {isUpdatingGroup && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '0 0 12px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(2px)',
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      color: 'var(--dash-text)',
                    }}>
                      <Loader2 size={32} className={styles.spinner} style={{ color: 'var(--dash-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Saving changes...</span>
                    </div>
                  </div>
                )}
                {/* Avatar Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px', opacity: isUpdatingGroup ? 0.5 : 1, pointerEvents: isUpdatingGroup ? 'none' : 'auto' }}>
                  <div
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'var(--dash-surface-elevated)',
                      border: '2px solid var(--dash-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: isUpdatingGroup ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => !isUpdatingGroup && document.getElementById('editGroupAvatarInput')?.click()}
                  >
                    {editGroupAvatarPreview ? (
                      <img src={editGroupAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : currentChat.type === 'channel' ? (
                      <Radio size={40} strokeWidth={1.5} style={{ color: 'var(--dash-text-muted)' }} />
                    ) : (
                      <Users size={40} strokeWidth={1.5} style={{ color: 'var(--dash-text-muted)' }} />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0,0,0,0.6)',
                        padding: '4px',
                        textAlign: 'center',
                        fontSize: '11px',
                        color: 'var(--dash-text)',
                      }}
                    >
                      Change
                    </div>
                  </div>
                  <input
                    type="file"
                    id="editGroupAvatarInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleEditGroupAvatarChange}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--dash-text-muted)', marginTop: '8px' }}>Click to change avatar</span>
                </div>

                {/* Name Input */}
                <div style={{ marginBottom: '16px', opacity: isUpdatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '6px' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder={`${currentChat.type === 'channel' ? 'Channel' : 'Group'} name`}
                    disabled={isUpdatingGroup}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: isUpdatingGroup ? 'not-allowed' : 'text',
                    }}
                  />
                </div>

                {/* Description Input */}
                <div style={{ marginBottom: '24px', opacity: isUpdatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    disabled={isUpdatingGroup}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      cursor: isUpdatingGroup ? 'not-allowed' : 'text',
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', opacity: isUpdatingGroup ? 0.5 : 1 }}>
                  <button
                    onClick={() => setShowEditGroup(false)}
                    disabled={isUpdatingGroup}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isUpdatingGroup ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveGroupChanges}
                    disabled={isUpdatingGroup || !editGroupName.trim()}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isUpdatingGroup || !editGroupName.trim() ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingGroup || !editGroupName.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isUpdatingGroup ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Sub-Modal */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddMember(false)}
          >
            <motion.div
              className={styles.subModal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>Add Member</h3>
                <button onClick={() => setShowAddMember(false)} type="button">
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalSearch}>
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search users to add..."
                  value={addMemberQuery}
                  onChange={(e) => handleSearchMembersToAdd(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.subModalContent}>
                {isSearchingMembers && (
                  <div className={styles.subModalLoading}>
                    <Loader2 size={20} className={styles.spinner} />
                    <span>Searching...</span>
                  </div>
                )}
                {!isSearchingMembers && addMemberQuery && addMemberResults.length === 0 && (
                  <div className={styles.subModalEmpty}>No users found</div>
                )}
                {addMemberResults.map((user) => (
                  <div key={user.id} className={styles.subModalItem}>
                    <div className={styles.subModalItemAvatar}>
                      {user.avatar ? (
                        <img src={fixMinioUrl(user.avatar)} alt={user.username} />
                      ) : (
                        <span>{getInitials(user.username)}</span>
                      )}
                    </div>
                    <div className={styles.subModalItemInfo}>
                      <span className={styles.subModalItemName}>{user.username}</span>
                    </div>
                    <button
                      className={styles.subModalItemBtn}
                      onClick={() => handleAddMemberToGroup(user.id)}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Banned Users Sub-Modal */}
      <AnimatePresence>
        {showBannedUsers && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBannedUsers(false)}
          >
            <motion.div
              className={styles.subModal}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>
                  <Ban size={18} />
                  Banned Users
                </h3>
                <button onClick={() => setShowBannedUsers(false)} type="button">
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent}>
                {isLoadingBannedUsers && (
                  <div className={styles.subModalLoading}>
                    <Loader2 size={20} className={styles.spinner} />
                    <span>Loading...</span>
                  </div>
                )}
                {!isLoadingBannedUsers && bannedUsers.length === 0 && (
                  <div className={styles.subModalEmpty}>No banned users</div>
                )}
                {bannedUsers.map((user) => (
                  <div key={user.userId} className={styles.subModalItem}>
                    <div className={styles.subModalItemAvatar}>
                      {user.avatarUrl ? (
                        <img src={fixMinioUrl(user.avatarUrl)} alt={user.username} />
                      ) : (
                        <span>{getInitials(user.username)}</span>
                      )}
                    </div>
                    <div className={styles.subModalItemInfo}>
                      <span className={styles.subModalItemName}>{user.username}</span>
                      <span className={styles.subModalItemMeta}>
                        Banned {new Date(user.bannedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className={`${styles.subModalItemBtn} ${styles.unban}`}
                      onClick={() => handleUnbanMember(user.userId, user.username)}
                      type="button"
                    >
                      Unban
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Modal */}
      {currentChat && selectedMemberForPermissions && (
        <PermissionModal
          isOpen={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedMemberForPermissions(null);
          }}
          chatId={currentChat.id}
          member={selectedMemberForPermissions}
          onPermissionsChanged={async () => {
            // Reload group profile to reflect changes
            if (currentChat) {
              await loadGroupProfile(currentChat.id);
            }
          }}
        />
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!isCreatingGroup) { setShowCreateGroup(false); resetCreateGroupForm(); } }}
          >
            <motion.div
              className={styles.subModal}
              style={{ maxWidth: '420px', width: '90%' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>Create Group</h3>
                <button onClick={() => { if (!isCreatingGroup) { setShowCreateGroup(false); resetCreateGroupForm(); } }} type="button" disabled={isCreatingGroup}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent} style={{ padding: '20px', position: 'relative' }}>
                {isCreatingGroup && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '0 0 12px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(2px)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--dash-text)' }}>
                      <Loader2 size={32} className={styles.spinner} style={{ color: 'var(--dash-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Creating group...</span>
                    </div>
                  </div>
                )}
                {/* Avatar Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'var(--dash-surface-elevated)',
                      border: '2px solid var(--dash-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: isCreatingGroup ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => !isCreatingGroup && document.getElementById('createGroupAvatarInput')?.click()}
                  >
                    {createGroupAvatarPreview ? (
                      <img src={createGroupAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Users size={32} strokeWidth={1.5} style={{ color: 'var(--dash-text-muted)' }} />
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.6)',
                      padding: '3px',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: 'var(--dash-text)',
                    }}>
                      Add Photo
                    </div>
                  </div>
                  <input
                    type="file"
                    id="createGroupAvatarInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleCreateGroupAvatarChange}
                  />
                </div>

                {/* Name Input */}
                <div style={{ marginBottom: '14px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '4px' }}>
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={createGroupName}
                    onChange={(e) => setCreateGroupName(e.target.value)}
                    placeholder="Enter group name"
                    disabled={isCreatingGroup}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Description Input */}
                <div style={{ marginBottom: '14px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '4px' }}>
                    Description
                  </label>
                  <textarea
                    value={createGroupDescription}
                    onChange={(e) => setCreateGroupDescription(e.target.value)}
                    placeholder="Add a description (optional)"
                    rows={2}
                    disabled={isCreatingGroup}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Privacy Toggle */}
                <div style={{ marginBottom: '20px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '8px' }}>
                    Privacy
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCreateGroupPrivacy('public')}
                      disabled={isCreatingGroup}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: createGroupPrivacy === 'public' ? 'var(--dash-primary)' : 'var(--dash-surface)',
                        border: `1px solid ${createGroupPrivacy === 'public' ? 'var(--dash-primary)' : 'var(--dash-border)'}`,
                        borderRadius: '8px',
                        color: createGroupPrivacy === 'public' ? '#fff' : 'var(--dash-text)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateGroupPrivacy('private')}
                      disabled={isCreatingGroup}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: createGroupPrivacy === 'private' ? 'var(--dash-primary)' : 'var(--dash-surface)',
                        border: `1px solid ${createGroupPrivacy === 'private' ? 'var(--dash-primary)' : 'var(--dash-border)'}`,
                        borderRadius: '8px',
                        color: createGroupPrivacy === 'private' ? '#fff' : 'var(--dash-text)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Private
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setShowCreateGroup(false); resetCreateGroupForm(); }}
                    disabled={isCreatingGroup}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={isCreatingGroup || !createGroupName.trim()}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isCreatingGroup || !createGroupName.trim() ? 'not-allowed' : 'pointer',
                      opacity: isCreatingGroup || !createGroupName.trim() ? 0.6 : 1,
                    }}
                  >
                    Create Group
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Channel Modal */}
      <AnimatePresence>
        {showCreateChannel && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!isCreatingGroup) { setShowCreateChannel(false); resetCreateGroupForm(); } }}
          >
            <motion.div
              className={styles.subModal}
              style={{ maxWidth: '420px', width: '90%' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>Create Channel</h3>
                <button onClick={() => { if (!isCreatingGroup) { setShowCreateChannel(false); resetCreateGroupForm(); } }} type="button" disabled={isCreatingGroup}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent} style={{ padding: '20px', position: 'relative' }}>
                {isCreatingGroup && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '0 0 12px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(2px)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--dash-text)' }}>
                      <Loader2 size={32} className={styles.spinner} style={{ color: 'var(--dash-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Creating channel...</span>
                    </div>
                  </div>
                )}
                {/* Avatar Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'var(--dash-surface-elevated)',
                      border: '2px solid var(--dash-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: isCreatingGroup ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => !isCreatingGroup && document.getElementById('createChannelAvatarInput')?.click()}
                  >
                    {createGroupAvatarPreview ? (
                      <img src={createGroupAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Radio size={32} strokeWidth={1.5} style={{ color: 'var(--dash-text-muted)' }} />
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.6)',
                      padding: '3px',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: 'var(--dash-text)',
                    }}>
                      Add Photo
                    </div>
                  </div>
                  <input
                    type="file"
                    id="createChannelAvatarInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleCreateGroupAvatarChange}
                  />
                </div>

                {/* Name Input */}
                <div style={{ marginBottom: '14px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '4px' }}>
                    Channel Name *
                  </label>
                  <input
                    type="text"
                    value={createGroupName}
                    onChange={(e) => setCreateGroupName(e.target.value)}
                    placeholder="Enter channel name"
                    disabled={isCreatingGroup}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Description Input */}
                <div style={{ marginBottom: '14px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '4px' }}>
                    Description
                  </label>
                  <textarea
                    value={createGroupDescription}
                    onChange={(e) => setCreateGroupDescription(e.target.value)}
                    placeholder="Add a description (optional)"
                    rows={2}
                    disabled={isCreatingGroup}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Privacy Toggle */}
                <div style={{ marginBottom: '20px', opacity: isCreatingGroup ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '8px' }}>
                    Privacy
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCreateGroupPrivacy('public')}
                      disabled={isCreatingGroup}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: createGroupPrivacy === 'public' ? 'var(--dash-primary)' : 'var(--dash-surface)',
                        border: `1px solid ${createGroupPrivacy === 'public' ? 'var(--dash-primary)' : 'var(--dash-border)'}`,
                        borderRadius: '8px',
                        color: createGroupPrivacy === 'public' ? '#fff' : 'var(--dash-text)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateGroupPrivacy('private')}
                      disabled={isCreatingGroup}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: createGroupPrivacy === 'private' ? 'var(--dash-primary)' : 'var(--dash-surface)',
                        border: `1px solid ${createGroupPrivacy === 'private' ? 'var(--dash-primary)' : 'var(--dash-border)'}`,
                        borderRadius: '8px',
                        color: createGroupPrivacy === 'private' ? '#fff' : 'var(--dash-text)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Private
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setShowCreateChannel(false); resetCreateGroupForm(); }}
                    disabled={isCreatingGroup}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateChannel}
                    disabled={isCreatingGroup || !createGroupName.trim()}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isCreatingGroup || !createGroupName.trim() ? 'not-allowed' : 'pointer',
                      opacity: isCreatingGroup || !createGroupName.trim() ? 0.6 : 1,
                    }}
                  >
                    Create Channel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Profile Modal */}
      <AnimatePresence>
        {showEditUserProfile && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!isUpdatingProfile) setShowEditUserProfile(false); }}
          >
            <motion.div
              className={styles.subModal}
              style={{ maxWidth: '420px', width: '90%' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>Edit Profile</h3>
                <button onClick={() => { if (!isUpdatingProfile) setShowEditUserProfile(false); }} type="button" disabled={isUpdatingProfile}>
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent} style={{ padding: '20px', position: 'relative' }}>
                {isUpdatingProfile && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '0 0 12px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    backdropFilter: 'blur(2px)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--dash-text)' }}>
                      <Loader2 size={32} className={styles.spinner} style={{ color: 'var(--dash-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Saving profile...</span>
                    </div>
                  </div>
                )}
                {/* Avatar Upload */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', opacity: isUpdatingProfile ? 0.5 : 1 }}>
                  <div
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      background: 'var(--dash-surface-elevated)',
                      border: '2px solid var(--dash-border-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: isUpdatingProfile ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => !isUpdatingProfile && document.getElementById('editProfileAvatarInput')?.click()}
                  >
                    {editUserAvatarPreview ? (
                      <img src={editUserAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <UserIcon size={36} strokeWidth={1.5} style={{ color: 'var(--dash-text-muted)' }} />
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(0,0,0,0.6)',
                      padding: '3px',
                      textAlign: 'center',
                      fontSize: '10px',
                      color: 'var(--dash-text)',
                    }}>
                      Change Photo
                    </div>
                  </div>
                  <input
                    type="file"
                    id="editProfileAvatarInput"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleEditProfileAvatarChange}
                  />
                </div>

                {/* Username Input */}
                <div style={{ marginBottom: '14px', opacity: isUpdatingProfile ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '4px' }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    placeholder="Enter username"
                    disabled={isUpdatingProfile}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Bio Input */}
                <div style={{ marginBottom: '20px', opacity: isUpdatingProfile ? 0.5 : 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--dash-text-secondary)', marginBottom: '4px' }}>
                    Bio
                  </label>
                  <textarea
                    value={editUserBio}
                    onChange={(e) => setEditUserBio(e.target.value)}
                    placeholder="Tell us about yourself (optional)"
                    rows={3}
                    disabled={isUpdatingProfile}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowEditUserProfile(false)}
                    disabled={isUpdatingProfile}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-surface)',
                      border: '1px solid var(--dash-border)',
                      borderRadius: '8px',
                      color: 'var(--dash-text)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfileChanges}
                    disabled={isUpdatingProfile || !editUserUsername.trim()}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: 'var(--dash-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: isUpdatingProfile || !editUserUsername.trim() ? 'not-allowed' : 'pointer',
                      opacity: isUpdatingProfile || !editUserUsername.trim() ? 0.6 : 1,
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            className={styles.modalBackdrop}
            style={{ zIndex: 1100 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              className={styles.subModal}
              style={{ maxWidth: '400px', width: '90%' }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.subModalHeader}>
                <h3>Notifications</h3>
                <button onClick={() => setShowNotifications(false)} type="button">
                  <X size={18} />
                </button>
              </div>
              <div className={styles.subModalContent} style={{ padding: '24px', textAlign: 'center' }}>
                <Bell size={48} style={{ color: 'var(--dash-primary)', marginBottom: '16px' }} />
                <p style={{ color: 'var(--dash-text-secondary)', fontSize: '14px' }}>
                  No new notifications
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel - Using existing component */}
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        isDarkMode={isDarkMode}
      />

      {/* Blocked Users Modal - Using existing component */}
      <BlockedUsersModal
        isOpen={showBlockedUsersModal}
        onClose={() => setShowBlockedUsersModal(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
