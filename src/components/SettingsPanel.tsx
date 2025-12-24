import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Radio,
  User,
  Bell,
  UserX,
  Shield,
  LogOut,
  X,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// DESIGN SYSTEM - Refined Noir with Emerald Gemstone Accents
// ============================================================================
const colors = {
  // Depths of black
  void: '#020202',
  abyss: '#050505',
  obsidian: '#0a0a0a',
  charcoal: '#0f0f0f',
  slate: '#151515',

  // Borders & surfaces
  border: '#1a1a1a',
  borderLight: '#252525',
  surfaceHover: '#1c1c1c',

  // Emerald gemstone palette
  emerald: '#10b981',
  emeraldBright: '#34d399',
  emeraldDark: '#059669',
  emeraldGlow: 'rgba(16, 185, 129, 0.4)',
  emeraldMuted: 'rgba(16, 185, 129, 0.12)',

  // Accent colors
  sapphire: '#3b82f6',
  amethyst: '#8b5cf6',
  amber: '#f59e0b',
  ruby: '#ef4444',
  rubyDark: '#dc2626',
  indigo: '#6366f1',

  // Text hierarchy
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textDim: '#52525b',
};

// Custom emerald cursors
const cursorDefault = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M5.5 3.21V20.8l4.75-4.73 2.99 6.73L15.5 21.6l-3-6.7h6z'/%3E%3Cpath fill='%23064e3b' d='M6.5 5.61v11.68l3.38-3.37.37-.37.48 1.07 1.93 4.35 1.07-.47L11.8 14.1l-.48-1.07H16z'/%3E%3C/svg%3E") 5 3, default`;
const cursorPointer = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M9 2.5a2.5 2.5 0 0 1 5 0v7.996l3.904-.74a2.095 2.095 0 0 1 2.537 2.466L19.5 17.5a6 6 0 0 1-6 6H11a7 7 0 0 1-7-7V9a2 2 0 1 1 4 0v3.5h1z'/%3E%3Cpath fill='%23064e3b' d='M10 2.5V14h-.5a1.5 1.5 0 0 1-1.5-1.5V9a1 1 0 1 0-2 0v7.5a6 6 0 0 0 6 6h2.5a5 5 0 0 0 5-5l.941-5.278a1.095 1.095 0 0 0-1.324-1.288l-4.117.78V2.5a1.5 1.5 0 0 0-3 0z'/%3E%3C/svg%3E") 9 4, pointer`;

