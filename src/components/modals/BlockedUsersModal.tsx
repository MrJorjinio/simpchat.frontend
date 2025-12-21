import React, { useState, useEffect } from 'react';
import { UserX, X, Unlock } from 'lucide-react';
import { userService } from '../../services/user.service';
import { toast } from '../common/Toast';
import { confirm } from '../common/ConfirmModal';
import { getInitials, fixMinioUrl } from '../../utils/helpers';
import { extractErrorMessage } from '../../utils/errorHandler';

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
  isDarkMode = false,
}) => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBlockedUsers();
    }
  }, [isOpen]);

  const loadBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const data = await userService.getBlockedUsers();
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      toast.error(extractErrorMessage(error, 'Failed to load blocked users'));
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
      variant: 'warning',
    });

    if (!confirmed) return;

    setUnblockingUserId(user.userId);
    try {
      await userService.unblockUser(user.userId);
      setBlockedUsers(prev => prev.filter(u => u.userId !== user.userId));
      toast.success(`${user.username} has been unblocked`);
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error(extractErrorMessage(error, 'Failed to unblock user'));
    } finally {
      setUnblockingUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserX size={20} color="white" />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: isDarkMode ? '#f1f5f9' : '#1e293b',
              }}
            >
              Blocked Users
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px',
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 0',
                color: isDarkMode ? '#94a3b8' : '#64748b',
              }}
            >
              Loading...
            </div>
          ) : blockedUsers.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 0',
                color: isDarkMode ? '#94a3b8' : '#64748b',
              }}
            >
              <UserX size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>
                You haven't blocked any users
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {blockedUsers.map((user) => (
                <div
                  key={user.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
                    borderRadius: '12px',
                    border: `1px solid ${isDarkMode ? '#475569' : '#e2e8f0'}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={fixMinioUrl(user.avatarUrl)}
                        alt={user.username}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#6366f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '16px',
                        }}
                      >
                        {getInitials(user.username)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: isDarkMode ? '#f1f5f9' : '#1e293b',
                        marginBottom: '2px',
                      }}
                    >
                      {user.username}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                      }}
                    >
                      Blocked {new Date(user.blockedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Unblock Button */}
                  <button
                    onClick={() => handleUnblock(user)}
                    disabled={unblockingUserId === user.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: isDarkMode ? '#475569' : '#e2e8f0',
                      color: isDarkMode ? '#f1f5f9' : '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: unblockingUserId === user.userId ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      opacity: unblockingUserId === user.userId ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (unblockingUserId !== user.userId) {
                        e.currentTarget.style.backgroundColor = '#10b981';
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (unblockingUserId !== user.userId) {
                        e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#e2e8f0';
                        e.currentTarget.style.color = isDarkMode ? '#f1f5f9' : '#1e293b';
                      }
                    }}
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
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#cbd5e1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#e2e8f0';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};
