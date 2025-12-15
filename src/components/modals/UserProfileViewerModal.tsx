import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, UserX, Sparkles } from 'lucide-react';
import type { User } from '../../types/api.types';
import { userService } from '../../services/user.service';
import { useChatStore } from '../../stores/chatStore';
import { confirm } from '../common/ConfirmModal';

interface UserProfileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSendMessage?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
}

export const UserProfileViewerModal: React.FC<UserProfileViewerModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSendMessage,
  onBlockUser,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isUserOnline } = useChatStore();

  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await userService.getUserProfile(userId);
      setUser(profile);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (onSendMessage) {
      onSendMessage(userId);
      onClose();
    }
  };

  const handleBlock = async () => {
    if (!onBlockUser) return;

    const confirmed = await confirm({
      title: 'Block User',
      message: `Are you sure you want to block ${user?.username || 'this user'}? They won't be able to message you.`,
      confirmText: 'Block',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      onBlockUser(userId);
      onClose();
    }
  };

  const online = user ? isUserOnline(user.id) : false;

  // Custom scrollbar styles
  const scrollbarStyles = `
    .userProfileScrollContainer::-webkit-scrollbar {
      width: 6px;
    }
    .userProfileScrollContainer::-webkit-scrollbar-track {
      background: rgba(99, 102, 241, 0.1);
      border-radius: 3px;
    }
    .userProfileScrollContainer::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
      border-radius: 3px;
    }
    .userProfileScrollContainer::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #764ba2 0%, #667eea 100%);
    }
  `;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={onClose}
        >
          <style>{scrollbarStyles}</style>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            style={{
              background: '#1e293b',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: '#f1f5f9',
              }}>
                User Profile
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                <X size={22} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div
              className="userProfileScrollContainer"
              style={{
                overflowY: 'auto',
                flex: 1,
                padding: '24px',
              }}
            >
              {isLoading && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#94a3b8'
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid rgba(99, 102, 241, 0.2)',
                      borderTopColor: '#818cf8',
                      borderRadius: '50%',
                      margin: '0 auto 16px',
                    }}
                  />
                  Loading profile...
                </div>
              )}

              {error && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#f87171'
                }}>
                  {error}
                </div>
              )}

              {!isLoading && !error && user && (
                <>
                  {/* Avatar and Basic Info */}
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '3px solid rgba(255, 255, 255, 0.1)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100px',
                            height: '100px',
                            borderRadius: '50%',
                            background: '#6366f1',
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                            fontWeight: 600,
                          }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Online status */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: online ? '#22c55e' : '#64748b',
                          border: '3px solid #1e293b',
                        }}
                      />
                    </div>

                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '20px',
                      fontWeight: 600,
                      color: '#f1f5f9'
                    }}>
                      {user.username}
                    </h3>

                    {/* Online Status */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        background: online ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: online ? '#22c55e' : '#64748b',
                        }}
                      />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: online ? '#4ade80' : '#94a3b8'
                      }}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        About
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#cbd5e1',
                        lineHeight: '1.5'
                      }}>
                        {user.bio}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                    {onSendMessage && (
                      <button
                        onClick={handleSendMessage}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: '#6366f1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#5558e3'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#6366f1'}
                      >
                        <MessageCircle size={18} />
                        Send Message
                      </button>
                    )}
                    {onBlockUser && (
                      <button
                        onClick={handleBlock}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      >
                        <UserX size={18} />
                        Block User
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
