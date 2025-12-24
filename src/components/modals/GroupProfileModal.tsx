import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Calendar, Crown, Shield, Edit2, Trash2, LogOut,
  Key, UserPlus, Ban, X, Lock, Globe, Search, Radio,
  ChevronRight, UserMinus, Eye, Check, AlertCircle,
  Loader2, User
} from 'lucide-react';
import type { Chat, ChatMember } from '../../types/api.types';
import { chatService } from '../../services/chat.service';
import { userService } from '../../services/user.service';
import { useChatStore } from '../../stores/chatStore';
import { signalRService } from '../../services/signalr.service';
import { usePermissions } from '../../hooks/usePermission';
import { formatLastSeen, getInitials, fixMinioUrl } from '../../utils/helpers';
import { confirm } from '../common/ConfirmModal';
import { isBanError, getBanErrorMessage, extractErrorMessage } from '../../utils/errorHandler';
import { PermissionModal } from './PermissionModal';

// ============================================================================
// DESIGN SYSTEM - Refined Noir Theme with Emerald Accents
// ============================================================================
const colors = {
  // Backgrounds - Deep noir palette
  bg: '#030303',
  surface: '#080808',
  surfaceElevated: '#0c0c0c',
  surfaceHover: '#121212',
  surfaceActive: '#181818',

  // Borders - Subtle definition
  border: '#1a1a1a',
  borderLight: '#222222',
  borderFocus: '#10b981',

  // Primary - Emerald accent
  primary: '#10b981',
  primaryHover: '#0d9668',
  primaryMuted: 'rgba(16, 185, 129, 0.12)',
  primaryGlow: 'rgba(16, 185, 129, 0.25)',

  // Semantic colors
  danger: '#ef4444',
  dangerHover: '#dc2626',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.12)',
  info: '#3b82f6',
  infoMuted: 'rgba(59, 130, 246, 0.12)',

  // Text hierarchy
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textDisabled: '#52525b',

  // Online status
  online: '#22c55e',
  offline: '#71717a',
};

// Custom emerald cursor SVG data URLs
const cursorDefault = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M5.5 3.21V20.8l4.75-4.73 2.99 6.73L15.5 21.6l-3-6.7h6z'/%3E%3Cpath fill='%23064e3b' d='M6.5 5.61v11.68l3.38-3.37.37-.37.48 1.07 1.93 4.35 1.07-.47L11.8 14.1l-.48-1.07H16z'/%3E%3C/svg%3E") 4 2, default`;
const cursorPointer = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M9 2.5a2.5 2.5 0 0 1 5 0v7.996l3.904-.74a2.095 2.095 0 0 1 2.537 2.466L19.5 17.5a6 6 0 0 1-6 6H11a7 7 0 0 1-7-7V9a2 2 0 1 1 4 0v3.5h1z'/%3E%3Cpath fill='%23064e3b' d='M10 2.5V14h-.5a1.5 1.5 0 0 1-1.5-1.5V9a1 1 0 1 0-2 0v7.5a6 6 0 0 0 6 6h2.5a5 5 0 0 0 5-5l.941-5.278a1.095 1.095 0 0 0-1.324-1.288l-4.117.78V2.5a1.5 1.5 0 0 0-3 0z'/%3E%3C/svg%3E") 7 3, pointer`;

