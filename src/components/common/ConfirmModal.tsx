import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Ban, LogOut, Shield, Info, X, CheckCircle } from 'lucide-react';

// ============================================================================
// DESIGN SYSTEM - Refined Noir Theme with Emerald Accents
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
  warningHover: '#d97706',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  info: '#10b981',
  infoHover: '#0d9668',
  infoMuted: 'rgba(16, 185, 129, 0.15)',
  success: '#10b981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
};

// Custom emerald cursor SVG data URLs
const cursorDefault = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M5.5 3.21V20.8l4.75-4.73 2.99 6.73L15.5 21.6l-3-6.7h6z'/%3E%3Cpath fill='%23064e3b' d='M6.5 5.61v11.68l3.38-3.37.37-.37.48 1.07 1.93 4.35 1.07-.47L11.8 14.1l-.48-1.07H16z'/%3E%3C/svg%3E") 5 3, default`;
const cursorPointer = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%2310b981' d='M9 2.5a2.5 2.5 0 0 1 5 0v7.996l3.904-.74a2.095 2.095 0 0 1 2.537 2.466L19.5 17.5a6 6 0 0 1-6 6H11a7 7 0 0 1-7-7V9a2 2 0 1 1 4 0v3.5h1z'/%3E%3Cpath fill='%23064e3b' d='M10 2.5V14h-.5a1.5 1.5 0 0 1-1.5-1.5V9a1 1 0 1 0-2 0v7.5a6 6 0 0 0 6 6h2.5a5 5 0 0 0 5-5l.941-5.278a1.095 1.095 0 0 0-1.324-1.288l-4.117.78V2.5a1.5 1.5 0 0 0-3 0z'/%3E%3C/svg%3E") 9 4, pointer`;

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  icon?: 'delete' | 'ban' | 'leave' | 'warning' | 'info' | 'success' | 'shield';
  onConfirm: () => void;
  onCancel: () => void;
}

const getVariantStyles = (variant: string) => {
  switch (variant) {
    case 'danger':
      return {
        iconBg: colors.dangerMuted,
        iconBorder: `${colors.danger}30`,
        iconColor: colors.danger,
        buttonBg: colors.danger,
        buttonHover: colors.dangerHover,
        glow: `0 0 60px ${colors.dangerMuted}`,
      };
    case 'warning':
      return {
        iconBg: colors.warningMuted,
        iconBorder: `${colors.warning}30`,
        iconColor: colors.warning,
        buttonBg: colors.warning,
        buttonHover: colors.warningHover,
        glow: `0 0 60px ${colors.warningMuted}`,
      };
    case 'success':
      return {
        iconBg: colors.successMuted,
        iconBorder: `${colors.success}30`,
        iconColor: colors.success,
        buttonBg: colors.success,
        buttonHover: colors.primaryHover,
        glow: `0 0 60px ${colors.successMuted}`,
      };
    case 'info':
    default:
      return {
        iconBg: colors.infoMuted,
        iconBorder: `${colors.info}30`,
        iconColor: colors.info,
        buttonBg: colors.info,
        buttonHover: colors.infoHover,
        glow: `0 0 60px ${colors.infoMuted}`,
      };
  }
};

const getIcon = (iconType: string, color: string) => {
  const size = 28;
  switch (iconType) {
    case 'delete':
      return <Trash2 size={size} color={color} />;
    case 'ban':
      return <Ban size={size} color={color} />;
    case 'leave':
      return <LogOut size={size} color={color} />;
    case 'shield':
      return <Shield size={size} color={color} />;
    case 'success':
      return <CheckCircle size={size} color={color} />;
    case 'info':
      return <Info size={size} color={color} />;
    case 'warning':
    default:
      return <AlertTriangle size={size} color={color} />;
  }
};

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 400,
      mass: 0.8,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.15, ease: 'easeOut' as const }
  },
};

const iconVariants = {
  hidden: { scale: 0, rotate: -180 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring' as const,
      damping: 15,
      stiffness: 400,
      delay: 0.1,
    }
  },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.15, duration: 0.2 }
  },
};

const buttonContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.2, duration: 0.2 }
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon = 'warning',
  onConfirm,
  onCancel,
}) => {
  const variantStyles = getVariantStyles(variant);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          onClick={onCancel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: cursorDefault,
          }}
        >
          {/* Subtle grid pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(16, 185, 129, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16, 185, 129, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            pointerEvents: 'none',
          }} />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              background: `linear-gradient(180deg, ${colors.surfaceElevated} 0%, ${colors.surface} 100%)`,
              border: `1px solid ${colors.border}`,
              borderRadius: '20px',
              boxShadow: `
                0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 0 1px ${colors.borderLight},
                ${variantStyles.glow}
              `,
              overflow: 'hidden',
            }}
          >
            {/* Gradient accent line at top */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, transparent, ${variantStyles.iconColor}, transparent)`,
            }} />

            {/* Close button */}
            <motion.button
              whileHover={{ scale: 1.1, backgroundColor: colors.surfaceHover }}
              whileTap={{ scale: 0.9 }}
              onClick={onCancel}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: cursorPointer,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textMuted,
                zIndex: 1,
              }}
            >
              <X size={18} />
            </motion.button>

            {/* Content */}
            <div style={{ padding: '32px 28px 28px' }}>
              {/* Icon */}
              <motion.div
                variants={iconVariants}
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '20px',
                  background: variantStyles.iconBg,
                  border: `1px solid ${variantStyles.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: `0 8px 32px ${variantStyles.iconBg}`,
                }}
              >
                {getIcon(icon, variantStyles.iconColor)}
              </motion.div>

              {/* Title and Message */}
              <motion.div variants={contentVariants} style={{ textAlign: 'center' }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: colors.text,
                  letterSpacing: '-0.02em',
                }}>
                  {title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: colors.textSecondary,
                  maxWidth: '320px',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}>
                  {message}
                </p>
              </motion.div>

              {/* Actions */}
              <motion.div
                variants={buttonContainerVariants}
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '28px',
                }}
              >
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: colors.surfaceHover,
                    borderColor: colors.borderLight,
                    boxShadow: 'none',
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: `1px solid ${colors.border}`,
                    background: colors.surfaceElevated,
                    color: colors.textSecondary,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: cursorPointer,
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    boxShadow: `0 8px 32px ${variantStyles.iconBg}`,
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onConfirm}
                  style={{
                    flex: 1,
                    padding: '14px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${variantStyles.buttonBg} 0%, ${variantStyles.buttonHover} 100%)`,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: cursorPointer,
                    boxShadow: `0 4px 16px ${variantStyles.iconBg}`,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {confirmText}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// GLOBAL CONFIRM MODAL STATE MANAGEMENT
// ============================================================================
type ConfirmCallback = (confirmed: boolean) => void;

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'info' | 'success';
  icon: 'delete' | 'ban' | 'leave' | 'warning' | 'info' | 'success' | 'shield';
  callback: ConfirmCallback | null;
}

let setConfirmState: React.Dispatch<React.SetStateAction<ConfirmState>> | null = null;

export const confirmStore = {
  init: (setter: React.Dispatch<React.SetStateAction<ConfirmState>>) => {
    setConfirmState = setter;
  },
  show: (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    icon?: 'delete' | 'ban' | 'leave' | 'warning' | 'info' | 'success' | 'shield';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      if (setConfirmState) {
        // Auto-detect icon based on variant if not specified
        let autoIcon = options.icon;
        if (!autoIcon) {
          switch (options.variant) {
            case 'danger':
              autoIcon = 'delete';
              break;
            case 'warning':
              autoIcon = 'warning';
              break;
            case 'success':
              autoIcon = 'success';
              break;
            case 'info':
            default:
              autoIcon = 'info';
              break;
          }
        }

        setConfirmState({
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          variant: options.variant || 'danger',
          icon: autoIcon || 'warning',
          callback: resolve,
        });
      } else {
        // Fallback - should never happen if properly initialized
        console.warn('[ConfirmModal] Store not initialized');
        resolve(false);
      }
    });
  },
  close: (confirmed: boolean) => {
    if (setConfirmState) {
      setConfirmState((prev) => {
        if (prev.callback) {
          prev.callback(confirmed);
        }
        return {
          ...prev,
          isOpen: false,
          callback: null,
        };
      });
    }
  },
};

// Helper function for easy usage
export const confirm = confirmStore.show;

// Container component to be added to App.tsx
export const ConfirmModalContainer: React.FC = () => {
  const [state, setState] = React.useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    icon: 'warning',
    callback: null,
  });

  React.useEffect(() => {
    confirmStore.init(setState);
  }, []);

  return (
    <ConfirmModal
      isOpen={state.isOpen}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
      icon={state.icon}
      onConfirm={() => confirmStore.close(true)}
      onCancel={() => confirmStore.close(false)}
    />
  );
};
