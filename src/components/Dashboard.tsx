import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { chatService } from '../services/chat.service';
import api from '../services/api';
import type { Chat, BackendMessage, User } from '../types/api.types';
import styles from './Dashboard.module.css';
import AdminPanel from './AdminPanel';

// UTILITY FUNCTIONS
const getInitials = (name: string | undefined | null): string => {
  if (!name || name === 'undefined' || name === 'null') {
    return '?';
  }
  const trimmed = String(name).trim();
  if (!trimmed || trimmed.length === 0) {
    return '?';
  }
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return '?';
  }
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || '?';
  }
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
};

// Avatar component with fallback handling
interface AvatarProps {
  src: string | undefined | null;
  name: string;
  fallbackClass?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, fallbackClass }) => {
  const [showFallback, setShowFallback] = React.useState(!src);

  const handleImageError = () => {
    setShowFallback(true);
  };

  if (showFallback || !src) {
    return <div className={fallbackClass}>{getInitials(name)}</div>;
  }

  return <img src={src} alt={name} onError={handleImageError} />;
};

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

// MODAL COMPONENTS

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, privacy: string) => Promise<void>;
  isDarkMode?: boolean;
  isChannel?: boolean;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onCreate, isDarkMode = false, isChannel = false }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name, description, privacy);
      setName('');
      setDescription('');
      setPrivacy('private');
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.modalOverlay} ${isDarkMode ? styles.darkMode : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isChannel ? 'Create Channel' : 'Create Group'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              {isChannel ? 'Channel' : 'Group'} Name *
            </label>
            <input
              type="text"
              placeholder={`Enter ${isChannel ? 'channel' : 'group'} name (1-40 characters)`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className={styles.formInput}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {name.length}/40 characters
            </div>
          </div>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Description (Optional)
            </label>
            <textarea
              placeholder={`Enter ${isChannel ? 'channel' : 'group'} description (max 150 characters)`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={150}
              className={styles.formInput}
              rows={3}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {description.length}/150 characters
            </div>
          </div>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Privacy
            </label>
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={styles.formInput}>
              <option value="private">Private - Only invited members can join</option>
              <option value="public">Public - Anyone can search and join</option>
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.secondaryButton}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={!name.trim() || isCreating} className={styles.primaryButton}>
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (username: string, email: string, description: string, policy: string) => Promise<void>;
  isDarkMode?: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onUpdate, isDarkMode = false }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [policy, setPolicy] = useState<'everyone' | 'chatted' | 'nobody'>('everyone');
  const [isUpdating, setIsUpdating] = useState(false);

  // PROPERLY initialize form when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      // Force update all fields with current user data
      setUsername(user.username || '');
      setEmail(user.email || '');
      setDescription(user.bio || '');
      setPolicy((user.addMePolicy as 'everyone' | 'chatted' | 'nobody') || 'everyone');
    } else if (!isOpen) {
      // Reset form when closing
      setUsername('');
      setEmail('');
      setDescription('');
      setPolicy('everyone');
    }
  }, [isOpen, user]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(username, email, description, policy);
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className={`${styles.modalOverlay} ${isDarkMode ? styles.darkMode : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} key={`profile-modal-${user.id}`}>
        <div className={styles.modalHeader}>
          <h2 style={{ color: 'var(--text)' }}>Edit Profile</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.formInput}
              placeholder="Enter your username"
            />
          </div>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Email
              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '8px' }}>
                (Read-only)
              </span>
            </label>
            <input
              type="email"
              value={email}
              readOnly
              disabled
              className={styles.formInput}
              placeholder="Email cannot be changed"
              style={{
                backgroundColor: 'var(--background)',
                cursor: 'not-allowed',
                opacity: 0.7
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Bio/Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.formInput}
              rows={3}
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>Who can add you?</label>
            <select
              value={policy}
              onChange={(e) => setPolicy(e.target.value as 'everyone' | 'chatted' | 'nobody')}
              className={styles.formInput}
            >
              <option value="everyone">Everyone</option>
              <option value="chatted">Contacts Only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.secondaryButton}>
            Cancel
          </button>
          <button onClick={handleUpdate} disabled={isUpdating} className={styles.primaryButton}>
            {isUpdating ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, isDarkMode = false }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Load notifications when modal opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);
    try {
      const notificationService = await import('../services/notification.service').then(
        (m) => m.notificationService
      );
      const notifs = await notificationService.getNotifications();
      console.log('[Notifications] Loaded notifications:', notifs);
      if (Array.isArray(notifs) && notifs.length > 0) {
        console.log('[Notifications] First notification structure:', JSON.stringify(notifs[0], null, 2));
      }
      // Map normalized notification format to display format
      const mappedNotifs = Array.isArray(notifs) ? notifs.map((n: any) => ({
        id: n.id,
        title: `Message from ${n.senderName}`,
        message: n.content,
        type: 'message',
        chatName: n.chatName,
        chatAvatar: n.chatAvatar,
        senderName: n.senderName,
        fileUrl: n.fileUrl,
        isRead: n.seen,
        createdAt: n.sentTime,
      })) : [];
      setNotifications(mappedNotifs);
    } catch (error) {
      console.error('[Notifications] Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const handleMarkAsSeen = async (notificationId: string) => {
    try {
      const notificationService = await import('../services/notification.service').then(
        (m) => m.notificationService
      );
      await notificationService.markAsSeen(notificationId);
      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as seen:', error);
    }
  };

  const handleMarkAllAsSeen = async () => {
    try {
      const notificationService = await import('../services/notification.service').then(
        (m) => m.notificationService
      );
      await notificationService.markAllAsSeen();
      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as seen:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${styles.modalOverlay} ${isDarkMode ? styles.darkMode : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Notifications</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {isLoadingNotifications ? (
            <div className={styles.loadingState}>Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>No notifications yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllAsSeen}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Mark All as Read
                </button>
              )}
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsSeen(notif.id)}
                  style={{
                    padding: '12px',
                    backgroundColor: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                    borderLeft: notif.isRead ? 'none' : '3px solid var(--accent)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {/* Chat Avatar */}
                  {notif.chatAvatar ? (
                    <img
                      src={notif.chatAvatar}
                      alt={notif.chatName}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(notif.chatName)}
                    </div>
                  )}

                  {/* Notification Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text)' }}>
                      {notif.chatName}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text)' }}>{notif.senderName}:</span>{' '}
                      {notif.message && notif.message.trim() ? (
                        notif.message
                      ) : notif.fileUrl ? (
                        <span style={{ fontStyle: 'italic' }}>Sent an attachment</span>
                      ) : (
                        <span style={{ fontStyle: 'italic', opacity: 0.7 }}>No message content</span>
                      )}
                    </div>
                    {notif.fileUrl && (
                      <div style={{ fontSize: '12px', color: 'var(--accent)', marginBottom: '4px' }}>
                        📎 Attachment
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(notif.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface UserProfileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isLoading: boolean;
  onSendMessage: (userId: string, message?: string) => Promise<void>;
  onJoinGroup?: (chatId: string) => Promise<void>;
  isGroup?: boolean;
  isChannel?: boolean;
  chatId?: string;
  isJoining?: boolean;
  isDarkMode?: boolean;
}

const UserProfileViewer: React.FC<UserProfileViewerProps> = ({
  isOpen,
  onClose,
  user,
  isLoading,
  onSendMessage,
  onJoinGroup,
  isGroup,
  isChannel,
  chatId,
  isJoining,
  isDarkMode,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState('');

  console.log('[UserProfileViewer] Rendering with:', { isOpen, isGroup, isChannel, user: user?.username, messageText, isSending });

  if (!isOpen) return null;

  // Handle field name variations from API
  const getUsername = () => {
    if (!user) return 'Unknown';
    // For groups/channels, use name
    if (isGroup || isChannel) {
      return (user as any)?.name || (user as any)?.displayName || 'Unknown';
    }
    // For users, try multiple field names
    return (user as any)?.username || (user as any)?.displayName || (user as any)?.name || 'Unknown';
  };

  const getAvatar = () => {
    if (!user) return '';
    return (user as any)?.avatarUrl || (user as any)?.avatar || (user as any)?.profileImage || (user as any)?.icon || '';
  };

  const getDescription = () => {
    if (!user) return '';
    return (user as any)?.description || (user as any)?.bio || '';
  };

  const getMemberCount = () => {
    if (!user) return 0;
    return (user as any)?.members?.length || (user as any)?.memberCount || 0;
  };

  const getPrivacy = () => {
    if (!user) return 'Unknown';
    return (user as any)?.isPrivate ? 'Private' : 'Public';
  };

  const handleSendMessage = async () => {
    if (!user) {
      console.error('[ProfileViewer] User object is null/undefined');
      return;
    }

    // Debug: Log the entire user object to understand its structure
    console.log('[ProfileViewer] User object structure:', {
      fullUser: user,
      keys: Object.keys(user),
      id: (user as any).id,
      userId: (user as any).userId,
      entityId: (user as any).entityId,
      email: (user as any).email,
      username: (user as any).username,
      all: JSON.stringify(user),
    });

    // Get the user ID from various possible field names, or use the prop userId as fallback
    let userId = (user as any).id || (user as any).userId || (user as any).entityId;

    // If still no ID found, the Dashboard component should have passed userId prop
    // This is a fallback for safety
    console.log('[ProfileViewer] Extracted userId:', userId);

    if (!userId) {
      console.error('[ProfileViewer] Cannot send message: user ID is missing from user object:', user);
      console.error('[ProfileViewer] All available fields:', Object.keys(user));
      alert('Error: User ID not found. Please try again.');
      return;
    }

    setIsSending(true);
    try {
      console.log('[ProfileViewer] Sending message/creating DM with user ID:', userId, 'Type:', typeof userId);
      // Pass the message text if provided (optional)
      const messageToSend = messageText.trim() ? messageText.trim() : undefined;
      console.log('[ProfileViewer] Message to send:', messageToSend);
      console.log('[ProfileViewer] onSendMessage function:', typeof onSendMessage);
      if (!onSendMessage) {
        throw new Error('onSendMessage callback is not defined');
      }
      await onSendMessage(userId, messageToSend);
      console.log('[ProfileViewer] onSendMessage completed successfully');
      setMessageText('');
      onClose();
    } catch (error) {
      console.error('Failed to send message:', error);
      console.error('[ProfileViewer] Error type:', typeof error);
      console.error('[ProfileViewer] Error message:', error instanceof Error ? error.message : String(error));
      alert('Failed to create conversation. Error: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`${styles.modalOverlay} ${isDarkMode ? styles.darkMode : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isGroup || isChannel ? 'Join' : 'Profile'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          {isLoading ? (
            <div className={styles.loading}>Loading...</div>
          ) : user ? (
            <div className={styles.profileContent}>
              <div className={styles.avatarSection}>
                <div className={styles.largeAvatar}>
                  <Avatar src={getAvatar()} name={getUsername()} fallbackClass={styles.avatarFallback} />
                </div>
              </div>
              <div className={styles.profileInfo}>
                <div className={styles.profileField}>
                  <label>{isGroup || isChannel ? 'Name' : 'Username/Name'}</label>
                  <p>{getUsername()}</p>
                </div>
                {!isGroup && !isChannel && user.email && (
                  <div className={styles.profileField}>
                    <label>Email</label>
                    <p>{user.email}</p>
                  </div>
                )}
                {getDescription() && (
                  <div className={styles.profileField}>
                    <label>{isGroup || isChannel ? 'Description' : 'Bio/Description'}</label>
                    <p>{getDescription()}</p>
                  </div>
                )}
                {(isGroup || isChannel) && getMemberCount() > 0 && (
                  <div className={styles.profileField}>
                    <label>Members</label>
                    <p>{getMemberCount()}</p>
                  </div>
                )}
                {(isGroup || isChannel) && (
                  <div className={styles.profileField}>
                    <label>Privacy</label>
                    <p>{getPrivacy()}</p>
                  </div>
                )}
                {!isGroup && !isChannel && (
                  <>
                    <div className={styles.profileField}>
                      <label>Status</label>
                      <p>{user.onlineStatus || 'Offline'}</p>
                    </div>
                    {(user as any)?.lastSeen && (
                      <div className={styles.profileField}>
                        <label>Last Seen</label>
                        <p>{new Date((user as any).lastSeen).toLocaleString()}</p>
                      </div>
                    )}
                    {(user as any)?.addMePolicy && (
                      <div className={styles.profileField}>
                        <label>Add Policy</label>
                        <p style={{ textTransform: 'capitalize' }}>{(user as any).addMePolicy}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>User not found</div>
          )}
        </div>
        {user && !isGroup && !isChannel && (() => {
          console.log('[UserProfileViewer] Rendering message input for user:', user?.username);
          return (
          <div className={styles.modalBody} style={{ padding: '16px', borderTop: '1px solid var(--light-border)' }}>
            <input
              type="text"
              placeholder="Type a message... (optional)"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              className={styles.inputField}
              style={{ marginBottom: '0' }}
            />
          </div>
        );
        })()}
        {user && (
          <div className={styles.modalFooter}>
            {isGroup || isChannel ? (
              <>
                <button onClick={onClose} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (onJoinGroup && chatId) {
                      try {
                        console.log('[Modal] Join button clicked for:', chatId);
                        await onJoinGroup(chatId);
                        console.log('[Modal] Join successful');
                      } catch (error) {
                        console.error('[Modal] Join error:', error);
                        alert('Error joining. Please try again.');
                      }
                    } else {
                      console.warn('[Modal] Missing onJoinGroup or chatId:', { onJoinGroup: !!onJoinGroup, chatId });
                      alert('Unable to join. Missing required information.');
                    }
                  }}
                  disabled={isJoining}
                  className={styles.primaryButton}
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </>
            ) : (() => {
              console.log('[UserProfileViewer] Rendering Send button with isSending:', isSending);
              return (
              <>
                <button onClick={onClose} className={styles.secondaryButton}>
                  Close
                </button>
                <button
                  onClick={async () => {
                    try {
                      console.log('[Modal] Send message button clicked with messageText:', messageText);
                      await handleSendMessage();
                      console.log('[Modal] Message send successful');
                    } catch (error) {
                      console.error('[Modal] Send message error:', error);
                    }
                  }}
                  disabled={isSending}
                  className={styles.primaryButton}
                >
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

// MAIN COMPONENTS

interface LeftPanelProps {
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

const LeftPanel: React.FC<LeftPanelProps> = ({
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
        <h1 className={styles.title}>Chats</h1>
        <button className={styles.menuButton} onClick={onMenuOpen} title="Menu">
          ⋮
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
            <div className={styles.userStatus}>{user.onlineStatus}</div>
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

interface MainContentProps {
  currentChat: Chat | null;
  messages: BackendMessage[];
  isLoadingMessages: boolean;
  onSendMessage: (content: string, file?: File) => Promise<void>;
  onOpenGroupCreate: () => void;
  onOpenChannelCreate: () => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenMobileSidebar?: () => void;
}

// Add Member Modal
interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatType: ChatType;
  onMemberAdded: () => Promise<void>;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
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
      alert(`${username} has been added to the chat.`);
      await onMemberAdded();
      onClose();
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member. You may not have permission.');
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
          <button className={styles.closeButton} onClick={onClose}>
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
interface PermissionModalProps {
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

const PermissionModal: React.FC<PermissionModalProps> = ({
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
      alert('Failed to update permission. You may not have the required privileges.');
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
          <button className={styles.closeButton} onClick={onClose}>
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

const MainContent: React.FC<MainContentProps> = ({
  currentChat,
  messages,
  isLoadingMessages,
  onSendMessage,
  onOpenGroupCreate,
  onOpenChannelCreate,
  onOpenUserProfile,
  onOpenMobileSidebar,
}) => {
  const [messageText, setMessageText] = useState('');
  const [isSending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<BackendMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle scroll to detect if user is at bottom and mark notifications as seen
  const handleScroll = async () => {
    const container = messagesContainerRef.current;
    if (!container) {
      console.log('[MainContent] Container ref is null');
      return;
    }

    // Check if scrolled to bottom (within 100px)
    const scrollHeight = container.scrollHeight;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    console.log('[MainContent] SCROLL EVENT:', {
      scrollHeight,
      scrollTop,
      clientHeight,
      distance: scrollHeight - scrollTop - clientHeight,
      isNearBottom,
    });

    setShowScrollButton(!isNearBottom);

    // If at bottom, mark visible message notifications as seen
    if (isNearBottom && currentChat && messages.length > 0) {
      try {
        console.log('[MainContent] ========== USER AT BOTTOM ==========');
        console.log('[MainContent] Chat ID:', currentChat.id);
        console.log('[MainContent] Chat:', currentChat);
        console.log('[MainContent] Total messages:', messages.length);
        console.log('[MainContent] Raw messages array:', messages);
        if (messages.length > 0) {
          console.log('[MainContent] First message full object:', messages[0]);
          console.log('[MainContent] First message keys:', Object.keys(messages[0]));
        }

        // Collect notification IDs from visible messages that are not seen by current user
        const notificationIdsToMark: string[] = [];
        let processedCount = 0;
        let skippedCount = 0;

        messages.forEach((msg: any, index: number) => {
          // Log first 3 messages for debugging
          if (index < 3) {
            console.log(`[MainContent] Message ${index}:`, {
              messageId: msg.messageId || msg.id,
              notificationId: msg.notificationId,
              isCurrentUser: msg.isCurrentUser,
              isNotificated: msg.isNotificated,
              senderUsername: msg.senderUsername,
              hasNotifId: !!msg.notificationId,
            });
          }

          // Only mark notifications for messages that:
          // 1. Are not from current user (isCurrentUser = false)
          // 2. Have unseen notification (isNotificated = true)
          // 3. Have a valid notification ID (not empty/null)
          if (!msg.isCurrentUser && msg.isNotificated && msg.notificationId) {
            notificationIdsToMark.push(msg.notificationId);
            processedCount++;
          } else {
            skippedCount++;
          }
        });

        console.log('[MainContent] Processing summary:', {
          processedCount,
          skippedCount,
          totalToMark: notificationIdsToMark.length,
          notificationIds: notificationIdsToMark,
        });

        if (notificationIdsToMark.length > 0) {
          const notificationService = await import('../services/notification.service').then(
            (m) => m.notificationService
          );

          console.log('[MainContent] Calling markMultipleAsSeen with IDs:', notificationIdsToMark);

          try {
            const markResult = await notificationService.markMultipleAsSeen(notificationIdsToMark);
            console.log(
              '[MainContent] Successfully marked',
              notificationIdsToMark.length,
              'message notifications as seen. Result:',
              markResult
            );
          } catch (error) {
            console.error('[MainContent] Failed to mark notifications as seen:', error);
          }
        } else {
          console.log('[MainContent] No unseen messages found to mark as seen');
          console.log('[MainContent] Reasons - isCurrentUser or isNotificated false, or notificationId empty');
        }
        console.log('[MainContent] ========== END BOTTOM HANDLER ==========');
      } catch (error) {
        console.error('[MainContent] Error processing scroll:', error);
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
    setShowScrollButton(false);
  }, [messages, currentChat]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentChat) return;

    setSending(true);
    try {
      // If replying, we would add replyId to the FormData here
      // For now, just send the message normally
      await onSendMessage(messageText);
      setMessageText('');
      setReplyToMessage(null);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const messageService = await import('../services/message.service').then((m) => m.messageService);
      await messageService.addReaction(messageId, emoji);
      setShowReactionPicker(null);
      // Reload messages
      const chatStore = useChatStore.getState();
      if (currentChat) {
        await chatStore.loadMessages(currentChat.id);
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      const messageService = await import('../services/message.service').then((m) => m.messageService);
      await messageService.removeReaction(messageId, emoji);
      // Reload messages
      const chatStore = useChatStore.getState();
      if (currentChat) {
        await chatStore.loadMessages(currentChat.id);
      }
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string, isOwnMessage: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOwnMessage) {
      setContextMenu({ messageId, x: e.clientX, y: e.clientY });
    }
  };

  const handleShowReactionPicker = (e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    setShowReactionPicker({ messageId, x: e.clientX, y: e.clientY });
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
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        const messageService = await import('../services/message.service').then((m) => m.messageService);
        await messageService.deleteMessage(messageId);
        setContextMenu(null);
        // Reload messages
        const chatStore = useChatStore.getState();
        if (currentChat) {
          await chatStore.loadMessages(currentChat.id);
        }
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  // Close context menu and reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setShowReactionPicker(null);
      }
    };
    if (contextMenu || showReactionPicker) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu, showReactionPicker]);

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
                currentChat.isOnline ? (
                  <span className={styles.online}>● Online</span>
                ) : (
                  <span>Last seen at 2:30 PM</span>
                )
              ) : (
                <span>{currentChat.members?.length || 0} members</span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {/* Removed unnecessary buttons - using simpler header */}
        </div>
      </div>

      {/* Messages Container */}
      <div
        className={styles.messagesContainer}
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {isLoadingMessages && <div className={styles.loading}>Loading messages...</div>}
        {!isLoadingMessages && messages.length === 0 && (
          <div className={styles.noMessages}>No messages yet. Start the conversation!</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.messageId}
            className={`${styles.messageGroup} ${msg.isCurrentUser ? styles.ownMessage : styles.otherMessage}`}
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
                {msg.replyId && (
                  <div
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderLeft: '3px solid var(--accent)',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ↩️ Reply to message
                  </div>
                )}
                <div className={styles.messageContent}>{msg.content}</div>
                {msg.fileUrl && (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.attachment}>
                    📎 File
                  </a>
                )}
                {msg.messageReactions && msg.messageReactions.length > 0 && (
                  <div className={styles.reactionsContainer} style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {msg.messageReactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRemoveReaction(msg.messageId, reaction.emoji)}
                        title={`${reaction.userName} reacted with ${reaction.emoji}`}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div className={styles.messageTime}>{formatTime(msg.sentAt)}</div>
                  <button
                    onClick={(e) => handleShowReactionPicker(e, msg.messageId)}
                    title="Add reaction"
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
                    😊+
                  </button>
                  {!msg.isCurrentUser && (
                    <button
                      onClick={() => setReplyToMessage(msg)}
                      title="Reply"
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
                      ↩️
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* Reaction Picker */}
            {showReactionPicker?.messageId === msg.messageId && (
              <div
                ref={reactionPickerRef}
                style={{
                  position: 'fixed',
                  top: `${showReactionPicker.y}px`,
                  left: `${showReactionPicker.x}px`,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  padding: '8px',
                  display: 'flex',
                  gap: '4px',
                }}
              >
                {['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleAddReaction(msg.messageId, emoji)}
                    style={{
                      padding: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '20px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--background)';
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {/* Context Menu */}
            {contextMenu?.messageId === msg.messageId && msg.isCurrentUser && (
              <div
                ref={contextMenuRef}
                style={{
                  position: 'fixed',
                  top: `${contextMenu.y}px`,
                  left: `${contextMenu.x}px`,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  minWidth: '160px',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => handleEditMessage(msg.messageId)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s ease',
                    borderBottom: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteMessage(msg.messageId)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#d32f2f',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🗑️ Delete
                </button>
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
            bottom: '100px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
            transition: 'all 0.2s ease',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
          }}
        >
          ↓
        </button>
      )}

      {/* Message Input */}
      <div className={styles.messageInput}>
        {replyToMessage && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              padding: '8px 12px',
              backgroundColor: 'var(--background)',
              borderTop: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <div>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Replying to {replyToMessage.senderUsername}:
              </span>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {replyToMessage.content.substring(0, 50)}
                {replyToMessage.content.length > 50 ? '...' : ''}
              </span>
            </div>
            <button
              onClick={() => setReplyToMessage(null)}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
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
        <button className={styles.emojiButton} title="Emoji">
          😊
        </button>
        <button className={styles.attachButton} title="Attach file">
          📎
        </button>
        <button
          onClick={handleSendMessage}
          disabled={!messageText.trim() || isSending}
          className={styles.sendButton}
        >
          {isSending ? '...' : '→'}
        </button>
      </div>
    </div>
  );
};

interface RightPanelProps {
  currentChat: Chat | null;
  onReloadChat: () => Promise<void>;
  onViewUserProfile: (userId: string) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ currentChat, onReloadChat, onViewUserProfile }) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ChatMember | null>(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [chatProfile, setChatProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { user: currentUser } = useAuthStore();

  // Fetch chat profile to get full member/participant data
  useEffect(() => {
    const fetchChatProfile = async () => {
      if (!currentChat?.id) return;

      setIsLoadingProfile(true);
      try {
        const profile = await chatService.getChatProfile(currentChat.id);
        console.log('[RightPanel] Chat profile loaded:', profile);
        setChatProfile(profile);
      } catch (error) {
        console.error('[RightPanel] Failed to load chat profile:', error);
        setChatProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchChatProfile();
  }, [currentChat?.id]);

  if (!currentChat) {
    return <div className={styles.rightPanel} />;
  }

  // For DMs, get the other user (not current user)
  const otherUser = currentChat.type === 'dm' && chatProfile?.participants
    ? chatProfile.participants.find((p: any) => p.id !== currentUser?.id)
    : null;

  const handleBanMember = async (member: ChatMember) => {
    if (!confirm(`Ban "${member.user.username}" from this chat?`)) return;

    try {
      await chatService.banUser(currentChat.id, member.userId);
      alert(`${member.user.username} has been banned.`);
      await onReloadChat();
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user. You may not have permission.');
    }
  };

  const handleTogglePrivacy = async () => {
    const newPrivacy = currentChat.privacy === 'public' ? 'private' : 'public';
    if (!confirm(`Change chat privacy to ${newPrivacy}?`)) return;

    setIsTogglingPrivacy(true);
    try {
      await chatService.updateChatPrivacy(currentChat.id, newPrivacy);
      alert(`Chat privacy changed to ${newPrivacy}.`);
      await onReloadChat();
    } catch (error) {
      console.error('Failed to update privacy:', error);
      alert('Failed to update privacy. You may not have permission.');
    } finally {
      setIsTogglingPrivacy(false);
    }
  };

  return (
    <div className={styles.rightPanel}>
      <div className={styles.panelHeader}>
        <h3>Chat Info</h3>
      </div>
      <div className={styles.infoContent}>
        {currentChat.type === 'dm' ? (
          <>
            <div className={styles.infoSection}>
              <div className={styles.infoLabel} style={{ color: 'var(--text)', marginBottom: '12px', fontWeight: 600 }}>Member</div>

              {isLoadingProfile ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading profile...
                </div>
              ) : otherUser ? (
                <div
                  onClick={() => onViewUserProfile(otherUser.id)}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--background)',
                    border: '2px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title="Click to view full profile"
                >
                  <div className={styles.memberAvatar}>
                    {otherUser.avatarUrl ? (
                      <img
                        src={otherUser.avatarUrl}
                        alt={otherUser.username}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className={styles.avatarFallback}
                        style={{
                          width: '50px',
                          height: '50px',
                          fontSize: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          borderRadius: '50%',
                          fontWeight: 600
                        }}
                      >
                        {getInitials(otherUser.username)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                      {otherUser.username}
                    </div>
                    {otherUser.description && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
                        {otherUser.description}
                      </div>
                    )}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                      {otherUser.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                      👤 Tap to view profile
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No user information available
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Chat Name & Description */}
            {(chatProfile?.name || chatProfile?.description) && (
              <div className={styles.infoSection}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)', marginBottom: '8px', fontWeight: 600 }}>
                  {currentChat.type === 'group' ? 'Group' : 'Channel'} Info
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                    {chatProfile.name || currentChat.name}
                  </div>
                  {chatProfile.description && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      {chatProfile.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      👥 {chatProfile.participantsCount || 0} members
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      🟢 {chatProfile.participantsOnline || 0} online
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Toggle */}
            <div className={styles.infoSection}>
              <div className={styles.infoLabel} style={{ color: 'var(--text)' }}>Privacy</div>
              <button
                onClick={handleTogglePrivacy}
                disabled={isTogglingPrivacy}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  width: '100%',
                  marginTop: '4px',
                }}
              >
                {isTogglingPrivacy ? 'Changing...' : `Current: ${currentChat.privacy || 'private'} (Click to toggle)`}
              </button>
            </div>

            {/* Add Member Button */}
            <div className={styles.infoSection}>
              <button
                onClick={() => setShowAddMemberModal(true)}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                ➕ Add Member
              </button>
            </div>

            {/* Members List with Toggle */}
            <div className={styles.infoSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)' }}>
                  Members ({chatProfile?.participants?.length || currentChat.members?.length || 0})
                </div>
                <button
                  onClick={() => setShowMembersList(!showMembersList)}
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
                  {showMembersList ? '▼ Hide' : '▶ Show'}
                </button>
              </div>
              {showMembersList && (
                <div className={styles.memberList}>
                  {isLoadingProfile ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading members...
                    </div>
                  ) : chatProfile?.participants && chatProfile.participants.length > 0 ? (
                    chatProfile.participants.map((participant: any) => {
                      // Map backend participant structure to frontend member structure
                      const member = {
                        id: participant.id,
                        userId: participant.id,
                        user: {
                          id: participant.id,
                          username: participant.username,
                          avatar: participant.avatarUrl,
                          bio: participant.description,
                        },
                        role: 'member' as const, // Backend doesn't return role from profile endpoint
                      };

                      return (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            marginBottom: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--surface)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--background)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <div
                            className={styles.memberAvatar}
                            style={{ flexShrink: 0, cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUserProfile(member.userId);
                            }}
                            title="View profile"
                          >
                            {member.user.avatar ? (
                              <img src={member.user.avatar} alt={member.user.username} />
                            ) : (
                              <div className={styles.avatarFallback}>{getInitials(member.user.username)}</div>
                            )}
                          </div>
                          <div
                            className={styles.memberInfo}
                            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUserProfile(member.userId);
                            }}
                            title="View profile"
                          >
                            <div className={styles.memberName} style={{ color: 'var(--text)', fontWeight: 600 }}>
                              {member.user.username}
                            </div>
                            {participant.isOnline !== undefined && (
                              <div className={styles.memberRole} style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {participant.isOnline ? '🟢 Online' : '⚫ Offline'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMember(member);
                                setShowPermissionModal(true);
                              }}
                              title="Manage Permissions"
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#6366f1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 600,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
                            >
                              🔐
                            </button>
                            {member.role !== 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBanMember(member);
                                }}
                                title="Ban User"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c82333')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc3545')}
                              >
                                🚫
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No members found
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentChat.description && (
              <div className={styles.infoSection}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)' }}>Description</div>
                <p style={{ color: 'var(--text-secondary)' }}>{currentChat.description}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          chatId={currentChat.id}
          chatType={currentChat.type}
          onMemberAdded={onReloadChat}
        />
      )}

      {/* Permission Management Modal */}
      {showPermissionModal && selectedMember && (
        <PermissionModal
          isOpen={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedMember(null);
          }}
          chatId={currentChat.id}
          member={selectedMember}
          onPermissionsChanged={onReloadChat}
        />
      )}
    </div>
  );
};

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
  onEditProfile: () => void;
  onShowNotifications: () => void;
  onShowAdminPanel: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({
  isOpen,
  onCreateGroup,
  onCreateChannel,
  onEditProfile,
  onShowNotifications,
  onShowAdminPanel,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${styles.menuDropdown} ${isDarkMode ? styles.darkMode : ''}`}>
      <button className={styles.menuItem} onClick={onCreateGroup}>
        ➕ Create Group
      </button>
      <button className={styles.menuItem} onClick={onCreateChannel}>
        📢 Create Channel
      </button>
      <div className={styles.menuDivider} />
      <button className={styles.menuItem} onClick={onEditProfile}>
        👤 Edit Profile
      </button>
      <button className={styles.menuItem} onClick={onShowNotifications}>
        🔔 Notifications
      </button>
      <button className={styles.menuItem} onClick={onShowAdminPanel}>
        🔐 Admin Panel
      </button>
      <button className={styles.menuItem} onClick={onToggleDarkMode}>
        {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
      <div className={styles.menuDivider} />
      <button className={styles.menuItem} onClick={onLogout}>
        🚪 Logout
      </button>
    </div>
  );
};

// MAIN DASHBOARD COMPONENT

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { chats, currentChat, isLoadingChats } = useChatStore();
  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; type: 'user' | 'group' | 'channel'; avatar?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserProfileViewer, setShowUserProfileViewer] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<any>(null);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    const darkMode = saved ? JSON.parse(saved) : false;
    // Apply dark mode class on initial load
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return darkMode;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save dark mode to localStorage and apply to document root
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initialize chats on mount
  useEffect(() => {
    const initChats = async () => {
      const chatStore = useChatStore.getState();
      if (chats.length === 0) {
        await chatStore.loadChats();
      }
    };
    initChats();
  }, [chats.length]);

  // Load messages when chat changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChat || !currentChat.id || currentChat.id === 'search') {
        console.log('[Dashboard] Clearing messages - no chat selected or search chat');
        setMessages([]);
        return;
      }

      console.log('[Dashboard] ========== LOADING MESSAGES FOR CHAT ==========');
      console.log('[Dashboard] Chat ID:', currentChat.id);
      console.log('[Dashboard] Chat Name:', currentChat.name);
      console.log('[Dashboard] Chat Type:', currentChat.type);

      setIsLoading(true);
      try {
        console.log('[Dashboard] Fetching chat data from API...');
        const chatData = await chatService.getChat(currentChat.id);
        console.log('[Dashboard] API Response - Chat:', chatData);
        console.log('[Dashboard] API Response - Messages count:', chatData.messages?.length || 0);
        if (chatData.messages && chatData.messages.length > 0) {
          console.log('[Dashboard] First message in response:', chatData.messages[0]);
        }

        setMessages(chatData.messages || []);
        console.log('[Dashboard] Set messages state to:', chatData.messages?.length || 0, 'messages');
      } catch (error) {
        console.error('[Dashboard] Failed to load messages:', error);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [currentChat]);

  const handleSelectChat = (chat: Chat) => {
    useChatStore.getState().setCurrentChat(chat);
  };

  const handleLogout = () => {
    logout();
  };

  const handleSendChatMessage = async (content: string, file?: File) => {
    if (!currentChat || !currentChat.id || currentChat.id === 'search' || !user) return;

    try {
      const formData = new FormData();

      // Check if this is a temporary blank chat (ID starts with temp_dm_)
      if (currentChat.id.startsWith('temp_dm_')) {
        console.log('[Dashboard] Sending message to temporary blank chat, extracting recipientId from ID');
        const recipientId = currentChat.id.replace('temp_dm_', '');
        formData.append('receiverId', recipientId);
      } else {
        // Regular chat - use chatId
        formData.append('chatId', currentChat.id);

        // For DMs with existing conversation, also try to get recipientId
        if (currentChat.type === 'dm') {
          const recipientId = currentChat.members?.find((m) => m.userId !== user.id)?.userId;
          if (recipientId) formData.append('receiverId', recipientId);
        }
      }

      formData.append('content', content);
      if (file) formData.append('attachment', file);

      console.log('[Dashboard] Sending message with formData:', {
        chatId: formData.get('chatId'),
        receiverId: formData.get('receiverId'),
        content: content
      });

      const messageService = await import('../services/message.service').then((m) => m.messageService);
      await messageService.sendMessage(formData);

      console.log('[Dashboard] Message sent successfully');

      // If this was a temp chat, reload to get the real chat
      if (currentChat.id.startsWith('temp_dm_')) {
        console.log('[Dashboard] Reloading chats after sending to temp chat');
        const chatStore = useChatStore.getState();
        await new Promise(resolve => setTimeout(resolve, 500));
        await chatStore.loadChats();

        // Find and switch to the newly created real DM
        const freshChats = chatStore.chats;
        const recipientId = currentChat.id.replace('temp_dm_', '');
        const realDm = freshChats.find((c: Chat) => {
          if (c.type !== 'dm' || !c.members || c.members.length === 0) return false;
          return c.members.some((m: any) =>
            m.userId === recipientId ||
            m.id === recipientId ||
            m.user?.id === recipientId ||
            m.user?.userId === recipientId
          );
        });

        if (realDm) {
          console.log('[Dashboard] Found newly created real DM:', realDm.id);
          chatStore.setCurrentChat(realDm);
        }
      } else {
        // Regular chat - reload messages
        const chatData = await chatService.getChat(currentChat.id);
        setMessages(chatData.messages || []);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleCreateGroup = async (name: string, description: string, privacy: string) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      // Backend expects: 0 = Public, 1 = Private
      formData.append('privacyType', privacy === 'public' ? '0' : '1');

      await chatService.createGroup(formData);
      alert('Group created successfully!');

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to create group:', error);
      alert(`Failed to create group: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleCreateChannel = async (name: string, description: string, privacy: string) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      // Backend expects: 0 = Public, 1 = Private
      formData.append('privacyType', privacy === 'public' ? '0' : '1');

      await chatService.createChannel(formData);
      alert('Channel created successfully!');

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      alert(`Failed to create channel: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleUpdateProfile = async (username: string, email: string, description: string, policy: string) => {
    try {
      const formData = new FormData();
      if (username) formData.append('username', username);
      // Note: Backend doesn't accept email updates in PUT /users/me
      if (description) formData.append('description', description);

      // Backend expects addChatMinLvl as: 0=Everyone, 1=WithConversations, 2=Nobody
      let addChatMinLvl = '0'; // everyone
      if (policy === 'chatted') addChatMinLvl = '1';
      else if (policy === 'nobody') addChatMinLvl = '2';
      formData.append('addChatMinLvl', addChatMinLvl);

      const userService = await import('../services/user.service').then((m) => m.userService);
      const updatedUser = await userService.updateProfile(formData);

      // Update auth store
      const authStore = useAuthStore.getState();
      authStore.setUser(updatedUser);

      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert(`Failed to update profile: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      throw error;
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearchResults([]);

    if (!query.trim()) {
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const userService = await import('../services/user.service').then((m) => m.userService);
        const chatServiceObj = chatService;

        const results: Array<{ id: string; name: string; type: 'user' | 'group' | 'channel'; avatar?: string }> = [];

        // Search users
        try {
          const users = await userService.searchUsers(query);
          console.log('[Search] User search results:', users);
          if (Array.isArray(users)) {
            users.forEach((u: any) => {
              // Backend SearchAsync returns: EntityId (user ID - capital E), DisplayName, ChatType, AvatarUrl, ChatId
              // Handle both EntityId (capital) and entityId (lowercase) and id
              const userId = u.EntityId || u.entityId || u.id;
              const displayName = u.displayName || u.DisplayName || u.username || u.name || 'Unknown User';

              console.log('[Search] Mapping user result:', {
                EntityId: u.EntityId,
                entityId: u.entityId,
                id: u.id,
                displayName: u.displayName,
                DisplayName: u.DisplayName,
                username: u.username,
                finalUserId: userId,
                finalName: displayName,
              });

              results.push({
                id: userId,  // Use entityId from search result
                name: displayName,
                type: 'user',
                avatar: u.avatarUrl || u.avatar || u.profileImage,
              });
            });
          }
        } catch (e) {
          console.error('User search failed:', e);
        }

        // Search chats
        try {
          const chatsResults = await chatServiceObj.searchChats(query);
          console.log('[Search] Chat results:', chatsResults, 'Type:', typeof chatsResults, 'IsArray:', Array.isArray(chatsResults));

          if (Array.isArray(chatsResults)) {
            chatsResults.forEach((c: any, index: number) => {
              console.log(`[Search] Processing chat result #${index}:`, c);
              console.log(`[Search] Result #${index} - chatType:`, c.chatType, 'type:', c.type, 'displayName:', c.displayName, 'name:', c.name);
              // Handle both SearchChatResponseDto format (entityId, displayName, chatType)
              // and the manifest format (id, name, type)
              // Determine type: handle both numeric enum (0=DM, 1=Group, 2=Channel) and string types (Conversation, Group, Channel)
              let typeValue: 'user' | 'group' | 'channel' = 'channel'; // default fallback

              // PRIORITY 1: Check if chatType is numeric (0=user/DM, 1=group, 2=channel)
              if (typeof c.chatType === 'number') {
                typeValue = c.chatType === 0 ? 'user' : c.chatType === 1 ? 'group' : 'channel';
                console.log(`[Search] Used numeric chatType (${c.chatType}) -> ${typeValue}`);
              }
              // PRIORITY 2: Check type field (backend field name) - handle string values
              else if (c.type && typeof c.type === 'string') {
                const typeStr = String(c.type).toLowerCase().trim();
                if (typeStr === 'dm' || typeStr === 'directmessage') {
                  typeValue = 'user';
                  console.log(`[Search] Used type field 'dm/directmessage' -> user`);
                } else if (typeStr === 'group') {
                  typeValue = 'group';
                  console.log(`[Search] Used type field 'group' -> group`);
                } else if (typeStr === 'channel') {
                  typeValue = 'channel';
                  console.log(`[Search] Used type field 'channel' -> channel`);
                } else {
                  // If type field exists but doesn't match known values, still try chatType
                  console.log(`[Search] type field '${c.type}' is unknown, trying chatType...`);
                  // Fall through to chatType check below
                  if (c.chatType && typeof c.chatType === 'string') {
                    const chatTypeStr = String(c.chatType).toLowerCase().trim();
                    if (chatTypeStr === 'conversation' || chatTypeStr === 'dm' || chatTypeStr === 'directmessage') {
                      typeValue = 'user';
                      console.log(`[Search] Used chatType field 'conversation/dm' -> user`);
                    } else if (chatTypeStr === 'group') {
                      typeValue = 'group';
                      console.log(`[Search] Used chatType field 'group' -> group`);
                    } else if (chatTypeStr === 'channel') {
                      typeValue = 'channel';
                      console.log(`[Search] Used chatType field 'channel' -> channel`);
                    } else {
                      console.log(`[Search] chatType '${chatTypeStr}' unknown, defaulting to channel`);
                    }
                  }
                }
              }
              // PRIORITY 3: Check chatType field (might be string like "Conversation" from backend)
              else if (c.chatType && typeof c.chatType === 'string') {
                const chatTypeStr = String(c.chatType).toLowerCase().trim();
                if (chatTypeStr === 'conversation' || chatTypeStr === 'dm' || chatTypeStr === 'directmessage' || chatTypeStr === '0') {
                  typeValue = 'user';
                  console.log(`[Search] Used string chatType '${c.chatType}' (${chatTypeStr}) -> user`);
                } else if (chatTypeStr === 'group' || chatTypeStr === '1') {
                  typeValue = 'group';
                  console.log(`[Search] Used string chatType '${c.chatType}' (${chatTypeStr}) -> group`);
                } else if (chatTypeStr === 'channel' || chatTypeStr === '2') {
                  typeValue = 'channel';
                  console.log(`[Search] Used string chatType '${c.chatType}' (${chatTypeStr}) -> channel`);
                } else {
                  console.log(`[Search] string chatType '${chatTypeStr}' unknown, defaulting to channel`);
                }
              }
              else {
                console.log('[Search] No type info found, using default (channel)');
              }

              // Map field names from API response (handle multiple possible field names)
              const name = String(c.displayName || c.name || c.username || c.title || 'Unknown').trim();
              const avatar = c.avatarUrl || c.avatar || c.profileImage || '';

              const mapped: { id: string; name: string; type: 'user' | 'group' | 'channel'; avatar?: string } = {
                id: String(c.entityId || c.id || 'unknown'),
                name: name === 'Unknown' || name.length === 0 ? 'Unknown User' : name,
                type: typeValue,
                avatar: avatar || undefined,
              };
              console.log('[Search] Mapped result:', mapped, 'Original:', {
                displayName: c.displayName,
                name: c.name,
                username: c.username,
                avatar: c.avatar,
                avatarUrl: c.avatarUrl,
              });
              results.push(mapped);
            });
          } else {
            console.warn('[Search] Chat results is not an array:', chatsResults);
            console.warn('[Search] Type of chatsResults:', typeof chatsResults);
          }
        } catch (e) {
          console.error('Chat search failed:', e);
        }

        // Remove duplicates by name+type (not just ID, since DM chats and user searches have different IDs)
        const seenKey = new Set<string>();
        const uniqueResults = results.filter((r) => {
          const key = `${r.name.toLowerCase().trim()}|${r.type}`;
          if (seenKey.has(key)) {
            console.log(`[Search] Filtered duplicate: ${key}`);
            return false;
          }
          seenKey.add(key);
          return true;
        });

        // Sort by type: users first, then groups, then channels
        uniqueResults.sort((a, b) => {
          const typeOrder = { user: 0, group: 1, channel: 2 };
          return (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3);
        });

        console.log('[Search] Final deduplicated results (by name+type):', uniqueResults, 'Removed duplicates:', results.length - uniqueResults.length);
        setSearchResults(uniqueResults);
        setIsSearching(false);
      } catch (error) {
        console.error('Search error:', error);
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectSearchResult = async (result: any) => {
    console.log('[Search] Selected result:', result, 'Type:', result.type);
    if (result.type === 'user') {
      // Open user profile viewer
      setSelectedUser(null); // Clear any previous group/channel selection
      setSelectedSearchResult(result);
      setIsLoadingUserProfile(true);
      try {
        const userService = await import('../services/user.service').then((m) => m.userService);
        console.log('[Search] Loading user profile for ID:', result.id);
        const userProfile = await userService.getUserProfile(result.id);
        console.log('[Search] Loaded user profile:', userProfile);
        setSelectedUser(userProfile);
        setShowUserProfileViewer(true);
      } catch (error) {
        console.error('[Search] Failed to load user profile:', error);
        // Still show the profile viewer with the search result data
        setSelectedUser(result as any);
        setShowUserProfileViewer(true);
      } finally {
        setIsLoadingUserProfile(false);
      }
    } else {
      // It's a group/channel - load its profile
      console.log('[Search] Opening group/channel profile for:', result.name);
      setSelectedUser(null); // Clear any previous user selection
      setIsLoadingUserProfile(true);
      try {
        const chatProfile = await chatService.getChatProfile(result.id);
        console.log('[Search] Loaded chat profile:', chatProfile);
        // Merge search result with profile, preserving the type
        const mergedProfile = {
          ...result,
          ...chatProfile,
          type: result.type, // Explicitly preserve type
          id: result.id // Explicitly preserve id for join button
        };
        console.log('[Search] Merged profile:', mergedProfile);
        setSelectedSearchResult(mergedProfile as any);
        setShowUserProfileViewer(true);
      } catch (error) {
        console.error('[Search] Failed to load chat profile:', error);
        // Still show the profile viewer with the search result data
        setSelectedSearchResult(result);
        setShowUserProfileViewer(true);
      } finally {
        setIsLoadingUserProfile(false);
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSendMessage = async (userId: string, message?: string) => {
    try {
      if (!userId) {
        alert('Error: User ID not found');
        return;
      }

      console.log('[Dashboard] handleSendMessage called with userId:', userId, 'message:', message);

      // Close the profile modal first
      setShowUserProfileViewer(false);
      setSelectedUser(null);
      setSelectedSearchResult(null);

      const chatStore = useChatStore.getState();

      // Try to find existing DM
      console.log('[Dashboard] Looking for existing DM with user:', userId);
      const allChats = chatStore.chats;

      let dmChat = allChats.find((c: Chat) => {
        if (c.type !== 'dm' || !c.members || c.members.length === 0) return false;
        return c.members.some((m: any) =>
          m.userId === userId ||
          m.id === userId ||
          m.user?.id === userId ||
          m.user?.userId === userId
        );
      });

      // If DM doesn't exist, create temporary blank chat so it shows immediately
      if (!dmChat) {
        console.log('[Dashboard] No existing DM found, creating temporary blank chat for user:', userId);
        dmChat = {
          id: `temp_dm_${userId}`,
          name: selectedUser?.username || 'User',
          type: 'dm',
          avatar: selectedUser?.avatar,
          description: '',
          privacy: 'private',
          members: [],
          unreadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Chat;
      }

      console.log('[Dashboard] Setting current chat to:', dmChat.id);
      chatStore.setCurrentChat(dmChat);

      // If message is provided, send it with receiverId to trigger backend auto-creation
      if (message && message.trim()) {
        console.log('[Dashboard] Sending initial message to user:', userId);
        try {
          const formData = new FormData();
          formData.append('receiverId', userId);
          formData.append('content', message);

          await api.post<any>('/messages/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          console.log('[Dashboard] Message sent successfully, backend auto-created DM');

          // Wait for backend to create DM, then reload chats
          await new Promise(resolve => setTimeout(resolve, 500));
          await chatStore.loadChats();

          // Find and set the newly created real DM
          const freshChats = chatStore.chats;
          const realDm = freshChats.find((c: Chat) => {
            if (c.type !== 'dm' || !c.members || c.members.length === 0) return false;
            return c.members.some((m: any) =>
              m.userId === userId ||
              m.id === userId ||
              m.user?.id === userId ||
              m.user?.userId === userId
            );
          });

          if (realDm) {
            console.log('[Dashboard] Found newly created DM:', realDm.id);
            chatStore.setCurrentChat(realDm);
          }
        } catch (error) {
          console.error('[Dashboard] Error sending message:', error);
          alert('Failed to send message');
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to open DM:', error);
      alert('Failed to open direct message');
    }
  };

  const handleJoinGroup = async (chatId: string) => {
    if (!user || !selectedSearchResult) return;
    setIsJoining(true);
    try {
      // Determine chat type from selectedSearchResult
      const chatType = selectedSearchResult.type as 'group' | 'channel';
      console.log('[Dashboard] Joining', chatType + ':', chatId);
      await chatService.joinChat(chatId, chatType);

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();

      // Find and select the joined group/channel
      const updatedChats = await chatService.getAllChats();
      const joinedChat = updatedChats.find((c: Chat) => c.id === chatId);
      if (joinedChat) {
        chatStore.setCurrentChat(joinedChat);
        console.log('[Dashboard] Joined and selected group/channel:', joinedChat.id);
      }

      setShowUserProfileViewer(false);
      setSelectedSearchResult(null);
    } catch (error) {
      console.error('[Dashboard] Failed to join group/channel:', error);
      alert('Failed to join group/channel. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={`${styles.dashboard} ${isDarkMode ? styles.darkMode : ''}`}>
      <LeftPanel
        chats={chats}
        currentChat={currentChat}
        onSelectChat={(chat) => {
          handleSelectChat(chat);
          setIsMobileSidebarOpen(false); // Close sidebar on mobile when chat selected
        }}
        isLoadingChats={isLoadingChats}
        user={user}
        onLogout={handleLogout}
        onMenuOpen={() => setShowMenu(!showMenu)}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        searchResults={searchResults}
        onSelectSearchResult={(result) => {
          handleSelectSearchResult(result);
          setIsMobileSidebarOpen(false); // Close sidebar when search result selected
        }}
        isSearching={isSearching}
        isDarkMode={isDarkMode}
        onClearSearch={() => {
          setSearchQuery('');
          setSelectedSearchResult(null);
          setShowUserProfileViewer(false);
        }}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <MenuDropdown
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onCreateGroup={() => {
          setShowCreateGroupModal(true);
          setShowMenu(false);
        }}
        onCreateChannel={() => {
          setShowCreateChannelModal(true);
          setShowMenu(false);
        }}
        onEditProfile={() => {
          setShowProfileModal(true);
          setShowMenu(false);
        }}
        onShowNotifications={() => {
          setShowNotificationsModal(true);
          setShowMenu(false);
        }}
        onShowAdminPanel={() => {
          setShowAdminPanel(true);
          setShowMenu(false);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onLogout={handleLogout}
      />
      <MainContent
        currentChat={currentChat}
        messages={messages}
        isLoadingMessages={isLoading}
        onSendMessage={handleSendChatMessage}
        onOpenGroupCreate={() => setShowCreateGroupModal(true)}
        onOpenChannelCreate={() => setShowCreateChannelModal(true)}
        onOpenUserProfile={async (userId: string) => {
          setIsLoadingUserProfile(true);
          setShowUserProfileViewer(true);
          setSelectedSearchResult(null);
          try {
            const userService = await import('../services/user.service').then((m) => m.userService);
            const userProfile = await userService.getUserProfile(userId);
            setSelectedUser(userProfile);
          } catch (error) {
            console.error('Failed to load user profile:', error);
          } finally {
            setIsLoadingUserProfile(false);
          }
        }}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />
      <RightPanel
        currentChat={currentChat}
        onReloadChat={async () => {
          if (currentChat) {
            const chatData = await chatService.getChatProfile(currentChat.id);
            useChatStore.getState().setCurrentChat(chatData);
            // Also reload messages
            const fullChat = await chatService.getChat(currentChat.id);
            setMessages(fullChat.messages || []);
          }
        }}
        onViewUserProfile={async (userId: string) => {
          setIsLoadingUserProfile(true);
          setShowUserProfileViewer(true);
          setSelectedSearchResult(null);
          try {
            const userService = await import('../services/user.service').then((m) => m.userService);
            const userProfile = await userService.getUserProfile(userId);
            setSelectedUser(userProfile);
          } catch (error) {
            console.error('Failed to load user profile:', error);
          } finally {
            setIsLoadingUserProfile(false);
          }
        }}
      />

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={handleCreateGroup}
        isDarkMode={isDarkMode}
        isChannel={false}
      />
      <CreateGroupModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onCreate={handleCreateChannel}
        isDarkMode={isDarkMode}
        isChannel={true}
      />
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onUpdate={handleUpdateProfile}
        isDarkMode={isDarkMode}
      />
      <NotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} isDarkMode={isDarkMode} />
      <AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} isDarkMode={isDarkMode} />
      {!selectedSearchResult?.type || selectedSearchResult?.type === 'user' ? (
        <UserProfileViewer
          isOpen={showUserProfileViewer}
          onClose={() => {
            setShowUserProfileViewer(false);
            setSelectedUser(null);
            setSelectedSearchResult(null);
          }}
          user={selectedUser}
          isLoading={isLoadingUserProfile}
          onSendMessage={handleSendMessage}
          isDarkMode={isDarkMode}
        />
      ) : (
        <UserProfileViewer
          isOpen={showUserProfileViewer}
          onClose={() => {
            setShowUserProfileViewer(false);
            setSelectedSearchResult(null);
            setSelectedUser(null);
          }}
          user={selectedSearchResult as any}
          isLoading={isLoadingUserProfile}
          onSendMessage={handleSendMessage}
          onJoinGroup={handleJoinGroup}
          isGroup={selectedSearchResult?.type === 'group'}
          isChannel={selectedSearchResult?.type === 'channel'}
          chatId={selectedSearchResult?.id}
          isJoining={isJoining}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

export default Dashboard;