// Global styles injection
const settingsStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  .settings-panel-overlay {
    cursor: ${cursorDefault};
  }
  .settings-panel-overlay * {
    cursor: inherit;
  }
  .settings-panel-overlay button,
  .settings-panel-overlay [role="button"],
  .settings-panel-overlay .clickable {
    cursor: ${cursorPointer};
  }

  .settings-panel-content::-webkit-scrollbar {
    width: 6px;
  }
  .settings-panel-content::-webkit-scrollbar-track {
    background: ${colors.obsidian};
  }
  .settings-panel-content::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, ${colors.emerald}, ${colors.emeraldDark});
    border-radius: 3px;
  }
  .settings-panel-content::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, ${colors.emeraldBright}, ${colors.emerald});
  }

  @keyframes settings-matrix-pulse {
    0%, 100% { opacity: 0.08; transform: scale(1); }
    50% { opacity: 0.25; transform: scale(1.05); }
  }

  @keyframes settings-glow-breathe {
    0%, 100% { filter: drop-shadow(0 0 2px ${colors.emeraldGlow}); }
    50% { filter: drop-shadow(0 0 8px ${colors.emeraldGlow}); }
  }

  @keyframes settings-shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes emerald-pulse {
    0%, 100% { box-shadow: 0 0 0 0 ${colors.emeraldGlow}; }
    50% { box-shadow: 0 0 20px 5px ${colors.emeraldGlow}; }
  }

  /* Responsive Styles for Settings Panel */
  @media (max-width: 768px) {
    .settings-panel-main {
      width: 85vw !important;
      max-width: 340px !important;
    }
  }

  @media (max-width: 480px) {
    .settings-panel-main {
      width: 100% !important;
      max-width: 100% !important;
      border-right: none !important;
    }
    .settings-panel-main .settings-header {
      padding: 16px !important;
    }
    .settings-panel-main .settings-header h2 {
      font-size: 16px !important;
    }
    .settings-panel-main .settings-header p {
      font-size: 11px !important;
    }
    .settings-panel-content {
      padding: 16px 12px !important;
    }
    .settings-panel-main .menu-item {
      padding: 10px 12px !important;
    }
    .settings-panel-main .menu-item-icon {
      width: 34px !important;
      height: 34px !important;
    }
    .settings-panel-main .menu-item-label {
      font-size: 13px !important;
    }
    .settings-panel-main .toggle-switch {
      padding: 12px 14px !important;
    }
    .settings-panel-main .toggle-icon {
      width: 36px !important;
      height: 36px !important;
    }
    .settings-panel-main .toggle-label {
      font-size: 13px !important;
    }
    .settings-panel-main .toggle-track {
      width: 46px !important;
      height: 24px !important;
    }
    .settings-panel-main .toggle-thumb {
      width: 18px !important;
      height: 18px !important;
    }
    .settings-panel-footer {
      padding: 14px 16px 20px !important;
    }
    .settings-panel-footer button {
      padding: 12px !important;
      font-size: 13px !important;
    }
  }

  @media (max-width: 360px) {
    .settings-panel-main .settings-header {
      padding: 14px 12px !important;
    }
    .settings-panel-main .settings-header h2 {
      font-size: 15px !important;
    }
    .settings-panel-content {
      padding: 14px 10px !important;
    }
    .settings-panel-main .menu-item {
      padding: 8px 10px !important;
    }
    .settings-panel-main .menu-item-icon {
      width: 32px !important;
      height: 32px !important;
    }
    .settings-panel-footer {
      padding: 12px 14px 18px !important;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('settings-panel-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'settings-panel-styles';
  styleEl.textContent = settingsStyles;
  document.head.appendChild(styleEl);
}

// ============================================================================
// PROPS INTERFACE
// ============================================================================
export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
  onEditProfile: () => void;
  onShowNotifications: () => void;
  onShowAdminPanel: () => void;
  onShowBlockedUsers: () => void;
  onLogout: () => void;
  fancyAnimations: boolean;
  onToggleFancyAnimations: () => void;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const }
  },
};

const panelVariants = {
  hidden: {
    x: '-100%',
    opacity: 0.8,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    }
  },
  exit: {
    x: '-100%',
    opacity: 0.5,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1] as const
    }
  },
};

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: 0.1 + i * 0.08,
      duration: 0.4,
      ease: 'easeOut' as const
    }
  }),
};

