import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useThemeStore } from '../stores/themeStore';
import { chatService } from '../services/chat.service';
import api from '../services/api';
import { extractErrorMessage } from '../utils/errorHandler';
import type { Chat, BackendMessage, User } from '../types/api.types';
import styles from './Dashboard.module.css';
import AdminPanel from './AdminPanel';
import { useSignalR } from '../hooks/useSignalR';
import { FileDropzone } from './common/FileDropzone';
import { GroupProfileModal } from './modals/GroupProfileModal';
import { UserProfileViewerModal } from './modals/UserProfileViewerModal';
import { Sidebar } from './Sidebar';
import { Avatar } from './common/Avatar';
import { ChatView } from './ChatView';
import { SettingsMenu } from './SettingsMenu';
import { getInitials } from '../utils/helpers';
import { toast } from './common/Toast';
import { confirm } from './common/ConfirmModal';

// MODAL COMPONENTS

interface CustomReactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, image: File | null) => Promise<void>;
  isDarkMode?: boolean;
}

const CustomReactionModal: React.FC<CustomReactionModalProps> = ({ isOpen, onClose, onCreate, isDarkMode = false }) => {
  const [name, setName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name, image);
      setName('');
      setImage(null);
      setPreview(null);
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
          <h2>Create Custom Reaction</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Reaction Name *
            </label>
            <input
              type="text"
              placeholder="e.g., happy, excited, custom-emoji"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.formInput}
            />
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              This will be the emoji name (e.g., :happy:)
            </div>
          </div>
          <div className={styles.formGroup}>
            <label style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Reaction Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={styles.formInput}
              style={{ padding: '8px' }}
            />
            {preview && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    width: '64px',
                    height: '64px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: '2px solid var(--border)',
                  }}
                />
              </div>
            )}
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

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, privacy: string, avatar?: File | null) => Promise<void>;
  isDarkMode?: boolean;
  isChannel?: boolean;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onCreate, isDarkMode = false, isChannel = false }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleAvatarAccepted = (file: File) => {
    setAvatar(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name, description, privacy, avatar);
      setName('');
      setDescription('');
      setPrivacy('private');
      setAvatar(null);
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
            <FileDropzone
              onFileAccepted={handleAvatarAccepted}
              label={`${isChannel ? 'Channel' : 'Group'} Avatar (Optional)`}
              helperText="Drag and drop an image, or click to browse"
            />
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

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  onUpdate: (chatId: string, name: string, description: string, privacy: string, avatar?: File | null) => Promise<void>;
  isDarkMode?: boolean;
  isChannel?: boolean;
}

