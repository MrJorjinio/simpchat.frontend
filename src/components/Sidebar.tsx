import React, { useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import type { Chat, User } from '../types/api.types';
import { Avatar } from './common/Avatar';
import styles from './Dashboard.module.css';

// UTILITY FUNCTIONS
const formatTime = (dateString: string | undefined): string => {
  if (!dateString) {
    return 'Unknown';
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid date';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting time:', error, dateString);
    return 'Invalid date';
  }
};

interface LastMessageDisplay {
  preview: string;
  isReply: boolean;
  hasMention: boolean;
  hasAttachment: boolean;
  isOwnMessage: boolean;
  isSeen: boolean;
}

const getLastMessageDisplay = (chat: Chat, currentUserId?: string): LastMessageDisplay => {
  if (!chat.lastMessage) {
    return { preview: 'No messages yet', isReply: false, hasMention: false, hasAttachment: false, isOwnMessage: false, isSeen: false };
  }

  const lastMsg = chat.lastMessage as any; // Cast to access all fields
  const content = lastMsg.content || '';

  // Check replyId from backend
  const isReply = !!lastMsg.replyId;

  // Check fileUrl from backend
  const hasAttachment = !!lastMsg.fileUrl;

  // Check if this is own message using senderId
  const isOwnMessage = currentUserId ? lastMsg.senderId === currentUserId : false;

  // Check if message is seen (use actual isSeen field from the message)
  const isSeen = lastMsg.isSeen === true;

  // Check for @mentions (matches @username pattern)
  const hasMention = currentUserId ? /@\w+/.test(content) : false;

  let displayContent = content;

  // If there's an attachment but no content, show attachment indicator
  if (!content && hasAttachment) {
    displayContent = '📎 Attachment';
  }

  // For groups and channels, show sender name (use senderUsername from backend)
  if (chat.type !== 'dm' && lastMsg.senderUsername) {
    const senderName = lastMsg.senderUsername || 'Unknown';
    const preview = `${senderName}: ${displayContent}`;
    return {
      preview: preview.length > 40 ? preview.substring(0, 37) + '...' : preview,
      isReply,
      hasMention,
      hasAttachment,
      isOwnMessage,
      isSeen,
    };
  }

  return {
    preview: displayContent.length > 40 ? displayContent.substring(0, 37) + '...' : displayContent,
    isReply,
    hasMention,
    hasAttachment,
    isOwnMessage,
    isSeen,
  };
};

