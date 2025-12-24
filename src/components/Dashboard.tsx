import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { useThemeStore } from '../stores/themeStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { chatService } from '../services/chat.service';
import api from '../services/api';
import type { Chat, User } from '../types/api.types';
import styles from './Dashboard.module.css';
import AdminPanel from './AdminPanel';
import { useSignalR } from '../hooks/useSignalR';
import { FileDropzone } from './common/FileDropzone';
import { GroupProfileModal } from './modals/GroupProfileModal';
import { UserProfileViewerModal } from './modals/UserProfileViewerModal';
import { BlockedUsersModal } from './modals/BlockedUsersModal';
import { Sidebar } from './Sidebar';
import { ChatView } from './ChatView';
import { SettingsPanel } from './SettingsPanel';
import { RightPanel } from './RightPanel';
import { getInitials, fixMinioUrl } from '../utils/helpers';
// Toast removed - using visual feedback instead
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
  onNavigateToChat?: (chatId: string) => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose, isDarkMode = false, onNavigateToChat }) => {
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
        chatId: n.chatId,
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

  const handleNotificationClick = async (notificationId: string, chatId?: string) => {
    try {
      const notificationService = await import('../services/notification.service').then(
        (m) => m.notificationService
      );
      await notificationService.markAsSeen(notificationId);

      // Navigate to the chat if chatId is available
      if (chatId && onNavigateToChat) {
        onClose(); // Close the modal first
        onNavigateToChat(chatId);
      } else {
        // Reload notifications if not navigating
        await loadNotifications();
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error);
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
        <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {isLoadingNotifications ? (
            <div className={styles.loadingState}>Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className={styles.emptyState}>No notifications yet</div>
          ) : (
            <>
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
                    marginBottom: '12px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  Mark All as Read
                </button>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id, notif.chatId)}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// MAIN COMPONENTS

// MAIN DASHBOARD COMPONENT

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { chats, currentChat, isLoadingChats, messages, setMessages, onlineUsers } = useChatStore();
  const { theme, toggleTheme } = useThemeStore();
  const { fancyAnimations, toggleFancyAnimations } = usePreferencesStore();
  const signalR = useSignalR();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [chatToEdit, setChatToEdit] = useState<Chat | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showCustomReactionModal, setShowCustomReactionModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; type: 'user' | 'group' | 'channel'; avatar?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserProfileViewer, setShowUserProfileViewer] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [_selectedSearchResult, setSelectedSearchResult] = useState<any>(null);
  const [_isLoadingUserProfile, setIsLoadingUserProfile] = useState(false);
  const [showGroupProfileModal, setShowGroupProfileModal] = useState(false);
  const [showUserViewerModal, setShowUserViewerModal] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDarkMode = theme === 'dark';

  // Track loaded chat ID to prevent duplicate loads
  const loadedChatIdRef = useRef<string | null>(null);
  const joinedChatIdRef = useRef<string | null>(null);

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

  // Load messages when chat ID changes (not when object reference changes)
  const currentChatId = currentChat?.id;
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentChatId || currentChatId === 'search') {
        console.log('[Dashboard] Clearing messages - no chat selected or search chat');
        setMessages([]);
        loadedChatIdRef.current = null;
        return;
      }

      // Skip for temporary chats
      if (currentChatId.startsWith('temp_dm_')) {
        console.log('[Dashboard] Temporary chat, skipping message load');
        setMessages([]);
        loadedChatIdRef.current = currentChatId;
        return;
      }

      // Skip if already loaded for this chat ID
      if (loadedChatIdRef.current === currentChatId) {
        console.log('[Dashboard] Messages already loaded for chat:', currentChatId);
        return;
      }

      console.log('[Dashboard] ========== LOADING MESSAGES FOR CHAT ==========');
      console.log('[Dashboard] Chat ID:', currentChatId);

      loadedChatIdRef.current = currentChatId;
      setIsLoading(true);
      try {
        console.log('[Dashboard] Fetching chat data from API...');
        const chatData = await chatService.getChat(currentChatId);
        console.log('[Dashboard] API Response - Messages count:', chatData.messages?.length || 0);

        setMessages(chatData.messages || []);

        // Mark messages as seen when opening the chat
        if (signalR.isConnected) {
          signalR.markMessagesAsSeen(currentChatId);

          // Reset unreadCount to 0 for the current chat immediately (don't wait for SignalR event)
          const chatStore = useChatStore.getState();
          chatStore.resetUnreadCount(currentChatId);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load messages:', error);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [currentChatId, signalR.isConnected]);

  // Join/leave SignalR chat rooms when chat ID changes
  useEffect(() => {
    if (!currentChatId || currentChatId === 'search' || currentChatId.startsWith('temp_dm_')) {
      return;
    }

    // Skip if already joined this chat
    if (joinedChatIdRef.current === currentChatId) {
      console.log('[Dashboard] Already joined chat room:', currentChatId);
      return;
    }

    const joinChat = async () => {
      if (signalR.isConnected) {
        try {
          // Leave previous chat first if we were in one
          if (joinedChatIdRef.current && joinedChatIdRef.current !== currentChatId) {
            console.log('[Dashboard] Leaving previous chat room:', joinedChatIdRef.current);
            await signalR.leaveChat(joinedChatIdRef.current).catch(console.error);
          }

          console.log('[Dashboard] Joining SignalR chat room:', currentChatId);
          await signalR.joinChat(currentChatId);
          joinedChatIdRef.current = currentChatId;
        } catch (error) {
          console.error('[Dashboard] Failed to join chat room:', error);
        }
      }
    };

    joinChat();

    // Cleanup: leave chat when unmounting
    return () => {
      if (joinedChatIdRef.current && signalR.isConnected) {
        console.log('[Dashboard] Cleanup - Leaving SignalR chat room:', joinedChatIdRef.current);
        signalR.leaveChat(joinedChatIdRef.current).catch(console.error);
        joinedChatIdRef.current = null;
      }
    };
  }, [currentChatId, signalR.isConnected]);

  const handleSelectChat = async (chat: Chat) => {
    // First set the chat for immediate UI feedback
    useChatStore.getState().setCurrentChat(chat);

    // Load full profile to get member data (needed for permission checks and block status)
    // This applies to groups, channels, AND DMs (but NOT temporary DM chats with temp_dm_ prefix)
    const isRealChat = !chat.id.startsWith('temp_dm_');
    if (isRealChat && (chat.type === 'group' || chat.type === 'channel' || chat.type === 'dm')) {
      try {
        const fullProfile = await chatService.getChatProfile(chat.id);
        console.log('[Dashboard] Loaded full profile for', chat.type, ':', fullProfile.id, 'members:', fullProfile.members?.length);
        useChatStore.getState().setCurrentChat(fullProfile as Chat);

        // Fetch presence states for members in this chat
        if (fullProfile.members && fullProfile.members.length > 0) {
          const memberIds = fullProfile.members
            .map((m: any) => m.userId || m.id || m.user?.id)
            .filter((id: string | undefined): id is string => !!id);

          if (memberIds.length > 0) {
            try {
              const { signalRService } = await import('../services/signalr.service');
              const presenceStates = await signalRService.getPresenceStates(memberIds);
              console.log('[Dashboard] Fetched presence for chat members:', presenceStates);
              useChatStore.getState().setInitialPresenceStates(presenceStates);
            } catch (presenceError) {
              console.error('[Dashboard] Failed to fetch presence states:', presenceError);
            }
          }
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load chat profile:', error);
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      variant: 'warning',
    });

    if (confirmed) {
      logout();
    }
  };

  const handleSendChatMessage = async (content: string, file?: File, replyId?: string) => {
    console.log('[Dashboard] handleSendChatMessage called', {
      content,
      file: file ? { name: file.name, size: file.size, type: file.type } : null,
      currentChatId: currentChat?.id,
      userId: user?.id,
      replyId
    });

    if (!currentChat || !currentChat.id || currentChat.id === 'search' || !user) {
      console.log('[Dashboard] Early return - missing chat or user');
      return;
    }

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
        if (replyId) {
          formData.append('replyId', replyId);
        }

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

        await signalR.sendMessage(chatId, content, receiverId, replyId || null);
      }

      console.log('[Dashboard] Message sent successfully');

      // If this was a temp chat, reload to get the real chat
      if (currentChat.id.startsWith('temp_dm_')) {
        console.log('[Dashboard] Reloading chats after sending to temp chat');
        const chatStore = useChatStore.getState();
        const recipientId = currentChat.id.replace('temp_dm_', '');

        // Try to find the real DM with retries
        let realDm: Chat | undefined;
        const tempChatName = currentChat.name; // Store the recipient's username from temp chat

        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          await chatStore.loadChats();

          const freshChats = useChatStore.getState().chats;
          realDm = freshChats.find((c: Chat) => {
            if (c.type !== 'dm') return false;

            // Method 1: Try to match by members array (if available)
            if (c.members && c.members.length > 0) {
              return c.members.some((m: any) =>
                m.userId === recipientId ||
                m.id === recipientId ||
                m.user?.id === recipientId ||
                m.user?.userId === recipientId
              );
            }

            // Method 2: Match by chat name (for DMs, name is the other user's username)
            // This works when members array is not included in the response
            if (tempChatName && c.name === tempChatName) {
              return true;
            }

            return false;
          });

          if (realDm) {
            console.log(`[Dashboard] Found newly created real DM on attempt ${attempt + 1}:`, realDm.id);
            break;
          }
          console.log(`[Dashboard] Real DM not found on attempt ${attempt + 1}, retrying...`);
        }

        if (realDm) {
          // Update ref to prevent duplicate load from useEffect
          loadedChatIdRef.current = realDm.id;
          chatStore.setCurrentChat(realDm);
          // Load messages for the newly created chat
          const chatData = await chatService.getChat(realDm.id);
          setMessages(chatData.messages || []);
        } else {
          console.error('[Dashboard] Failed to find newly created DM after retries');
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
      // Backend expects PascalCase field names to match DTO properties
      formData.append('Name', name);
      formData.append('Description', description || '');
      // Backend expects PrivacyType enum: "Public" or "Private" (capitalized)
      formData.append('PrivacyType', privacy === 'public' ? 'Public' : 'Private');

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      console.log('[Dashboard] Creating group with FormData:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
      }

      await chatService.createGroup(formData);

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to create group:', error);
      throw error;
    }
  };

  const handleCreateChannel = async (name: string, description: string, privacy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      // Backend expects PascalCase field names to match DTO properties
      formData.append('Name', name);
      formData.append('Description', description || '');
      // Backend expects PrivacyType enum: "Public" or "Private" (capitalized)
      formData.append('PrivacyType', privacy === 'public' ? 'Public' : 'Private');

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      console.log('[Dashboard] Creating channel with FormData:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
      }

      await chatService.createChannel(formData);

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  };

  const handleUpdateGroup = async (chatId: string, name: string, description: string, privacy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      // Backend expects PascalCase field names to match DTO properties
      formData.append('Name', name);
      formData.append('Description', description || '');
      // Backend expects PrivacyType enum: "Public" or "Private" (capitalized)
      formData.append('PrivacyType', privacy === 'public' ? 'Public' : 'Private');

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      console.log('[Dashboard] Updating group/channel with FormData:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
      }

      // Determine chat type from chatToEdit
      const chatType = chatToEdit?.type === 'channel' ? 'channel' : 'group';
      await chatService.updateChat(chatId, chatType as 'group' | 'channel', formData);

      // Reload chats
      const chatStore = useChatStore.getState();
      await chatStore.loadChats();
    } catch (error: any) {
      console.error('Failed to update group/channel:', error);
      throw error;
    }
  };

  const handleBanMember = async (userId: string) => {
    if (!currentChat) return;
    try {
      await chatService.banUser(currentChat.id, userId);
      // Reload chat profile
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleUnbanMember = async (userId: string) => {
    if (!currentChat) return;
    try {
      await chatService.unbanUser(currentChat.id, userId);
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!currentChat) return;
    try {
      if (currentChat.type === 'group') {
        await chatService.removeMemberFromGroup(currentChat.id, userId);
      } else if (currentChat.type === 'channel') {
        await chatService.removeMemberFromChannel(currentChat.id, userId);
      }
      // Reload chat profile
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleUpdatePrivacy = async (privacy: 'public' | 'private') => {
    if (!currentChat) return;
    try {
      await chatService.updateChatPrivacy(currentChat.id, privacy);
      const updated = await chatService.getChatProfile(currentChat.id);
      useChatStore.getState().setCurrentChat(updated);
    } catch (error) {
      console.error('Failed to update privacy:', error);
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
      icon: 'leave',
    });

    if (!confirmed) return;

    try {
      await chatService.leaveChat(currentChat.id, currentChat.type as 'group' | 'channel');
      // Reload chats and clear current chat
      await useChatStore.getState().loadChats();
      useChatStore.getState().setCurrentChat(null);
      setShowGroupProfileModal(false);
    } catch (error) {
      console.error('Failed to leave chat:', error);
    }
  };

  const handleDeleteChat = async () => {
    if (!currentChat) return;
    try {
      await chatService.deleteChat(currentChat.id, currentChat.type as 'group' | 'channel');
      // Reload chats and clear current chat
      await useChatStore.getState().loadChats();
      useChatStore.getState().setCurrentChat(null);
      setShowGroupProfileModal(false);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const userService = await import('../services/user.service').then((m) => m.userService);
      await userService.blockUser(userId);
      // Update store immediately for instant UI feedback
      useChatStore.getState().addBlockedUser(userId);
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      const userService = await import('../services/user.service').then((m) => m.userService);
      await userService.unblockUser(userId);
      // Update store immediately for instant UI feedback
      useChatStore.getState().removeBlockedUser(userId);
    } catch (error) {
      console.error('Failed to unblock user:', error);
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
    } catch (error: any) {
      console.error('Failed to create custom reaction:', error);
      throw error;
    }
  };

  const handleUpdateProfile = async (username: string, _email: string, description: string, policy: string, avatar?: File | null) => {
    try {
      const formData = new FormData();
      // Backend expects PascalCase field names to match DTO properties
      if (username) formData.append('Username', username);
      // Note: Backend doesn't accept email updates in PUT /users/me
      // Always send description, even if empty, to avoid validation errors
      formData.append('Description', description || '');

      // Backend expects AddChatMinLvl as enum: Everyone=0, WithConversations=1, Nobody=2
      let addChatMinLvl = 'Everyone';
      if (policy === 'chatted') addChatMinLvl = 'WithConversations';
      else if (policy === 'nobody') addChatMinLvl = 'Nobody';
      formData.append('AddChatMinLvl', addChatMinLvl);

      // Add avatar if provided
      if (avatar) {
        formData.append('file', avatar);
      }

      console.log('[Dashboard] Updating profile with FormData:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value);
      }

      const userService = await import('../services/user.service').then((m) => m.userService);
      const updatedUser = await userService.updateProfile(formData);

      // Update auth store
      const authStore = useAuthStore.getState();
      authStore.setUser(updatedUser);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
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
                avatar: fixMinioUrl(u.avatarUrl || u.avatar || u.profileImage),
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
              const avatar = fixMinioUrl(c.avatarUrl || c.avatar || c.profileImage) || '';

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
        console.error('Error: User ID not found');
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

      // First, try to find DM by checking members (if populated)
      let dmChat = allChats.find((c: Chat) => {
        if (c.type !== 'dm') return false;
        if (c.members && c.members.length > 0) {
          return c.members.some((m: any) =>
            m.userId === userId ||
            m.id === userId ||
            m.user?.id === userId ||
            m.user?.userId === userId
          );
        }
        return false;
      });

      // If not found by members, check DM chats with empty members by fetching full profile
      if (!dmChat) {
        const dmChatsWithoutMembers = allChats.filter((c: Chat) =>
          c.type === 'dm' && (!c.members || c.members.length === 0)
        );

        console.log('[Dashboard] Checking', dmChatsWithoutMembers.length, 'DM chats without members');

        for (const chat of dmChatsWithoutMembers) {
          try {
            // Use getChatProfile instead of getChat - it returns members
            const fullChat = await chatService.getChatProfile(chat.id);
            console.log('[Dashboard] Fetched full DM profile:', fullChat.id, 'members:', fullChat.members?.length);

            if (fullChat.members && fullChat.members.length > 0) {
              const hasMatch = fullChat.members.some((m: any) =>
                m.userId === userId ||
                m.id === userId ||
                m.user?.id === userId ||
                m.user?.userId === userId
              );

              if (hasMatch) {
                console.log('[Dashboard] Found existing DM by fetching profile:', fullChat.id);
                dmChat = fullChat;
                break;
              }
            }
          } catch (error) {
            console.error('[Dashboard] Error fetching DM profile:', error);
          }
        }
      }

      // If DM exists, open it
      if (dmChat) {
        console.log('[Dashboard] Opening existing DM:', dmChat.id);
        chatStore.setCurrentChat(dmChat);
        return;
      }

      // No existing DM - create temporary blank chat
      console.log('[Dashboard] No existing DM found, creating temporary blank chat for user:', userId);

      // Get user info - either from selectedUser state or fetch it
      let userName = selectedUser?.username || 'User';
      let userAvatar = selectedUser?.avatar;

      if (!selectedUser) {
        try {
          const userSvc = await import('../services/user.service').then((m) => m.userService);
          const userProfile = await userSvc.getUserProfile(userId);
          userName = userProfile.username || 'User';
          userAvatar = userProfile.avatar;
          console.log('[Dashboard] Fetched user profile for blank chat:', userName);
        } catch (error) {
          console.error('[Dashboard] Failed to fetch user profile:', error);
        }
      }

      const blankChat = {
        id: `temp_dm_${userId}`,
        name: userName,
        type: 'dm',
        avatar: userAvatar,
        description: '',
        privacy: 'private',
        members: [],
        unreadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Chat;

      console.log('[Dashboard] Setting current chat to blank:', blankChat.id);
      chatStore.setCurrentChat(blankChat);

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
        }
      }
    } catch (error) {
      console.error('[Dashboard] Failed to open DM:', error);
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
        onlineUsers={onlineUsers}
      />
      <SettingsPanel
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onCreateGroup={() => setShowCreateGroupModal(true)}
        onCreateChannel={() => setShowCreateChannelModal(true)}
        onEditProfile={() => setShowProfileModal(true)}
        onShowNotifications={() => setShowNotificationsModal(true)}
        onShowAdminPanel={() => setShowAdminPanel(true)}
        onShowBlockedUsers={() => setShowBlockedUsersModal(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleTheme}
        onLogout={handleLogout}
        fancyAnimations={fancyAnimations}
        onToggleFancyAnimations={toggleFancyAnimations}
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

      {/* Right Panel for DM chats */}
      {currentChat?.type === 'dm' && (
        <RightPanel
          currentChat={currentChat}
          onReloadChat={async () => {
            if (currentChat) {
              const chatData = await chatService.getChatProfile(currentChat.id);
              useChatStore.getState().setCurrentChat(chatData as any);
            }
          }}
          onViewUserProfile={(userId) => {
            setViewingUserId(userId);
            setShowUserViewerModal(true);
          }}
          onConversationDeleted={() => {
            // Clear current chat and reload chats
            useChatStore.getState().setCurrentChat(null);
            useChatStore.getState().loadChats();
          }}
        />
      )}

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
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        isDarkMode={isDarkMode}
        onNavigateToChat={async (chatId) => {
          try {
            // Find the chat from chats list
            let targetChat = chats.find((c) => c.id === chatId);

            if (!targetChat) {
              // Chat not in list - reload chats first and try to find it
              console.log('[Dashboard] Chat not in list, reloading chats...');
              await useChatStore.getState().loadChats();
              const freshChats = useChatStore.getState().chats;
              targetChat = freshChats.find((c) => c.id === chatId);
            }

            if (targetChat) {
              // Use handleSelectChat to properly load the chat with all setup
              await handleSelectChat(targetChat);
            } else {
              // Still not found - try to load chat profile directly
              console.log('[Dashboard] Chat still not in list, loading profile directly...');
              const chatData = await chatService.getChatProfile(chatId);
              if (chatData) {
                // Set as current chat - this will trigger the useEffect to load messages
                await handleSelectChat(chatData as Chat);
              } else {
                console.error('Chat not found');
              }
            }
          } catch (error) {
            console.error('[Dashboard] Failed to load chat from notification:', error);
          }
        }}
      />
      <CustomReactionModal
        isOpen={showCustomReactionModal}
        onClose={() => setShowCustomReactionModal(false)}
        onCreate={handleCreateCustomReaction}
        isDarkMode={isDarkMode}
      />
      <AdminPanel isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} isDarkMode={isDarkMode} />
      <BlockedUsersModal isOpen={showBlockedUsersModal} onClose={() => setShowBlockedUsersModal(false)} isDarkMode={isDarkMode} />
      {/* User Profile from Search */}
      {showUserProfileViewer && selectedUser && (
        <UserProfileViewerModal
          isOpen={showUserProfileViewer}
          onClose={() => {
            setShowUserProfileViewer(false);
            setSelectedUser(null);
            setSelectedSearchResult(null);
          }}
          userId={selectedUser.id}
          onSendMessage={handleSendMessage}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          fancyAnimations={fancyAnimations}
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
          onKickMember={handleKickMember}
          onBanMember={handleBanMember}
          onUnbanMember={handleUnbanMember}
          onUpdatePrivacy={handleUpdatePrivacy}
          onViewUserProfile={(userId) => {
            setViewingUserId(userId);
            setShowUserViewerModal(true);
          }}
          fancyAnimations={fancyAnimations}
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
          onSendMessage={handleSendMessage}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          fancyAnimations={fancyAnimations}
        />
      )}
    </div>
  );
};

export default Dashboard;
