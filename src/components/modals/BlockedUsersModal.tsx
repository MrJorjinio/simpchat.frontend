import React, { useState, useEffect } from 'react';
import { ShieldOff, X, Unlock, ShieldCheck } from 'lucide-react';
import { userService } from '../../services/user.service';
import { confirm } from '../common/ConfirmModal';
import { getInitials, fixMinioUrl } from '../../utils/helpers';
import styles from './BlockedUsersModal.module.css';

interface BlockedUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  blockedAt: string;
}

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  isOpen,
  onClose,
  isDarkMode = true,
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBlockedUsers();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getBlockedUsers();
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (user: BlockedUser) => {
    const confirmed = await confirm({
      title: 'Unblock User',
      message: `Are you sure you want to unblock ${user.username}? They will be able to message you again.`,
      confirmText: 'Unblock',
      cancelText: 'Cancel',
      variant: 'success',
      icon: 'success',
    });

    if (!confirmed) return;

    setUnblockingUserId(user.userId);
    try {
      await userService.unblockUser(user.userId);
      setBlockedUsers(prev => prev.filter(u => u.userId !== user.userId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setUnblockingUserId(null);
    }
  };

  const formatBlockedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.blockedModal} ${!isDarkMode ? styles.lightMode : ''}`}
    >
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <ShieldOff size={22} />
              </div>
              <div>
                <h2 className={styles.headerTitle}>
                  Blocked Users
                  {blockedUsers.length > 0 && (
                    <span className={styles.headerCount}>{blockedUsers.length}</span>
                  )}
                </h2>
                <p className={styles.headerSubtitle}>Manage your block list</p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>

          {/* Body */}
          <div className={styles.body}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>Loading blocked users...</span>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <ShieldCheck size={32} />
                </div>
                <h3 className={styles.emptyTitle}>No blocked users</h3>
                <p className={styles.emptyText}>
                  You haven't blocked anyone yet. Blocked users cannot send you messages or see your online status.
                </p>
              </div>
            ) : (
              <div className={styles.userList}>
                {blockedUsers.map((user) => (
                  <div key={user.userId} className={styles.userCard}>
                    <div className={styles.userAvatar}>
                      {user.avatarUrl ? (
                        <img
                          src={fixMinioUrl(user.avatarUrl)}
                          alt={user.username}
                        />
                      ) : (
                        <span className={styles.userInitials}>
                          {getInitials(user.username)}
                        </span>
                      )}
                    </div>

                    <div className={styles.userInfo}>
                      <p className={styles.userName}>{user.username}</p>
                      <div className={styles.userMeta}>
                        <span className={styles.blockedBadge}>
                          <ShieldOff size={10} />
                          Blocked
                        </span>
                        <span>{formatBlockedDate(user.blockedAt)}</span>
                      </div>
                    </div>

                    <button
                      className={`${styles.unblockBtn} ${unblockingUserId === user.userId ? styles.loading : ''}`}
                      onClick={() => handleUnblock(user)}
                      disabled={unblockingUserId === user.userId}
                    >
                      <Unlock size={14} />
                      {unblockingUserId === user.userId ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <footer className={styles.footer}>
            <span className={styles.footerInfo}>
              {blockedUsers.length > 0
                ? `${blockedUsers.length} user${blockedUsers.length > 1 ? 's' : ''} blocked`
                : 'Your block list is empty'
              }
            </span>
            <button className={styles.footerBtn} onClick={onClose}>
              Done
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
