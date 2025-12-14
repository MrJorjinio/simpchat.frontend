import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, UserX, Mail, Shield, Users, Sparkles } from 'lucide-react';
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
  const [sharedChats, setSharedChats] = useState<any[]>([]);

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

  useEffect(() => {
    const loadSharedChats = async () => {
      if (!user) return;

      try {
        const chatStore = useChatStore.getState();
        const allChats = chatStore.chats;

        const shared = allChats.filter(chat =>
          chat.type !== 'dm' &&
          chat.members?.some(m => m.userId === userId)
        );

        setSharedChats(shared);
      } catch (error) {
        console.error('Failed to load shared chats:', error);
      }
    };

    if (user) {
      loadSharedChats();
    }
  }, [user, userId]);

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
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.7) 100%)',
            backdropFilter: 'blur(12px)',
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
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.95))',
              borderRadius: '24px',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.2)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <Sparkles size={20} color="white" />
                </div>
                <h2 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  User Profile
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a5b4fc',
                  transition: 'all 0.2s ease',
                }}
              >
                <X size={20} />
              </motion.button>
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
                  <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '4px solid rgba(99, 102, 241, 0.3)',
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                            fontWeight: 700,
                            border: '4px solid rgba(99, 102, 241, 0.3)',
                            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
                          }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Online status overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: online ? '#22c55e' : '#64748b',
                          border: '3px solid rgba(30, 41, 59, 0.95)',
                          boxShadow: online ? '0 0 12px rgba(34, 197, 94, 0.5)' : 'none',
                        }}
                      />
                    </motion.div>

                    <motion.h3
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      style={{
                        margin: '0 0 8px 0',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#f1f5f9'
                      }}
                    >
                      {user.username}
                    </motion.h3>

                    {/* Online Status */}
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: online
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))'
                          : 'rgba(100, 116, 139, 0.2)',
                        border: `1px solid ${online ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: online ? '#22c55e' : '#64748b',
                          boxShadow: online ? '0 0 8px rgba(34, 197, 94, 0.6)' : 'none',
                        }}
                      />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: online ? '#4ade80' : '#94a3b8'
                      }}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </motion.div>
                  </div>

                  {/* Bio */}
                  {user.bio && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: '16px',
                        marginBottom: '20px',
                      }}
                    >
                      <h4
                        style={{
                          margin: '0 0 10px 0',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#818cf8',
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
                        lineHeight: '1.6'
                      }}>
                        {user.bio}
                      </p>
                    </motion.div>
                  )}

                  {/* Stats Row */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px',
                      marginBottom: '20px',
                    }}
                  >
                    {/* Email */}
                    {user.email && (
                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Mail size={16} color="white" />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                            EMAIL
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#e2e8f0',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Privacy Policy */}
                    {user.addMePolicy && (
                      <div
                        style={{
                          padding: '14px',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.15)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Shield size={16} color="white" />
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>
                            ADD POLICY
                          </div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
                            {user.addMePolicy}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Shared Chats */}
                  {sharedChats && sharedChats.length > 0 && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.35 }}
                      style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.15)',
                        borderRadius: '16px',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}>
                        <Users size={16} color="#818cf8" />
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#818cf8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {sharedChats.length} Shared {sharedChats.length === 1 ? 'Chat' : 'Chats'}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sharedChats.slice(0, 3).map((chat, idx) => (
                          <motion.div
                            key={chat.id}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              borderRadius: '10px',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                              e.currentTarget.style.transform = 'translateX(4px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            <span style={{ fontSize: '16px' }}>{chat.type === 'group' ? '👥' : '📢'}</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                              {chat.name}
                            </span>
                          </motion.div>
                        ))}
                        {sharedChats.length > 3 && (
                          <div style={{
                            fontSize: '12px',
                            color: '#64748b',
                            textAlign: 'center',
                            padding: '4px'
                          }}>
                            +{sharedChats.length - 3} more
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}
                  >
                    {onSendMessage && (
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSendMessage}
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <MessageCircle size={20} />
                        Send Message
                      </motion.button>
                    )}
                    {onBlockUser && (
                      <motion.button
                        whileHover={{ scale: 1.02, background: 'rgba(239, 68, 68, 0.2)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleBlock}
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '14px',
                          cursor: 'pointer',
                          fontSize: '15px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <UserX size={20} />
                        Block User
                      </motion.button>
                    )}
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