const itemVariants = {
  hidden: {
    opacity: 0,
    x: -20,
    scale: 0.95,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: 0.15 + i * 0.04,
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }),
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Matrix Background Animation
const MatrixBackground: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const cells = useMemo(() => {
    const result = [];
    const cols = 12;
    const rows = 20;
    for (let i = 0; i < cols * rows; i++) {
      result.push({
        id: i,
        delay: Math.random() * 3,
        duration: 1.5 + Math.random() * 2,
        opacity: 0.05 + Math.random() * 0.15,
      });
    }
    return result;
  }, []);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '4px',
          padding: '20px',
          height: '100%',
        }}
      >
        {cells.map((cell) => (
          <motion.div
            key={cell.id}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [cell.opacity * 0.3, cell.opacity, cell.opacity * 0.3],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: cell.duration,
              delay: cell.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: colors.emerald,
              borderRadius: '2px',
              aspectRatio: '1',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Toggle Switch Component
const ToggleSwitch: React.FC<{
  isOn: boolean;
  onToggle: () => void;
  label: string;
  icon: React.ReactNode;
  iconOff?: React.ReactNode;
}> = ({ isOn, onToggle, label, icon, iconOff }) => {
  return (
    <motion.button
      onClick={onToggle}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '14px 16px',
        background: colors.charcoal,
        border: `1px solid ${colors.border}`,
        borderRadius: '14px',
        fontFamily: "'Outfit', sans-serif",
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: isOn
              ? `linear-gradient(135deg, ${colors.emerald}, ${colors.emeraldDark})`
              : colors.slate,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isOn
              ? `0 0 20px ${colors.emeraldGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`
              : 'inset 0 1px 0 rgba(255,255,255,0.05)',
            transition: 'all 0.3s ease',
          }}
        >
          <motion.div
            animate={{ rotate: isOn ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            {isOn ? icon : (iconOff || icon)}
          </motion.div>
        </div>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text,
          }}
        >
          {label}
        </span>
      </div>

      {/* Toggle Track */}
      <div
        style={{
          width: '52px',
          height: '28px',
          borderRadius: '14px',
          background: isOn
            ? `linear-gradient(90deg, ${colors.emeraldDark}, ${colors.emerald})`
            : colors.obsidian,
          border: `1px solid ${isOn ? colors.emerald : colors.borderLight}`,
          padding: '2px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOn
            ? `0 0 12px ${colors.emeraldGlow}`
            : 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <motion.div
          animate={{ x: isOn ? 24 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '11px',
            background: isOn
              ? '#fff'
              : colors.textMuted,
            boxShadow: isOn
              ? '0 2px 8px rgba(0,0,0,0.3)'
              : '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
    </motion.button>
  );
};

// Menu Item Component
const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  index: number;
}> = ({ icon, label, color, onClick, index }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.button
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '12px 14px',
        background: isHovered ? colors.surfaceHover : 'transparent',
        border: 'none',
        borderRadius: '12px',
        fontFamily: "'Outfit', sans-serif",
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: `linear-gradient(135deg, ${color}20, ${color}10)`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isHovered
              ? `0 0 16px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)`
              : `0 0 0 ${color}00`,
            transition: 'all 0.25s ease',
          }}
        >
          <div style={{ color, transition: 'transform 0.2s ease', transform: isHovered ? 'scale(1.1)' : 'scale(1)' }}>
            {icon}
          </div>
        </div>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: colors.text,
            transition: 'color 0.15s ease',
          }}
        >
          {label}
        </span>
      </div>

      <motion.div
        animate={{
          x: isHovered ? 0 : -4,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{ duration: 0.15 }}
      >
        <ChevronRight size={16} color={colors.textMuted} />
      </motion.div>
    </motion.button>
  );
};

