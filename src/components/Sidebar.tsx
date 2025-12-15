import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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

const getLastMessagePreview = (chat: Chat): string => {
  if (!chat.lastMessage) return 'No messages yet';
  const content = chat.lastMessage.content || '(No content)';

  // For groups and channels, show sender name
  if (chat.type !== 'dm' && chat.lastMessage.sender) {
    const senderName = chat.lastMessage.sender.username || 'Unknown';
    const preview = `${senderName}: ${content}`;
    return preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
  }

  return content.length > 50 ? content.substring(0, 47) + '...' : content;
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
}) => {
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
              {chat.type === 'dm' && chat.isOnline && <div className={styles.onlineIndicator} />}
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
                <span>{getLastMessagePreview(chat)}</span>
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
