import React, { useEffect, useState } from 'react';
import { userService } from '../services/user.service';
import type { User } from '../types/api.types';
// Toast removed - using visual feedback instead
import { confirm } from './common/ConfirmModal';
import styles from './Dashboard.module.css';

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

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, isDarkMode = false }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

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
      // Reload users
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

  if (!isOpen) return null;

  return (
    <div className={`${styles.modalOverlay} ${isDarkMode ? styles.darkMode : ''}`} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', width: '90%' }}
      >
        <div className={styles.modalHeader}>
          <h2>🔐 Admin Panel - User Management</h2>
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

        <div className={styles.modalBody} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                border: '1px solid rgba(211, 47, 47, 0.3)',
                borderRadius: '6px',
                color: '#d32f2f',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.formInput}
              style={{ margin: 0 }}
            />
          </div>

          {isLoading ? (
            <div className={styles.loadingState}>Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--background)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  color: 'var(--text)',
                }}
              >
                Total Users: {filteredUsers.length}
              </div>

              {/* Users Table */}
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: 'var(--surface)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: 'var(--background)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>User</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--background)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--accent)',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 600,
                                  fontSize: '14px',
                                }}
                              >
                                {getInitials(user.username)}
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{user.username}</div>
                              {user.bio && (
                                <div
                                  style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {user.bio}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor:
                                user.onlineStatus === 'online'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : user.onlineStatus === 'away'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(107, 114, 128, 0.15)',
                              color:
                                user.onlineStatus === 'online'
                                  ? '#10b981'
                                  : user.onlineStatus === 'away'
                                  ? '#f59e0b'
                                  : '#6b7280',
                            }}
                          >
                            {user.onlineStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '0.9';
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={loadUsers} className={styles.secondaryButton} disabled={isLoading}>
            🔄 Refresh
          </button>
          <button onClick={onClose} className={styles.primaryButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