// SIDEBAR COMPONENT
export interface SidebarProps {
  chats: Chat[];
  currentChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  isLoadingChats: boolean;
  user: User | null;
  onLogout: () => void;
  onMenuOpen: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Array<{ id: string; name: string; type: 'user' | 'group' | 'channel'; avatar?: string }>;
  onSelectSearchResult: (result: any) => void;
  isSearching: boolean;
  isDarkMode: boolean;
  onClearSearch: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onlineUsers?: Map<string, boolean>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  currentChat,
  onSelectChat,
  isLoadingChats,
  user,
  onLogout,
  onMenuOpen,
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
  isSearching,
  isDarkMode,
  onClearSearch,
  isMobileOpen = false,
  onMobileClose,
  onlineUsers,
}) => {
  // Helper to check if the other user in a DM is online
  const isDmUserOnline = (chat: Chat): boolean => {
    if (chat.type !== 'dm') return false;

    // First check the real-time onlineUsers map
    if (onlineUsers && chat.members) {
      const otherMember = chat.members.find(m => m.userId !== user?.id);
      if (otherMember?.userId && onlineUsers.has(otherMember.userId)) {
        return onlineUsers.get(otherMember.userId) || false;
      }
    }

    // Fallback to chat.isOnline from initial load
    return chat.isOnline || false;
  };
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        onClearSearch();
      }
    };

    if (searchQuery) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchQuery, onClearSearch]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={onMobileClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            display: 'none',
          }}
        />
      )}
      <div className={`${styles.leftPanel} ${isDarkMode ? styles.darkMode : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        {/* Header */}
        <div className={styles.panelHeader}>
        <button
          className={styles.menuButton}
          onClick={onMenuOpen}
          title="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isDarkMode ? '#94a3b8' : '#64748b',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            e.currentTarget.style.color = isDarkMode ? '#f1f5f9' : '#1e293b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = isDarkMode ? '#94a3b8' : '#64748b';
          }}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar} ref={searchBarRef}>
        <input
          type="text"
          placeholder="Search chats, users..."
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <div
            className={`${styles.searchResults} ${isDarkMode ? styles.darkMode : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {isSearching && <div className={styles.searchLoading}>Searching...</div>}
            {!isSearching && searchResults.length === 0 && (
              <div className={styles.searchNoResults}>No results found</div>
            )}
            {searchResults.map((result) => (
              <div
                key={result.id}
                className={styles.searchResultItem}
                onClick={() => {
                  onSelectSearchResult(result);
                  onClearSearch();
                }}
              >
                <div className={styles.searchResultAvatar}>
                  <Avatar src={result.avatar} name={result.name} fallbackClass={styles.avatarFallback} />
                </div>
                <div className={styles.searchResultInfo}>
                  <div className={styles.searchResultName}>
                    {result.name}
                    <span className={styles.searchResultTypeIcon} title={result.type}>
                      {result.type === 'user' ? ' 👤' : result.type === 'group' ? ' 👥' : result.type === 'channel' ? ' 📢' : ''}
                    </span>
                  </div>
                  <div className={styles.searchResultType}>
                    {result.type === 'user' ? 'User' : result.type === 'group' ? 'Group' : result.type === 'channel' ? 'Channel' : 'Unknown'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat List */}
      <div className={styles.chatList}>
        {isLoadingChats && <div className={styles.loading}>Loading chats...</div>}
        {!isLoadingChats && chats.length === 0 && (
          <div className={styles.emptyState}>No chats yet. Start a conversation!</div>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`${styles.chatItem} ${currentChat?.id === chat.id ? styles.active : ''}`}
            onClick={() => onSelectChat(chat)}
          >
            {/* Avatar */}
            <div className={styles.chatAvatar}>
              <Avatar src={chat.avatar} name={chat.name} fallbackClass={styles.avatarFallback} />
              {chat.type === 'dm' && isDmUserOnline(chat) && <div className={styles.onlineIndicator} />}
            </div>

            {/* Chat Info */}
            <div className={styles.chatInfo}>
              <div className={styles.chatHeader}>
                <div className={styles.chatNameWithType}>
                  <span className={styles.chatName}>{chat.name}</span>
                  <span className={`${styles.chatTypeIcon} ${styles[`icon${chat.type.charAt(0).toUpperCase() + chat.type.slice(1)}`]}`} title={chat.type}>
                    {chat.type === 'dm' ? '👤' : chat.type === 'group' ? '👥' : chat.type === 'channel' ? '📢' : ''}
                  </span>
                </div>
                <div className={styles.headerRight}>
                  <span className={styles.timestamp}>{formatTime(chat.updatedAt)}</span>
                  {chat.unreadCount > 0 && <span className={styles.unreadBadge}>{chat.unreadCount}</span>}
                </div>
              </div>
              <div className={styles.chatPreview}>
                {(() => {
                  const display = getLastMessageDisplay(chat, user?.id);
                  return (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {/* Sent/Seen checkmark for all messages */}
                      <span
                        style={{
                          fontSize: '10px',
                          color: display.isSeen ? '#51cf66' : 'var(--text-secondary)',
                          fontWeight: 500,
                          flexShrink: 0,
                          opacity: display.isSeen ? 1 : 0.7,
                        }}
                        title={display.isSeen ? 'Seen' : 'Sent'}
                      >
                        {display.isSeen ? '✓✓' : '✓'}
                      </span>
                      {display.isReply && (
                        <span style={{ fontSize: '10px', opacity: 0.8, flexShrink: 0 }} title="Reply">↩️</span>
                      )}
                      {display.hasMention && (
                        <span style={{
                          fontSize: '9px',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          padding: '1px 4px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }} title="Mention">@</span>
                      )}
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}>
                        {display.preview}
                      </span>
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* User Section */}
      {user && (
        <div className={styles.userSection}>
          <div className={styles.userAvatar}>
            <Avatar src={user.avatar} name={user.username} fallbackClass={styles.avatarFallback} />
          </div>
          <div className={styles.userInfo}>
            <div className={styles.username}>{user.username}</div>
          </div>
          <button className={styles.logoutButton} onClick={onLogout} title="Logout">
            ↪
          </button>
        </div>
      )}
    </div>
    </>
  );
};