const EditGroupModal: React.FC<EditGroupModalProps> = ({ isOpen, onClose, chat, onUpdate, isDarkMode = false, isChannel = false }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isOpen && chat) {
      setName(chat.name || '');
      setDescription(chat.description || '');
      setPrivacy(chat.privacy || 'private');
      setAvatar(null);
    } else if (!isOpen) {
      setName('');
      setDescription('');
      setPrivacy('private');
      setAvatar(null);
    }
  }, [isOpen, chat]);

  const handleAvatarAccepted = (file: File) => {
    setAvatar(file);
  };

  const handleUpdate = async () => {
    if (!name.trim() || !chat) return;
    setIsUpdating(true);
    try {
      await onUpdate(chat.id, name, description, privacy, avatar);
      setName('');
      setDescription('');
      setPrivacy('private');
      setAvatar(null);
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !chat) return null;

  return (
    <div className={`${styles.modalOverlay} ${isDarkMode ? styles.darkMode : ''}`} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{isChannel ? 'Edit Channel' : 'Edit Group'}</h2>
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
            <FileDropzone
              onFileAccepted={handleAvatarAccepted}
              currentPreview={chat.avatar}
              label={`${isChannel ? 'Channel' : 'Group'} Avatar (Optional)`}
              helperText="Drag and drop a new image to update, or click to browse"
            />
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
          <button onClick={handleUpdate} disabled={!name.trim() || isUpdating} className={styles.primaryButton}>
            {isUpdating ? 'Updating...' : 'Update'}
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
  onUpdate: (username: string, email: string, description: string, policy: string, avatar?: File | null) => Promise<void>;
  isDarkMode?: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, user, onUpdate, isDarkMode = false }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [policy, setPolicy] = useState<'everyone' | 'chatted' | 'nobody'>('everyone');
  const [isUpdating, setIsUpdating] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // PROPERLY initialize form when modal opens or user changes
  useEffect(() => {
    if (isOpen && user) {
      // Force update all fields with current user data
      setUsername(user.username || '');
      setEmail(user.email || '');
      setDescription(user.bio || '');
      setPolicy((user.addMePolicy as 'everyone' | 'chatted' | 'nobody') || 'everyone');
      setAvatar(null);
      setAvatarPreview(null);
    } else if (!isOpen) {
      // Reset form when closing
      setUsername('');
      setEmail('');
      setDescription('');
      setPolicy('everyone');
      setAvatar(null);
      setAvatarPreview(null);
    }
  }, [isOpen, user]);

  const handleAvatarAccepted = (file: File) => {
    setAvatar(file);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(username, email, description, policy, avatar);
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
            <FileDropzone
              onFileAccepted={handleAvatarAccepted}
              currentPreview={user?.avatar || avatarPreview}
              label="Profile Avatar"
              helperText="Drag and drop your profile picture, or click to browse"
            />
          </div>
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
                    padding: '14px',
                    background: notif.isRead
                      ? 'rgba(99, 102, 241, 0.05)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                    border: notif.isRead
                      ? '1px solid rgba(99, 102, 241, 0.1)'
                      : '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    boxShadow: notif.isRead
                      ? 'none'
                      : '0 2px 8px rgba(99, 102, 241, 0.15)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = notif.isRead ? 'none' : '0 2px 8px rgba(99, 102, 241, 0.15)';
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
      toast.error('Error: User ID not found. Please try again.');
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
      toast.error(extractErrorMessage(error, 'Failed to create conversation'));
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
                        toast.error(extractErrorMessage(error, 'Failed to join'));
                      }
                    } else {
                      console.warn('[Modal] Missing onJoinGroup or chatId:', { onJoinGroup: !!onJoinGroup, chatId });
                      toast.error('Unable to join. Missing required information.');
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

// MAIN DASHBOARD COMPONENT

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { chats, currentChat, isLoadingChats } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
  const signalR = useSignalR();
  const [messages, setMessages] = useState<BackendMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [chatToEdit, setChatToEdit] = useState<Chat | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showCustomReactionModal, setShowCustomReactionModal] = useState(false);
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
  const [showGroupProfileModal, setShowGroupProfileModal] = useState(false);
  const [showUserViewerModal, setShowUserViewerModal] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDarkMode = theme === 'dark';

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

  // Join/leave SignalR chat rooms when chat changes
  useEffect(() => {
    const joinLeaveChats = async () => {
      if (!currentChat || !currentChat.id || currentChat.id === 'search' || currentChat.id.startsWith('temp_dm_')) {
        return;
      }

      if (signalR.isConnected) {
        try {
          console.log('[Dashboard] Joining SignalR chat room:', currentChat.id);
          await signalR.joinChat(currentChat.id);
        } catch (error) {
          console.error('[Dashboard] Failed to join chat room:', error);
        }
      }

      // Cleanup: leave chat when unmounting or switching chats
      return () => {
        if (currentChat && currentChat.id && signalR.isConnected) {
          console.log('[Dashboard] Leaving SignalR chat room:', currentChat.id);
          signalR.leaveChat(currentChat.id).catch(console.error);
        }
      };
    };

    joinLeaveChats();
  }, [currentChat, signalR.isConnected]);

  const handleSelectChat = (chat: Chat) => {
    useChatStore.getState().setCurrentChat(chat);
  };

  const handleLogout = () => {
    logout();
  };

  const handleSendChatMessage = async (content: string, file?: File) => {
    if (!currentChat || !currentChat.id || currentChat.id === 'search' || !user) return;

    try {
      // If there's a file attachment, use REST API (SignalR doesn't handle files)
      if (file) {
        console.log('[Dashboard] Sending message with file via REST API');
        const formData = new FormData();

        // Check if this is a temporary blank chat (ID starts with temp_dm_)
        if (currentChat.id.startsWith('temp_dm_')) {
          const recipientId = currentChat.id.replace('temp_dm_', '');
          formData.append('receiverId', recipientId);
        } else {
          formData.append('chatId', currentChat.id);
          if (currentChat.type === 'dm') {
            const recipientId = currentChat.members?.find((m) => m.userId !== user.id)?.userId;
            if (recipientId) formData.append('receiverId', recipientId);
          }
        }

        formData.append('content', content);
        formData.append('file', file);

        const messageService = await import('../services/message.service').then((m) => m.messageService);
        await messageService.sendMessage(formData);
      } else {
        // Text-only message: use SignalR for real-time messaging
        console.log('[Dashboard] Sending text message via SignalR');

        let chatId: string | null = null;
        let receiverId: string | null = null;

        // Check if this is a temporary blank chat
        if (currentChat.id.startsWith('temp_dm_')) {
          receiverId = currentChat.id.replace('temp_dm_', '');
        } else {
          chatId = currentChat.id;
          // For DMs with existing conversation, also get recipientId
          if (currentChat.type === 'dm') {
            receiverId = currentChat.members?.find((m) => m.userId !== user.id)?.userId || null;
          }
        }

        await signalR.sendMessage(chatId, content, receiverId, null);
      }

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

  const handleCreateGroup = async (name: string, description: string, privacy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      // Backend expects: 0 = Public, 1 = Private
      formData.append('privacyType', privacy === 'public' ? '0' : '1');

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      await chatService.createGroup(formData);
      toast.success('Group created successfully!');

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to create group:', error);
      toast.error(extractErrorMessage(error, 'Failed to create group'));
      throw error;
    }
  };

  const handleCreateChannel = async (name: string, description: string, privacy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      // Backend expects: 0 = Public, 1 = Private
      formData.append('privacyType', privacy === 'public' ? '0' : '1');

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      await chatService.createChannel(formData);
      toast.success('Channel created successfully!');

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      toast.error(extractErrorMessage(error, 'Failed to create channel'));
      throw error;
    }
  };

  const handleUpdateGroup = async (chatId: string, name: string, description: string, privacy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('name', name);
      if (description) {
        formData.append('description', description);
      }
      // Backend expects: 0 = Public, 1 = Private
      formData.append('privacyType', privacy === 'public' ? '0' : '1');

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      // Determine chat type from chatToEdit
      const chatType = chatToEdit?.type === 'channel' ? 'channel' : 'group';
      await chatService.updateChat(chatId, chatType as 'group' | 'channel', formData);
      toast.success('Group/Channel updated successfully!');

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to update group/channel:', error);
      toast.error(extractErrorMessage(error, 'Failed to update group/channel'));
      throw error;
    }
  };

  const handleBanMember = async (userId: string) => {
    if (!currentChat) return;
    try {
      await chatService.banUser(currentChat.id, userId);
      toast.success('User banned successfully');
      // Reload chat profile
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error(extractErrorMessage(error, 'Failed to ban user'));
    }
  };

  const handleUnbanMember = async (userId: string) => {
    if (!currentChat) return;
    try {
      await chatService.unbanUser(currentChat.id, userId);
      toast.success('User unbanned successfully');
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to unban user:', error);
      toast.error(extractErrorMessage(error, 'Failed to unban user'));
    }
  };

  const handleUpdatePrivacy = async (privacy: 'public' | 'private') => {
    if (!currentChat) return;
    try {
      await chatService.updateChatPrivacy(currentChat.id, privacy);
      toast.success(`Privacy updated to ${privacy}`);
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to update privacy:', error);
      toast.error(extractErrorMessage(error, 'Failed to update privacy'));
    }
  };

  const handleLeaveChat = async () => {
    if (!currentChat) return;

    const confirmed = await confirm({
      title: `Leave ${currentChat.type === 'channel' ? 'Channel' : 'Group'}`,
      message: `Are you sure you want to leave this ${currentChat.type}? You will lose access to all messages and content.`,
      confirmText: 'Leave',
      cancelText: 'Stay',
      variant: 'warning',
    });

    if (!confirmed) return;

    try {
      await chatService.leaveChat(currentChat.id, currentChat.type as 'group' | 'channel');
      toast.success(`Left ${currentChat.type} successfully`);
      // Reload chats and clear current chat
      await useChatStore.getState().loadChats();
      useChatStore.getState().setCurrentChat(null);
      setShowGroupProfileModal(false);
    } catch (error) {
      console.error('Failed to leave chat:', error);
      toast.error(extractErrorMessage(error, 'Failed to leave'));
    }
  };

  const handleDeleteChat = async () => {
    if (!currentChat) return;
    try {
      await chatService.deleteChat(currentChat.id, currentChat.type as 'group' | 'channel');
      toast.success(`${currentChat.type === 'group' ? 'Group' : 'Channel'} deleted successfully`);
      // Reload chats and clear current chat
      await useChatStore.getState().loadChats();
      useChatStore.getState().setCurrentChat(null);
      setShowGroupProfileModal(false);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error(extractErrorMessage(error, `Failed to delete ${currentChat.type}`));
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const userService = await import('../services/user.service').then((m) => m.userService);
      await userService.blockUser(userId);
      toast.success('User blocked successfully');
      setShowUserViewerModal(false);
      setShowUserProfileViewer(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error(extractErrorMessage(error, 'Failed to block user'));
    }
  };

  const handleCreateCustomReaction = async (name: string, image: File | null) => {
    try {
      const formData = new FormData();
      formData.append('Name', name);
      if (image) {
        formData.append('file', image);
      }

      const { reactionService } = await import('../services/reaction.service');
      await reactionService.createReaction(formData);
      toast.success('Custom reaction created successfully!');
    } catch (error: any) {
      console.error('Failed to create custom reaction:', error);
      toast.error(extractErrorMessage(error, 'Failed to create custom reaction'));
      throw error;
    }
  };

  const handleUpdateProfile = async (username: string, _email: string, description: string, policy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      if (username) formData.append('username', username);
      // Note: Backend doesn't accept email updates in PUT /users/me
      // Always send description, even if empty, to avoid validation errors
      formData.append('description', description || '');

      // Backend expects addChatMinLvl as: 0=Everyone, 1=WithConversations, 2=Nobody
      let addChatMinLvl = '0'; // everyone
      if (policy === 'chatted') addChatMinLvl = '1';
      else if (policy === 'nobody') addChatMinLvl = '2';
      formData.append('addChatMinLvl', addChatMinLvl);

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      const userService = await import('../services/user.service').then((m) => m.userService);
      const updatedUser = await userService.updateProfile(formData);

      // Update auth store
      const authStore = useAuthStore.getState();
      authStore.setUser(updatedUser);

      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(extractErrorMessage(error, 'Failed to update profile'));
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
      // It's a group/channel - open GroupProfileModal
      console.log('[Search] Opening group/channel profile for:', result.name);
      setSelectedUser(null); // Clear any previous user selection
      setIsLoadingUserProfile(true);
      try {
        const chatProfile = await chatService.getChatProfile(result.id);
        console.log('[Search] Loaded chat profile:', chatProfile);
        // Set it as current chat and open the group profile modal
        useChatStore.getState().setCurrentChat(chatProfile as any);
        setShowGroupProfileModal(true);
      } catch (error) {
        console.error('[Search] Failed to load chat profile:', error);
        toast.error(extractErrorMessage(error, 'Failed to load profile'));
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
        toast.error('Error: User ID not found');
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
          toast.error(extractErrorMessage(error, 'Failed to send message'));
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to open DM:', error);
      toast.error(extractErrorMessage(error, 'Failed to open direct message'));
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
      toast.error(extractErrorMessage(error, 'Failed to join group/channel'));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className={`${styles.dashboard} ${isDarkMode ? styles.darkMode : ''}`}>
      <Sidebar
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
      <SettingsMenu
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
        onCreateCustomReaction={() => {
          setShowCustomReactionModal(true);
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
        onToggleDarkMode={toggleTheme}
        onLogout={handleLogout}
      />
      <ChatView
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
        onOpenChatProfile={() => setShowGroupProfileModal(true)}
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
      <EditGroupModal
        isOpen={showEditGroupModal}
        onClose={() => {
          setShowEditGroupModal(false);
          setChatToEdit(null);
        }}
        chat={chatToEdit}
        onUpdate={handleUpdateGroup}
        isDarkMode={isDarkMode}
        isChannel={chatToEdit?.type === 'channel'}
      />
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={user}
        onUpdate={handleUpdateProfile}
        isDarkMode={isDarkMode}
      />
      <NotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} isDarkMode={isDarkMode} />
      <CustomReactionModal
        isOpen={showCustomReactionModal}
        onClose={() => setShowCustomReactionModal(false)}
        onCreate={handleCreateCustomReaction}
        isDarkMode={isDarkMode}
      />
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

      {/* Group/Channel Profile Modal */}
      {currentChat && (currentChat.type === 'group' || currentChat.type === 'channel') && (
        <GroupProfileModal
          isOpen={showGroupProfileModal}
          onClose={() => setShowGroupProfileModal(false)}
          chat={currentChat}
          currentUserId={user?.id || ''}
          onEditGroup={() => {
            setShowGroupProfileModal(false);
            setChatToEdit(currentChat);
            setShowEditGroupModal(true);
          }}
          onLeaveGroup={handleLeaveChat}
          onDeleteGroup={handleDeleteChat}
          onBanMember={handleBanMember}
          onUnbanMember={handleUnbanMember}
          onUpdatePrivacy={handleUpdatePrivacy}
          onViewUserProfile={(userId) => {
            setViewingUserId(userId);
            setShowUserViewerModal(true);
          }}
        />
      )}

      {/* User Profile Viewer Modal */}
      {viewingUserId && (
        <UserProfileViewerModal
          isOpen={showUserViewerModal}
          onClose={() => {
            setShowUserViewerModal(false);
            setViewingUserId(null);
          }}
          userId={viewingUserId}
          onSendMessage={(userId) => {
            // TODO: Implement send message functionality
            console.log('Send message to user:', userId);
          }}
          onBlockUser={handleBlockUser}
        />
      )}
    </div>
  );
};

export default Dashboard;
