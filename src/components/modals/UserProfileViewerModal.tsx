import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, UserX, UserCheck, Ban, X, Calendar, Mail, Clock } from 'lucide-react';
import type { User } from '../../types/api.types';
import { userService } from '../../services/user.service';
import { useChatStore } from '../../stores/chatStore';
import { confirm } from '../common/ConfirmModal';
import { formatLastSeen } from '../../utils/helpers';

// ============================================================================
// DESIGN SYSTEM - Refined Noir Theme (matches GroupProfileModal)
// ============================================================================
const colors = {
  bg: '#050505',
  surface: '#0a0a0a',
  surfaceElevated: '#0f0f0f',
  surfaceHover: '#151515',
  border: '#1a1a1a',
  borderLight: '#252525',
  primary: '#10b981',
  primaryHover: '#0d9668',
  primaryMuted: 'rgba(16, 185, 129, 0.15)',
  danger: '#ef4444',
  dangerHover: '#dc2626',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
};

// Custom emerald cursor SVG data URLs
const cursorDefault = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M5.5 3.21V20.8l4.75-4.73 2.99 6.73L15.5 21.6l-3-6.7h6z'/%3E%3Cpath fill='%23064e3b' d='M6.5 5.61v11.68l3.38-3.37.37-.37.48 1.07 1.93 4.35 1.07-.47L11.8 14.1l-.48-1.07H16z'/%3E%3C/svg%3E") 5 3, default`;
const cursorPointer = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M9 2.5a2.5 2.5 0 0 1 5 0v7.996l3.904-.74a2.095 2.095 0 0 1 2.537 2.466L19.5 17.5a6 6 0 0 1-6 6H11a7 7 0 0 1-7-7V9a2 2 0 1 1 4 0v3.5h1z'/%3E%3Cpath fill='%23064e3b' d='M10 2.5V14h-.5a1.5 1.5 0 0 1-1.5-1.5V9a1 1 0 1 0-2 0v7.5a6 6 0 0 0 6 6h2.5a5 5 0 0 0 5-5l.941-5.278a1.095 1.095 0 0 0-1.324-1.288l-4.117.78V2.5a1.5 1.5 0 0 0-3 0z'/%3E%3C/svg%3E") 9 4, pointer`;

// Custom green scrollbar and cursor CSS (injected once)
const userScrollbarStyles = `
  /* Custom Emerald Cursor Styles */
  .user-profile-modal-overlay {
    cursor: ${cursorDefault};
  }
  .user-profile-modal-overlay * {
    cursor: inherit;
  }
  .user-profile-modal-overlay button,
  .user-profile-modal-overlay a,
  .user-profile-modal-overlay [role="button"],
  .user-profile-modal-overlay input[type="submit"],
  .user-profile-modal-overlay input[type="button"],
  .user-profile-modal-overlay .clickable {
    cursor: ${cursorPointer};
  }
  .user-profile-modal-overlay input[type="text"],
  .user-profile-modal-overlay input[type="email"],
  .user-profile-modal-overlay input[type="password"],
  .user-profile-modal-overlay input[type="search"],
  .user-profile-modal-overlay textarea {
    cursor: text;
  }

  /* Scrollbar Styles */
  .user-profile-modal-content::-webkit-scrollbar {
    width: 8px;
  }
  .user-profile-modal-content::-webkit-scrollbar-track {
    background: ${colors.surface};
    border-radius: 4px;
  }
  .user-profile-modal-content::-webkit-scrollbar-thumb {
    background: ${colors.primary};
    border-radius: 4px;
    border: 2px solid ${colors.surface};
  }
  .user-profile-modal-content::-webkit-scrollbar-thumb:hover {
    background: ${colors.primaryHover};
  }
`;

