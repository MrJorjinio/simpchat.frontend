import React, { useEffect, useState } from 'react';
import { Shield, X, Search, Users, Trash2, RefreshCw, AlertCircle, UserX } from 'lucide-react';
import { userService } from '../services/user.service';
import type { User } from '../types/api.types';
import { confirm } from './common/ConfirmModal';
import styles from './AdminPanel.module.css';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const getInitials = (name: string | undefined | null): string => {
  if (!name || name === 'undefined' || name === 'null') return '?';
  const trimmed = String(name).trim();
  if (!trimmed || trimmed.length === 0) return '?';
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0]?.toUpperCase() || '?';
  return words.map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
};

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, isDarkMode = true }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
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

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      if (err.response?.status === 403) {
        setError('Access denied. You need admin privileges to view this panel.');
      } else {
        setError('Failed to load users. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    const confirmed = await confirm({
      title: 'Delete User',
      message: `Are you sure you want to delete user "${username}"? This action cannot be undone and all their data will be permanently deleted.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'delete',
    });

    if (!confirmed) return;

    try {
      await userService.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusClass = (status: string | undefined) => {
    if (status === 'online') return styles.online;
    if (status === 'away') return styles.away;
    return styles.offline;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`${styles.adminPanel} ${!isDarkMode ? styles.lightMode : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <Shield size={20} />
              </div>
              <div>
                <h2 className={styles.headerTitle}>Admin Panel</h2>
                <p className={styles.headerSubtitle}>User Management Console</p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                style={{ padding: '0 16px 0 44px' }}
              />
            </div>
            <div className={styles.statsBar}>
              <div className={styles.statItem}>
                <Users size={16} className={styles.statIcon} />
                <span className={styles.statValue}>{filteredUsers.length}</span>
                <span className={styles.statLabel}>users</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {error && (
              <div className={styles.errorState}>
                <AlertCircle size={20} className={styles.errorIcon} />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <UserX size={48} className={styles.emptyIcon} />
                <span className={styles.emptyText}>
                  {searchQuery ? 'No users match your search' : 'No users found'}
                </span>
              </div>
            ) : (
              <table className={styles.table}>
                <thead className={styles.tableHead}>
                  <tr className={styles.tableHeadRow}>
                    <th className={styles.tableHeadCell}>User</th>
                    <th className={`${styles.tableHeadCell} ${styles.emailColumn}`}>Email</th>
                    <th className={styles.tableHeadCell}>Status</th>
                    <th className={styles.tableHeadCell}>Actions</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} />
                            ) : (
                              <span className={styles.userInitials}>
                                {getInitials(user.username)}
                              </span>
                            )}
                          </div>
                          <div className={styles.userInfo}>
                            <p className={styles.userName}>{user.username}</p>
                            {user.bio && <p className={styles.userBio}>{user.bio}</p>}
                          </div>
                        </div>
                      </td>
                      <td className={`${styles.tableCell} ${styles.emailColumn}`}>
                        <span className={styles.emailCell}>{user.email}</span>
                      </td>
                      <td className={styles.tableCell}>
                        <span className={`${styles.statusBadge} ${getStatusClass(user.onlineStatus)}`}>
                          <span className={styles.statusDot} />
                          {user.onlineStatus || 'offline'}
                        </span>
                      </td>
                      <td className={styles.tableCell}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleDeleteUser(user.id, user.username)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <footer className={styles.footer}>
            <button
              className={`${styles.footerBtn} ${styles.secondary}`}
              onClick={loadUsers}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
              Refresh
            </button>
            <button className={`${styles.footerBtn} ${styles.primary}`} onClick={onClose}>
              Done
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