// Inject global styles once
const globalStyleId = 'group-profile-modal-styles';
if (typeof document !== 'undefined' && !document.getElementById(globalStyleId)) {
  const styleEl = document.createElement('style');
  styleEl.id = globalStyleId;
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    .gpm-overlay {
      cursor: ${cursorDefault};
    }
    .gpm-overlay * {
      cursor: inherit;
    }
    .gpm-overlay button,
    .gpm-overlay a,
    .gpm-overlay [role="button"],
    .gpm-overlay .gpm-clickable {
      cursor: ${cursorPointer} !important;
    }
    .gpm-overlay input[type="text"],
    .gpm-overlay input[type="search"],
    .gpm-overlay textarea {
      cursor: text !important;
    }

    .gpm-scrollable::-webkit-scrollbar {
      width: 6px;
    }
    .gpm-scrollable::-webkit-scrollbar-track {
      background: transparent;
    }
    .gpm-scrollable::-webkit-scrollbar-thumb {
      background: ${colors.primary};
      border-radius: 3px;
    }
    .gpm-scrollable::-webkit-scrollbar-thumb:hover {
      background: ${colors.primaryHover};
    }

    .gpm-scrollable {
      scrollbar-width: thin;
      scrollbar-color: ${colors.primary} transparent;
    }

    @keyframes gpm-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes gpm-glow {
      0%, 100% { box-shadow: 0 0 20px ${colors.primaryGlow}; }
      50% { box-shadow: 0 0 40px ${colors.primaryGlow}; }
    }

    @keyframes matrix-fall {
      0% { transform: translateY(-100%); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(100%); opacity: 0; }
    }

    @keyframes matrix-flicker {
      0%, 100% { opacity: 0.1; }
      50% { opacity: 0.4; }
    }

    @keyframes matrix-glow-pulse {
      0%, 100% { filter: brightness(1) drop-shadow(0 0 2px ${colors.primary}); }
      50% { filter: brightness(1.5) drop-shadow(0 0 6px ${colors.primary}); }
    }

    .matrix-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      grid-template-rows: repeat(8, 1fr);
      gap: 2px;
      position: absolute;
      inset: 0;
      padding: 8px;
      overflow: hidden;
    }

    .matrix-cell {
      background: ${colors.primary};
      opacity: 0.18;
      border-radius: 2px;
      transition: all 0.2s ease;
      animation: matrix-flicker 2s ease-in-out infinite;
      animation-delay: calc(var(--cell-index) * 0.02s);
    }

    .matrix-cell:nth-child(3n) {
      opacity: 0.32;
      animation-duration: 1.5s;
      box-shadow: 0 0 3px ${colors.primary};
    }

    .matrix-cell:nth-child(5n) {
      opacity: 0.42;
      animation-duration: 1.8s;
      box-shadow: 0 0 4px ${colors.primary};
    }

    .matrix-cell:nth-child(7n+1) {
      opacity: 0.25;
      animation-duration: 2.2s;
    }

    .matrix-cell:nth-child(11n) {
      opacity: 0.55;
      box-shadow: 0 0 6px ${colors.primary}, 0 0 10px ${colors.primary};
      animation-duration: 1.2s;
    }

    .matrix-rain {
      position: absolute;
      width: 2px;
      background: linear-gradient(to bottom, transparent, ${colors.primary}, transparent);
      pointer-events: none;
      animation: matrix-fall 2s linear infinite;
    }

    .avatar-wrapper {
      animation: matrix-glow-pulse 3s ease-in-out infinite;
    }
  `;
  document.head.appendChild(styleEl);
}

// ============================================================================
// ANIMATION VARIANTS - Fast and snappy
// ============================================================================
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: 'easeIn' as const } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15, ease: 'easeOut' as const }
  },
  exit: { opacity: 0, scale: 0.98, y: 5, transition: { duration: 0.1, ease: 'easeIn' as const } },
};

// No stagger - instant content appearance
const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const staggerItem = {
  hidden: { opacity: 1, x: 0 },
  visible: { opacity: 1, x: 0 },
};

// Fast section transitions - minimal animation
const slideIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.08, ease: 'easeIn' as const } },
};

// ============================================================================
// TYPES
// ============================================================================
interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUserId: string;
  onEditGroup?: () => void;
  onDeleteGroup?: () => void;
  onLeaveGroup?: () => void;
  onKickMember?: (userId: string) => void;
  onViewUserProfile?: (userId: string) => void;
  onBanMember?: (userId: string) => Promise<void>;
  onUnbanMember?: (userId: string) => Promise<void>;
  onUpdatePrivacy?: (privacy: 'public' | 'private') => Promise<void>;
  fancyAnimations?: boolean;
}

interface ChatProfile {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdAt: string;
  members: ChatMember[];
  privacy?: 'public' | 'private';
}

interface BannedUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  bannedAt: string;
}

type ViewMode = 'main' | 'members' | 'banned' | 'addMember';
type FeedbackType = 'success' | 'error' | 'info' | null;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Inline Feedback Component (replaces toasts)
const InlineFeedback: React.FC<{
  type: FeedbackType;
  message: string;
  onDismiss: () => void;
}> = ({ type, message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!type) return null;

  const bgColor = type === 'success' ? colors.primaryMuted :
                  type === 'error' ? colors.dangerMuted : colors.infoMuted;
  const textColor = type === 'success' ? colors.primary :
                    type === 'error' ? colors.danger : colors.info;
  const Icon = type === 'success' ? Check : type === 'error' ? AlertCircle : Eye;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -5, height: 0 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      style={{
        background: bgColor,
        borderRadius: 8,
        padding: '10px 14px',
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: `1px solid ${textColor}20`,
      }}
    >
      <Icon size={16} color={textColor} style={{ flexShrink: 0, minWidth: 16 }} />
      <span style={{ flex: 1, fontSize: 13, color: textColor, fontWeight: 500 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          display: 'flex',
          color: textColor,
          opacity: 0.7,
        }}
        className="gpm-clickable"
      >
        <X size={14} style={{ flexShrink: 0, minWidth: 14 }} />
      </button>
    </motion.div>
  );
};

// Privacy Badge Component
const PrivacyBadge: React.FC<{ privacy: 'public' | 'private'; size?: 'sm' | 'md' }> = ({
  privacy,
  size = 'md'
}) => {
  const isPublic = privacy === 'public';
  const iconSize = size === 'sm' ? 12 : 14;
  const padding = size === 'sm' ? '4px 8px' : '6px 12px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        borderRadius: 20,
        background: isPublic ? colors.primaryMuted : colors.warningMuted,
        border: `1px solid ${isPublic ? colors.primary : colors.warning}30`,
      }}
    >
      {isPublic ? (
        <Globe size={iconSize} color={colors.primary} style={{ flexShrink: 0, minWidth: iconSize }} />
      ) : (
        <Lock size={iconSize} color={colors.warning} style={{ flexShrink: 0, minWidth: iconSize }} />
      )}
      <span style={{
        fontSize,
        fontWeight: 600,
        color: isPublic ? colors.primary : colors.warning,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {isPublic ? 'Public' : 'Private'}
      </span>
    </div>
  );
};

// Role Badge Component
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const config = {
    admin: { icon: Crown, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', label: 'Admin' },
    moderator: { icon: Shield, color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', label: 'Mod' },
    member: { icon: User, color: colors.textMuted, bg: colors.surfaceHover, label: 'Member' },
  }[role] || { icon: User, color: colors.textMuted, bg: colors.surfaceHover, label: role };

  const IconComponent = config.icon;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 4,
        background: config.bg,
        border: `1px solid ${config.color}20`,
      }}
    >
      <IconComponent size={11} color={config.color} style={{ flexShrink: 0, minWidth: 11 }} />
      <span style={{ fontSize: 10, fontWeight: 600, color: config.color, textTransform: 'uppercase' }}>
        {config.label}
      </span>
    </div>
  );
};

// Matrix Background Component - Full panel background
const MatrixBackground: React.FC<{ children: React.ReactNode; enabled?: boolean }> = ({ children, enabled = true }) => {
  const cellCount = 180; // 15x12 grid for full panel
  const rainDrops = 12;

  return (
    <div
      className="matrix-container"
      style={{
        position: 'relative',
        margin: '-20px -20px 24px -20px',
        padding: '28px 20px',
        borderRadius: '0 0 16px 16px',
        background: `linear-gradient(180deg, ${colors.bg} 0%, ${colors.surface} 100%)`,
        overflow: 'hidden',
      }}
    >
      {/* Matrix Grid - Full background (only when enabled) */}
      {enabled && (
        <div
          className="matrix-grid"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(15, 1fr)',
            gridTemplateRows: 'repeat(12, 1fr)',
            gap: 3,
            padding: 10,
            opacity: 0.8,
          }}
        >
          {Array.from({ length: cellCount }).map((_, i) => (
            <div
              key={i}
              className="matrix-cell"
              style={{ '--cell-index': i } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Rain drops (only when enabled) */}
      {enabled && Array.from({ length: rainDrops }).map((_, i) => (
        <div
          key={`rain-${i}`}
          className="matrix-rain"
          style={{
            left: `${5 + (i * 8)}%`,
            height: '40%',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}

      {/* Content wrapper */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
        }}
      >
        {children}
      </div>

      {/* Top glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60%',
          background: `radial-gradient(ellipse at 50% 0%, ${colors.primary}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          background: `linear-gradient(to top, ${colors.surface}, transparent)`,
          pointerEvents: 'none',
        }}
      />

      {/* Border glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '0 0 16px 16px',
          border: `1px solid ${colors.primary}20`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

// Member Card Component
const MemberCard: React.FC<{
  member: ChatMember;
  isOnline: boolean;
  lastSeen?: string;
  isCurrentUser: boolean;
  canManage: boolean;
  onViewProfile?: () => void;
  onKick?: () => void;
  onBan?: () => void;
  onManagePermissions?: () => void;
}> = ({ member, isOnline, lastSeen, isCurrentUser, canManage, onViewProfile, onKick, onBan, onManagePermissions }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      variants={staggerItem}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px',
        background: colors.surfaceElevated,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        transition: 'background 0.1s, border-color 0.1s',
        position: 'relative',
      }}
      whileHover={{
        background: colors.surfaceHover,
        borderColor: colors.borderLight,
        transition: { duration: 0.1 },
      }}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div
        className="gpm-clickable"
        onClick={onViewProfile}
        style={{ position: 'relative', marginRight: 12 }}
      >
        {member.user.avatar ? (
          <img
            src={fixMinioUrl(member.user.avatar)}
            alt={member.user.username}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: `2px solid ${isOnline ? colors.online : colors.border}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.primary}40, ${colors.primary}20)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${isOnline ? colors.online : colors.border}`,
              color: colors.primary,
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            {getInitials(member.user.username)}
          </div>
        )}
        {/* Online indicator dot */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: isOnline ? colors.online : colors.offline,
            border: `2px solid ${colors.surfaceElevated}`,
          }}
        />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span
            className="gpm-clickable"
            onClick={onViewProfile}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {member.user.username}
            {isCurrentUser && <span style={{ color: colors.textMuted, fontWeight: 400 }}> (you)</span>}
          </span>
          <RoleBadge role={member.role} />
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted }}>
          {isOnline ? (
            <span style={{ color: colors.online }}>● Online</span>
          ) : lastSeen ? (
            `Last seen ${formatLastSeen(lastSeen)}`
          ) : (
            'Offline'
          )}
        </div>
      </div>

      {/* Actions */}
      <AnimatePresence>
        {showActions && canManage && !isCurrentUser && member.role !== 'admin' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            style={{ display: 'flex', gap: 6 }}
          >
            {onManagePermissions && (
              <button
                onClick={onManagePermissions}
                className="gpm-clickable"
                title="Manage Permissions"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  background: colors.infoMuted,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.info,
                  transition: 'all 0.15s',
                }}
              >
                <Key size={16} strokeWidth={2.5} style={{ flexShrink: 0, minWidth: 16 }} />
              </button>
            )}
            {onKick && (
              <button
                onClick={onKick}
                className="gpm-clickable"
                title="Remove Member"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  background: colors.warningMuted,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.warning,
                  transition: 'all 0.15s',
                }}
              >
                <UserMinus size={16} strokeWidth={2.5} style={{ flexShrink: 0, minWidth: 16 }} />
              </button>
            )}
            {onBan && (
              <button
                onClick={onBan}
                className="gpm-clickable"
                title="Ban Member"
                style={{
                  width: 32,
                  height: 32,
                  padding: 0,
                  borderRadius: 6,
                  background: colors.dangerMuted,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.danger,
                  transition: 'all 0.15s',
                }}
              >
                <Ban size={16} strokeWidth={2.5} style={{ flexShrink: 0, minWidth: 16 }} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'primary';
  disabled?: boolean;
  loading?: boolean;
}> = ({ icon, label, onClick, variant = 'default', disabled, loading }) => {
  const bgColor = variant === 'danger' ? colors.dangerMuted :
                  variant === 'primary' ? colors.primaryMuted : colors.surfaceHover;
  const textColor = variant === 'danger' ? colors.danger :
                    variant === 'primary' ? colors.primary : colors.text;
  const hoverBg = variant === 'danger' ? colors.danger :
                  variant === 'primary' ? colors.primary : colors.surfaceActive;
  const hoverText = variant === 'danger' || variant === 'primary' ? '#fff' : colors.text;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className="gpm-clickable"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '12px 16px',
        background: bgColor,
        border: `1px solid ${textColor}20`,
        borderRadius: 10,
        color: textColor,
        fontSize: 14,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.1s, color 0.1s',
      }}
      whileHover={!disabled ? {
        background: hoverBg,
        color: hoverText,
        transition: { duration: 0.1 },
      } : {}}
      whileTap={!disabled ? { scale: 0.98, transition: { duration: 0.05 } } : {}}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      <span>{label}</span>
      <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.5, flexShrink: 0, minWidth: 16 }} />
    </motion.button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const GroupProfileModal: React.FC<GroupProfileModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUserId,
  onEditGroup,
  onDeleteGroup,
  onLeaveGroup,
  onKickMember,
  onViewUserProfile,
  onBanMember,
  onUnbanMember,
  onUpdatePrivacy,
  fancyAnimations = true,
}) => {
  // State
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [isLoadingBannedUsers, setIsLoadingBannedUsers] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string }>({ type: null, message: '' });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMemberForPermissions, setSelectedMemberForPermissions] = useState<ChatMember | null>(null);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  const { isUserOnline, getUserLastSeen, loadChats, setInitialPresenceStates } = useChatStore();
  const { canAddUsers, canManageChatInfo, canManageBans, canManageUsers } = usePermissions(chat?.id);

  // Derived state
  const currentMember = profile?.members.find(m => m.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';
  const isMember = profile?.members.some(m => m.userId === currentUserId);
  const onlineCount = profile?.members.filter(m => isUserOnline(m.userId)).length || 0;

  // Filtered members
  const filteredMembers = profile?.members.filter(member => {
    if (!memberSearchQuery.trim()) return true;
    const query = memberSearchQuery.toLowerCase();
    return member.user.username.toLowerCase().includes(query) ||
           member.user.email?.toLowerCase().includes(query);
  }) || [];

  // Show feedback helper
  const showFeedback = (type: FeedbackType, message: string) => {
    setFeedback({ type, message });
  };

  // Load profile
  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profileData = await chatService.getChatProfile(chat.id);
      setProfile(profileData as ChatProfile);

      const memberIds = (profileData as ChatProfile).members?.map(m => m.userId) || [];
      if (memberIds.length > 0) {
        try {
          const presenceStates = await signalRService.getPresenceStates(memberIds);
          if (Object.keys(presenceStates).length > 0) {
            setInitialPresenceStates(presenceStates);
          }
        } catch (e) {
          console.error('Failed to fetch presence:', e);
        }
      }
    } catch (err: any) {
      showFeedback('error', err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Load banned users
  const loadBannedUsers = async () => {
    if (!chat?.id || (!isAdmin && !canManageBans)) return;
    setIsLoadingBannedUsers(true);
    try {
      const banned = await chatService.getBannedUsers(chat.id);
      setBannedUsers(banned);
    } catch (e) {
      showFeedback('error', 'Failed to load banned users');
    } finally {
      setIsLoadingBannedUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen && chat.id) {
      setIsBanned(false);
      setViewMode('main');
      loadProfile();
    }
  }, [isOpen, chat.id]);

  // Sync profile with chat prop updates (for immediate UI feedback after edits)
  useEffect(() => {
    if (profile && chat && isOpen) {
      // Update profile if chat was edited (name, description, or avatar changed)
      const needsUpdate =
        chat.name !== profile.name ||
        chat.description !== profile.description ||
        chat.avatar !== profile.avatar;

      if (needsUpdate) {
        setProfile(prev => prev ? {
          ...prev,
          name: chat.name || prev.name,
          description: chat.description ?? prev.description,
          avatar: chat.avatar ?? prev.avatar,
        } : null);
      }
    }
  }, [chat.name, chat.description, chat.avatar, isOpen]);

  useEffect(() => {
    if (viewMode === 'banned' && (isAdmin || canManageBans)) {
      loadBannedUsers();
    }
  }, [viewMode, isAdmin, canManageBans]);

  // Handlers
  const handleJoin = async () => {
    if (!chat || !chat.type) return;
    setIsJoining(true);
    try {
      await chatService.joinChat(chat.id, chat.type as 'group' | 'channel');
      showFeedback('success', `Successfully joined the ${chat.type}!`);
      await loadChats();
      await loadProfile();
    } catch (error: any) {
      if (isBanError(error)) {
        setIsBanned(true);
        showFeedback('error', getBanErrorMessage(error));
      } else {
        showFeedback('error', extractErrorMessage(error, 'Failed to join'));
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleKick = async (userId: string) => {
    if (!onKickMember) return;
    const member = profile?.members.find(m => m.userId === userId);
    const confirmed = await confirm({
      title: 'Remove Member',
      message: `Remove ${member?.user.username || 'this member'} from the ${chat.type}?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      setProfile(prev => prev ? {
        ...prev,
        members: prev.members.filter(m => m.userId !== userId)
      } : null);
      showFeedback('success', `${member?.user.username} has been removed`);
      onKickMember(userId);
    }
  };

  const handleBan = async (userId: string) => {
    if (!onBanMember) return;
    const member = profile?.members.find(m => m.userId === userId);
    const confirmed = await confirm({
      title: 'Ban Member',
      message: `Ban ${member?.user.username || 'this member'}? They won't be able to rejoin.`,
      confirmText: 'Ban',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      // Add to banned users list immediately for instant UI feedback
      if (member) {
        const newBannedUser: BannedUser = {
          userId: member.userId,
          username: member.user.username,
          avatarUrl: member.user.avatar,
          bannedAt: new Date().toISOString(),
        };
        setBannedUsers(prev => [...prev, newBannedUser]);
      }

      // Remove from members list
      setProfile(prev => prev ? {
        ...prev,
        members: prev.members.filter(m => m.userId !== userId)
      } : null);
      showFeedback('success', `${member?.user.username} has been banned`);
      await onBanMember(userId);
    }
  };

  const handleUnban = async (userId: string, username: string) => {
    if (!onUnbanMember) return;
    const confirmed = await confirm({
      title: 'Unban User',
      message: `Unban ${username}? They will be able to rejoin.`,
      confirmText: 'Unban',
      cancelText: 'Cancel',
      variant: 'info',
    });
    if (confirmed) {
      try {
        await onUnbanMember(userId);
        setBannedUsers(prev => prev.filter(u => u.userId !== userId));
        showFeedback('success', `${username} has been unbanned`);
      } catch (e) {
        showFeedback('error', 'Failed to unban user');
      }
    }
  };

  const handlePrivacyToggle = async () => {
    if (!onUpdatePrivacy || !profile) return;
    const newPrivacy = profile.privacy === 'public' ? 'private' : 'public';
    const confirmed = await confirm({
      title: `Make ${chat.type} ${newPrivacy}?`,
      message: newPrivacy === 'private'
        ? 'Only invited members will be able to join.'
        : 'Anyone can find and join this chat.',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      variant: 'info',
    });
    if (confirmed) {
      setIsUpdatingPrivacy(true);
      try {
        await onUpdatePrivacy(newPrivacy);
        setProfile(prev => prev ? { ...prev, privacy: newPrivacy } : null);
        // No success notification - the UI update (privacy badge) is enough feedback
      } catch (e) {
        showFeedback('error', 'Failed to update privacy');
      } finally {
        setIsUpdatingPrivacy(false);
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (!onLeaveGroup) return;
    const isChannel = chat.type === 'channel';
    const confirmed = await confirm({
      title: `Leave ${isChannel ? 'Channel' : 'Group'}?`,
      message: `Are you sure you want to leave "${profile?.name || chat.name}"? You can rejoin later if it's public.`,
      confirmText: 'Leave',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      onLeaveGroup();
    }
  };

  const handleDeleteGroup = async () => {
    if (!onDeleteGroup) return;
    const isChannel = chat.type === 'channel';
    const confirmed = await confirm({
      title: `Delete ${isChannel ? 'Channel' : 'Group'}?`,
      message: `Are you sure you want to permanently delete "${profile?.name || chat.name}"? This action cannot be undone and all messages will be lost.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      onDeleteGroup();
    }
  };

  // Debounced user search effect
  useEffect(() => {
    if (!addMemberQuery.trim()) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    setIsSearchingUsers(true);
    const debounceTimer = setTimeout(async () => {
      try {
        const results = await userService.searchUsers(addMemberQuery.trim());
        const memberIds = new Set(profile?.members?.map(m => m.userId) || []);
        setUserSearchResults(results.filter((u: any) => !memberIds.has(u.id)));
      } catch (e) {
        console.error('Search failed:', e);
        setUserSearchResults([]);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [addMemberQuery, profile?.members]);

  const handleAddMember = async (userId: string) => {
    try {
      if (chat.type === 'group') {
        await chatService.addMemberToGroup(chat.id, userId);
      } else {
        await chatService.addMemberToChannel(chat.id, userId);
      }
      showFeedback('success', 'Member added successfully');
      setAddMemberQuery('');
      setUserSearchResults([]);
      await loadProfile();
    } catch (e: any) {
      showFeedback('error', extractErrorMessage(e, 'Failed to add member'));
    }
  };

  const isChannel = chat.type === 'channel';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="gpm-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20,
            }}
          >
            <motion.div
              variants={modalVariants}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 520,
                maxHeight: '85vh',
                background: colors.surface,
                borderRadius: 16,
                border: `1px solid ${colors.border}`,
                boxShadow: `0 0 0 1px ${colors.border}, 0 25px 80px -20px rgba(0, 0, 0, 0.8)`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: colors.bg,
                }}
              >
                {viewMode !== 'main' && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    whileHover={{ backgroundColor: colors.surfaceActive, transition: { duration: 0.1 } }}
                    whileTap={{ scale: 0.95, transition: { duration: 0.05 } }}
                    onClick={() => setViewMode('main')}
                    className="gpm-clickable"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: colors.surfaceHover,
                      border: `1px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.text,
                    }}
                  >
                    <ChevronRight size={18} style={{ transform: 'rotate(180deg)', flexShrink: 0, minWidth: 18 }} />
                  </motion.button>
                )}
                <div style={{ flex: 1 }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.text,
                    letterSpacing: '-0.01em',
                  }}>
                    {viewMode === 'main' && `${isChannel ? 'Channel' : 'Group'} Profile`}
                    {viewMode === 'members' && 'Members'}
                    {viewMode === 'banned' && 'Banned Users'}
                    {viewMode === 'addMember' && 'Add Member'}
                  </h2>
                </div>
                <motion.button
                  whileHover={{ backgroundColor: colors.surfaceActive, transition: { duration: 0.1 } }}
                  whileTap={{ scale: 0.95, transition: { duration: 0.05 } }}
                  onClick={onClose}
                  className="gpm-clickable"
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    borderRadius: 8,
                    background: colors.surfaceHover,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textMuted,
                    transition: 'background 0.1s',
                  }}
                >
                  <X size={16} style={{ flexShrink: 0, minWidth: 16 }} />
                </motion.button>
              </div>

              {/* Content */}
              <div
                className="gpm-scrollable"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 20,
                }}
              >
                <AnimatePresence>
                  {feedback.type && (
                    <InlineFeedback
                      type={feedback.type}
                      message={feedback.message}
                      onDismiss={() => setFeedback({ type: null, message: '' })}
                    />
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 60,
                      gap: 16,
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 size={32} color={colors.primary} />
                    </motion.div>
                    <span style={{ color: colors.textMuted, fontSize: 14 }}>Loading...</span>
                  </motion.div>
                ) : viewMode === 'main' ? (
                  <motion.div
                    key="main"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    {/* Profile Header with Matrix Background */}
                    <motion.div variants={staggerItem}>
                      <MatrixBackground enabled={fancyAnimations}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            margin: '0 auto 16px',
                            background: profile?.avatar
                              ? 'none'
                              : `linear-gradient(135deg, ${colors.primary}60, ${colors.primary}30)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `3px solid ${colors.primary}50`,
                            overflow: 'hidden',
                            boxShadow: `0 0 25px ${colors.primaryGlow}`,
                          }}
                        >
                          {profile?.avatar ? (
                            <img
                              src={fixMinioUrl(profile.avatar)}
                              alt={profile.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : isChannel ? (
                            <Radio size={42} color={colors.primary} style={{ flexShrink: 0, minWidth: 42 }} />
                          ) : (
                            <Users size={42} color={colors.primary} style={{ flexShrink: 0, minWidth: 42 }} />
                          )}
                        </div>

                      {/* Name & Privacy */}
                      <h3 style={{
                        margin: '0 0 8px',
                        fontSize: 22,
                        fontWeight: 700,
                        color: colors.text,
                        letterSpacing: '-0.02em',
                      }}>
                        {profile?.name || chat.name}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
                        <PrivacyBadge privacy={profile?.privacy || 'private'} />
                        <span style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <Users size={14} style={{ flexShrink: 0, minWidth: 14 }} />
                          {profile?.members.length || 0} members
                          <span style={{ color: colors.online }}>• {onlineCount} online</span>
                        </span>
                      </div>

                      {profile?.description && (
                        <p style={{
                          margin: '12px 0 0',
                          fontSize: 14,
                          color: colors.textSecondary,
                          lineHeight: 1.5,
                          maxWidth: 360,
                          marginLeft: 'auto',
                          marginRight: 'auto',
                        }}>
                          {profile.description}
                        </p>
                      )}

                        {profile?.createdAt && (
                          <div style={{
                            marginTop: 12,
                            fontSize: 12,
                            color: colors.textMuted,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                          }}>
                            <Calendar size={12} style={{ flexShrink: 0, minWidth: 12 }} />
                            Created {new Date(profile.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        )}
                      </MatrixBackground>
                    </motion.div>

                    {/* Not a member - Join button */}
                    {!isMember && !isBanned && (
                      <motion.div variants={staggerItem} style={{ marginBottom: 20 }}>
                        <motion.button
                          onClick={handleJoin}
                          disabled={isJoining}
                          className="gpm-clickable"
                          style={{
                            width: '100%',
                            padding: '14px 20px',
                            background: colors.primary,
                            border: 'none',
                            borderRadius: 10,
                            color: '#fff',
                            fontSize: 15,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            transition: 'box-shadow 0.1s',
                          }}
                          whileHover={{ boxShadow: `0 0 20px ${colors.primaryGlow}`, transition: { duration: 0.1 } }}
                          whileTap={{ scale: 0.98, transition: { duration: 0.05 } }}
                        >
                          {isJoining ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <UserPlus size={18} />
                          )}
                          {isJoining ? 'Joining...' : `Join ${isChannel ? 'Channel' : 'Group'}`}
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Banned message */}
                    {isBanned && (
                      <motion.div
                        variants={staggerItem}
                        style={{
                          padding: 16,
                          background: colors.dangerMuted,
                          borderRadius: 10,
                          border: `1px solid ${colors.danger}30`,
                          marginBottom: 20,
                          textAlign: 'center',
                        }}
                      >
                        <Ban size={24} color={colors.danger} style={{ marginBottom: 8 }} />
                        <p style={{ margin: 0, fontSize: 14, color: colors.danger, fontWeight: 500 }}>
                          You are banned from this {chat.type}
                        </p>
                      </motion.div>
                    )}

                    {/* Actions */}
                    <motion.div variants={staggerItem} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* View Members */}
                      <ActionButton
                        icon={<Users size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                        label={`View Members (${profile?.members.length || 0})`}
                        onClick={() => setViewMode('members')}
                      />

                      {/* Add Member */}
                      {(isAdmin || canAddUsers) && isMember && (
                        <ActionButton
                          icon={<UserPlus size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                          label="Add Member"
                          onClick={() => setViewMode('addMember')}
                          variant="primary"
                        />
                      )}

                      {/* Privacy Toggle */}
                      {(isAdmin || canManageChatInfo) && isMember && (
                        <ActionButton
                          icon={profile?.privacy === 'public' ? <Lock size={18} style={{ flexShrink: 0, minWidth: 18 }} /> : <Globe size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                          label={`Make ${profile?.privacy === 'public' ? 'Private' : 'Public'}`}
                          onClick={handlePrivacyToggle}
                          loading={isUpdatingPrivacy}
                        />
                      )}

                      {/* Edit */}
                      {(isAdmin || canManageChatInfo) && isMember && onEditGroup && (
                        <ActionButton
                          icon={<Edit2 size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                          label={`Edit ${isChannel ? 'Channel' : 'Group'}`}
                          onClick={onEditGroup}
                        />
                      )}

                      {/* Banned Users */}
                      {(isAdmin || canManageBans) && isMember && (
                        <ActionButton
                          icon={<Ban size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                          label="Banned Users"
                          onClick={() => setViewMode('banned')}
                        />
                      )}

                      {/* Leave */}
                      {isMember && onLeaveGroup && (
                        <ActionButton
                          icon={<LogOut size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                          label={`Leave ${isChannel ? 'Channel' : 'Group'}`}
                          onClick={handleLeaveGroup}
                          variant="danger"
                        />
                      )}

                      {/* Delete */}
                      {isAdmin && onDeleteGroup && (
                        <ActionButton
                          icon={<Trash2 size={18} style={{ flexShrink: 0, minWidth: 18 }} />}
                          label={`Delete ${isChannel ? 'Channel' : 'Group'}`}
                          onClick={handleDeleteGroup}
                          variant="danger"
                        />
                      )}
                    </motion.div>
                  </motion.div>
                ) : viewMode === 'members' ? (
                  <motion.div key="members" variants={slideIn} initial="hidden" animate="visible" exit="exit">
                    {/* Search */}
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                      <Search
                        size={16}
                        color={colors.textMuted}
                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', flexShrink: 0, minWidth: 16 }}
                      />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearchQuery}
                        onChange={e => setMemberSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          background: colors.surfaceElevated,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 10,
                          color: colors.text,
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = colors.primary}
                        onBlur={e => e.target.style.borderColor = colors.border}
                      />
                    </div>

                    {/* Member List */}
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      {filteredMembers.map(member => (
                        <MemberCard
                          key={member.userId}
                          member={member}
                          isOnline={isUserOnline(member.userId)}
                          lastSeen={getUserLastSeen(member.userId)}
                          isCurrentUser={member.userId === currentUserId}
                          canManage={isAdmin || canManageUsers || canManageBans}
                          onViewProfile={() => onViewUserProfile?.(member.userId)}
                          onKick={(isAdmin || canManageUsers) && member.role !== 'admin' ? () => handleKick(member.userId) : undefined}
                          onBan={(isAdmin || canManageBans) && member.role !== 'admin' ? () => handleBan(member.userId) : undefined}
                          onManagePermissions={isAdmin && member.role !== 'admin' ? () => {
                            setSelectedMemberForPermissions(member);
                            setShowPermissionModal(true);
                          } : undefined}
                        />
                      ))}
                      {filteredMembers.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
                          No members found
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                ) : viewMode === 'banned' ? (
                  <motion.div key="banned" variants={slideIn} initial="hidden" animate="visible" exit="exit">
                    {isLoadingBannedUsers ? (
                      <div style={{ textAlign: 'center', padding: 40 }}>
                        <Loader2 size={24} color={colors.primary} className="animate-spin" />
                      </div>
                    ) : bannedUsers.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: 40,
                        color: colors.textMuted,
                      }}>
                        <Ban size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <p>No banned users</p>
                      </div>
                    ) : (
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        {bannedUsers.map(user => (
                          <motion.div
                            key={user.userId}
                            variants={staggerItem}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 14px',
                              background: colors.surfaceElevated,
                              borderRadius: 10,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {user.avatarUrl ? (
                              <img
                                src={fixMinioUrl(user.avatarUrl)}
                                alt={user.username}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  marginRight: 12,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  background: colors.dangerMuted,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: 12,
                                  color: colors.danger,
                                  fontWeight: 600,
                                }}
                              >
                                {getInitials(user.username)}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                                {user.username}
                              </div>
                              <div style={{ fontSize: 12, color: colors.textMuted }}>
                                Banned {new Date(user.bannedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUnban(user.userId, user.username)}
                              className="gpm-clickable"
                              style={{
                                padding: '8px 14px',
                                background: colors.primaryMuted,
                                border: `1px solid ${colors.primary}30`,
                                borderRadius: 6,
                                color: colors.primary,
                                fontSize: 13,
                                fontWeight: 500,
                              }}
                            >
                              Unban
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ) : viewMode === 'addMember' ? (
                  <motion.div key="addMember" variants={slideIn} initial="hidden" animate="visible" exit="exit">
                    {/* Search Input */}
                    <div style={{ marginBottom: 16, position: 'relative' }}>
                      <Search
                        size={16}
                        color={colors.textMuted}
                        style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', flexShrink: 0, minWidth: 16 }}
                      />
                      <input
                        type="text"
                        placeholder="Search users to add..."
                        value={addMemberQuery}
                        onChange={e => setAddMemberQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px 12px 42px',
                          background: colors.surfaceElevated,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 10,
                          color: colors.text,
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = colors.primary}
                        onBlur={e => e.target.style.borderColor = colors.border}
                      />
                    </div>

                    {/* Search Results */}
                    {isSearchingUsers ? (
                      <div style={{ textAlign: 'center', padding: 40 }}>
                        <Loader2 size={24} color={colors.primary} className="animate-spin" />
                      </div>
                    ) : userSearchResults.length > 0 ? (
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        {userSearchResults.map((user: any) => (
                          <motion.div
                            key={user.id}
                            variants={staggerItem}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 14px',
                              background: colors.surfaceElevated,
                              borderRadius: 10,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {user.avatar ? (
                              <img
                                src={fixMinioUrl(user.avatar)}
                                alt={user.username}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  marginRight: 12,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  background: colors.primaryMuted,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: 12,
                                  color: colors.primary,
                                  fontWeight: 600,
                                }}
                              >
                                {getInitials(user.username)}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                                {user.username}
                              </div>
                              {user.email && (
                                <div style={{ fontSize: 12, color: colors.textMuted }}>
                                  {user.email}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleAddMember(user.id)}
                              className="gpm-clickable"
                              style={{
                                padding: '8px 14px',
                                background: colors.primary,
                                border: 'none',
                                borderRadius: 6,
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <UserPlus size={14} />
                              Add
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : addMemberQuery.trim() ? (
                      <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
                        No users found
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
                        <UserPlus size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <p>Type to search for users</p>
                      </div>
                    )}
                  </motion.div>
                ) : null}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission Modal */}
      {showPermissionModal && selectedMemberForPermissions && (
        <PermissionModal
          isOpen={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedMemberForPermissions(null);
          }}
          chatId={chat.id}
          member={selectedMemberForPermissions}
          onPermissionsChanged={async () => {
            await loadProfile();
          }}
        />
      )}
    </>
  );
};

export default GroupProfileModal;