// Inject scrollbar styles once
if (typeof document !== 'undefined' && !document.getElementById('user-profile-scrollbar-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'user-profile-scrollbar-styles';
  styleEl.textContent = userScrollbarStyles;
  document.head.appendChild(styleEl);
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 }
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ============================================================================
// TYPES
// ============================================================================
interface UserProfileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSendMessage?: (userId: string) => void;
  onBlockUser?: (userId: string) => void;
  onUnblockUser?: (userId: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const UserProfileViewerModal: React.FC<UserProfileViewerModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSendMessage,
  onBlockUser,
  onUnblockUser,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [isCheckingBlockStatus, setIsCheckingBlockStatus] = useState(false);

  const { isUserOnline, getUserLastSeen, usersYouBlocked, blockedByUsers } = useChatStore();

  useEffect(() => {
    if (isOpen && userId) {
      loadUserProfile();
      checkBlockStatus();
    }
  }, [isOpen, userId]);

  // Subscribe to store's block status changes for real-time updates
  useEffect(() => {
    if (!isOpen || !userId) return;

    const iBlockedInStore = usersYouBlocked.has(userId);
    const blockedByInStore = blockedByUsers.has(userId);

    if (iBlockedInStore !== iBlockedThem) {
      setIBlockedThem(iBlockedInStore);
    }
    if (blockedByInStore !== theyBlockedMe) {
      setTheyBlockedMe(blockedByInStore);
    }
  }, [isOpen, userId, usersYouBlocked, blockedByUsers]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await userService.getUserProfile(userId);
      setUser(profile);
    } catch (err: any) {
      console.error('[UserProfileViewer] Error loading profile:', err);
      setError(err.response?.data?.message || 'Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBlockStatus = async () => {
    setIsCheckingBlockStatus(true);
    try {
      const status = await userService.getMutualBlockStatus(userId);
      setIBlockedThem(status.iBlockedThem);
      setTheyBlockedMe(status.theyBlockedMe);
    } catch (err) {
      console.error('[UserProfileViewer] Error checking block status:', err);
      setIBlockedThem(false);
      setTheyBlockedMe(false);
    } finally {
      setIsCheckingBlockStatus(false);
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
      setIBlockedThem(true);
    }
  };

  const handleUnblock = async () => {
    if (!onUnblockUser) return;

    const confirmed = await confirm({
      title: 'Unblock User',
      message: `Are you sure you want to unblock ${user?.username || 'this user'}? They will be able to message you again.`,
      confirmText: 'Unblock',
      cancelText: 'Cancel',
      variant: 'success',
      icon: 'success',
    });

    if (confirmed) {
      onUnblockUser(userId);
      setIBlockedThem(false);
    }
  };

  const isMessagingBlocked = iBlockedThem || theyBlockedMe;
  const online = user ? isUserOnline(user.id) : false;
  const lastSeen = user ? getUserLastSeen(user.id) : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="user-profile-modal-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              background: colors.surface,
              borderRadius: '16px',
              border: `1px solid ${colors.border}`,
              maxWidth: '420px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: colors.bg,
              }}
            >
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: colors.text,
                letterSpacing: '-0.02em',
              }}>
                User Profile
              </h2>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: colors.surfaceHover }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  color: colors.textMuted,
                }}
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Content */}
            <div
              className="user-profile-modal-content"
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
                  color: colors.textMuted
                }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: `3px solid ${colors.border}`,
                      borderTopColor: colors.primary,
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
                  color: colors.danger,
                  backgroundColor: colors.dangerMuted,
                  borderRadius: '12px',
                }}>
                  {error}
                </div>
              )}

              {!isLoading && !error && user && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Avatar and Basic Info */}
                  <motion.div variants={staggerItem} style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `3px solid ${online ? colors.primary : colors.border}`,
                            boxShadow: online ? `0 0 30px ${colors.primaryMuted}` : 'none',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%)`,
                            color: 'white',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                            fontWeight: 700,
                            boxShadow: `0 0 30px ${colors.primaryMuted}`,
                          }}
                        >
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Online Indicator */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: online ? colors.primary : colors.textMuted,
                          border: `3px solid ${colors.surface}`,
                          boxShadow: online ? `0 0 12px ${colors.primary}` : 'none',
                        }}
                      />
                    </div>

                    <h3 style={{
                      margin: '0 0 8px 0',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: colors.text,
                      letterSpacing: '-0.02em',
                    }}>
                      {user.username}
                    </h3>

                    {/* Online Status Badge */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: online ? colors.primaryMuted : colors.surfaceElevated,
                        border: `1px solid ${online ? `${colors.primary}30` : colors.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: online ? colors.primary : colors.textMuted,
                          boxShadow: online ? `0 0 8px ${colors.primary}` : 'none',
                        }}
                      />
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: online ? colors.primary : colors.textMuted
                      }}>
                        {online ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
                      </span>
                    </div>
                  </motion.div>

                  {/* Bio Section */}
                  <motion.div
                    variants={staggerItem}
                    style={{
                      padding: '16px',
                      background: colors.surfaceElevated,
                      borderRadius: '12px',
                      marginBottom: '16px',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <h4
                      style={{
                        margin: '0 0 10px 0',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: colors.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      About
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '14px',
                      color: user.bio ? colors.textSecondary : colors.textMuted,
                      lineHeight: '1.6',
                      fontStyle: user.bio ? 'normal' : 'italic',
                    }}>
                      {user.bio || 'No bio set'}
                    </p>
                  </motion.div>

                  {/* User Info Cards */}
                  {user.email && (
                    <motion.div
                      variants={staggerItem}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        background: colors.surfaceElevated,
                        borderRadius: '12px',
                        marginBottom: '12px',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: colors.primaryMuted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Mail size={18} color={colors.primary} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>Email</div>
                        <div style={{ fontSize: '14px', color: colors.text, fontWeight: 500 }}>{user.email}</div>
                      </div>
                    </motion.div>
                  )}

                  {user.createdAt && (
                    <motion.div
                      variants={staggerItem}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px 16px',
                        background: colors.surfaceElevated,
                        borderRadius: '12px',
                        marginBottom: '16px',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: colors.primaryMuted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Calendar size={18} color={colors.primary} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>Member Since</div>
                        <div style={{ fontSize: '14px', color: colors.text, fontWeight: 500 }}>
                          {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Block Status Banner */}
                  {!isCheckingBlockStatus && (theyBlockedMe || iBlockedThem) && (
                    <motion.div
                      variants={staggerItem}
                      style={{
                        padding: '14px 16px',
                        background: colors.dangerMuted,
                        borderRadius: '12px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: `1px solid ${colors.danger}30`,
                      }}
                    >
                      <Ban size={20} color={colors.danger} />
                      <span style={{ fontSize: '14px', color: colors.danger, fontWeight: 500 }}>
                        {theyBlockedMe && iBlockedThem
                          ? 'You have blocked each other'
                          : theyBlockedMe
                          ? 'This user has blocked you'
                          : 'You have blocked this user'}
                      </span>
                    </motion.div>
                  )}

                  {/* Actions */}
                  <motion.div variants={staggerItem} style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                    {/* Send Message button */}
                    {onSendMessage && (
                      <motion.button
                        whileHover={!isMessagingBlocked ? { scale: 1.02 } : {}}
                        whileTap={!isMessagingBlocked ? { scale: 0.98 } : {}}
                        onClick={handleSendMessage}
                        disabled={isMessagingBlocked || isCheckingBlockStatus}
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          background: isMessagingBlocked ? colors.surfaceElevated : colors.primary,
                          color: isMessagingBlocked ? colors.textMuted : 'white',
                          border: isMessagingBlocked ? `1px solid ${colors.border}` : 'none',
                          borderRadius: '12px',
                          cursor: isMessagingBlocked ? 'not-allowed' : 'pointer',
                          fontSize: '15px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          opacity: isMessagingBlocked ? 0.6 : 1,
                          boxShadow: isMessagingBlocked ? 'none' : `0 0 20px ${colors.primaryMuted}`,
                        }}
                      >
                        <MessageCircle size={20} />
                        {isMessagingBlocked ? 'Cannot Message' : 'Send Message'}
                      </motion.button>
                    )}

                    {/* Block/Unblock button */}
                    {iBlockedThem ? (
                      onUnblockUser && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleUnblock}
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            background: colors.primaryMuted,
                            color: colors.primary,
                            border: `1px solid ${colors.primary}30`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                          }}
                        >
                          <UserCheck size={20} />
                          Unblock User
                        </motion.button>
                      )
                    ) : (
                      onBlockUser && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleBlock}
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            background: colors.dangerMuted,
                            color: colors.danger,
                            border: `1px solid ${colors.danger}30`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '15px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                          }}
                        >
                          <UserX size={20} />
                          Block User
                        </motion.button>
                      )
                    )}
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