// Section Header
const SectionHeader: React.FC<{ title: string; index: number }> = ({ title, index }) => (
  <motion.div
    custom={index}
    variants={sectionVariants}
    initial="hidden"
    animate="visible"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '0 14px',
      marginBottom: '8px',
      marginTop: index > 0 ? '24px' : '0',
    }}
  >
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: colors.textDim,
      }}
    >
      {title}
    </span>
    <div
      style={{
        flex: 1,
        height: '1px',
        background: `linear-gradient(90deg, ${colors.border}, transparent)`,
      }}
    />
  </motion.div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  onCreateChannel,
  onEditProfile,
  onShowNotifications,
  onShowAdminPanel,
  onShowBlockedUsers,
  onLogout,
  fancyAnimations,
  onToggleFancyAnimations,
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const createItems = [
    { icon: <Users size={18} />, label: 'New Group', color: colors.sapphire, onClick: onCreateGroup },
    { icon: <Radio size={18} />, label: 'New Channel', color: colors.amethyst, onClick: onCreateChannel },
  ];

  const accountItems = [
    { icon: <User size={18} />, label: 'Edit Profile', color: colors.emerald, onClick: onEditProfile },
    { icon: <Bell size={18} />, label: 'Notifications', color: colors.ruby, onClick: onShowNotifications },
    { icon: <UserX size={18} />, label: 'Blocked Users', color: colors.rubyDark, onClick: onShowBlockedUsers },
    { icon: <Shield size={18} />, label: 'Admin Panel', color: colors.indigo, onClick: onShowAdminPanel },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="settings-panel-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
          }}
        >
          {/* Backdrop */}
          <motion.div
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Panel */}
          <motion.div
            className="settings-panel-main"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'relative',
              width: '340px',
              height: '100vh',
              background: `linear-gradient(180deg, ${colors.obsidian} 0%, ${colors.abyss} 100%)`,
              borderRight: `1px solid ${colors.border}`,
              boxShadow: `
                4px 0 24px rgba(0, 0, 0, 0.5),
                0 0 1px ${colors.emeraldGlow}
              `,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Matrix Background */}
            <MatrixBackground enabled={fancyAnimations} />

            {/* Decorative top accent line */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${colors.emerald}, transparent)`,
                opacity: 0.6,
              }}
            />

            {/* Header */}
            <motion.div
              className="settings-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '20px 20px 16px',
                borderBottom: `1px solid ${colors.border}`,
                background: `linear-gradient(180deg, ${colors.charcoal}80 0%, transparent 100%)`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Emerald gem icon */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: `linear-gradient(135deg, ${colors.emerald}, ${colors.emeraldDark})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 0 20px ${colors.emeraldGlow}`,
                    }}
                  >
                    <Sparkles size={18} color="#fff" />
                  </div>
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: 600,
                        fontFamily: "'Outfit', sans-serif",
                        color: colors.text,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      Settings
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '12px',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: colors.textMuted,
                      }}
                    >
                      Customize your experience
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    background: colors.charcoal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textSecondary,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <X size={16} />
                </motion.button>
              </div>
            </motion.div>

            {/* Scrollable Content */}
            <div
              className="settings-panel-content"
              style={{
                position: 'relative',
                zIndex: 1,
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '20px 16px',
              }}
            >
              {/* Create Section */}
              <SectionHeader title="Create" index={0} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {createItems.map((item, i) => (
                  <MenuItem
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    onClick={() => { item.onClick(); onClose(); }}
                    index={i}
                  />
                ))}
              </div>

              {/* Account Section */}
              <SectionHeader title="Account" index={1} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {accountItems.map((item, i) => (
                  <MenuItem
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    onClick={() => { item.onClick(); onClose(); }}
                    index={i + createItems.length}
                  />
                ))}
              </div>

              {/* Preferences Section */}
              <SectionHeader title="Preferences" index={2} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <motion.div
                  custom={accountItems.length + createItems.length}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <ToggleSwitch
                    isOn={fancyAnimations}
                    onToggle={onToggleFancyAnimations}
                    label="Fancy Animations"
                    icon={<Sparkles size={18} color="#fff" />}
                  />
                </motion.div>
              </div>

              {/* Spacer */}
              <div style={{ height: '24px' }} />
            </div>

            {/* Footer with Sign Out */}
            <motion.div
              className="settings-panel-footer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '16px 20px 24px',
                borderTop: `1px solid ${colors.border}`,
                background: `linear-gradient(180deg, transparent 0%, ${colors.abyss}80 100%)`,
              }}
            >
              <motion.button
                onClick={onLogout}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: `1px solid ${colors.ruby}40`,
                  background: `linear-gradient(135deg, ${colors.ruby}15, ${colors.rubyDark}10)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: colors.ruby,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${colors.ruby}25, ${colors.rubyDark}20)`;
                  e.currentTarget.style.borderColor = `${colors.ruby}60`;
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.ruby}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${colors.ruby}15, ${colors.rubyDark}10)`;
                  e.currentTarget.style.borderColor = `${colors.ruby}40`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </motion.button>

              {/* Version tag */}
              <p
                style={{
                  margin: '12px 0 0',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: colors.textDim,
                }}
              >
                SimpChat v1.0
              </p>
            </motion.div>

            {/* Decorative bottom accent */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: `linear-gradient(90deg, transparent, ${colors.emerald}40, transparent)`,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Export for backwards compatibility
export { SettingsPanel as SettingsMenu };
export type { SettingsPanelProps as SettingsMenuProps };
