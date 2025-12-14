import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          iconShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
          confirmBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          confirmShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
          confirmHoverShadow: '0 6px 24px rgba(239, 68, 68, 0.5)',
        };
      case 'warning':
        return {
          iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          iconShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
          confirmBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          confirmShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
          confirmHoverShadow: '0 6px 24px rgba(245, 158, 11, 0.5)',
        };
      case 'info':
        return {
          iconBg: 'linear-gradient(135deg, #667eea, #764ba2)',
          iconShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
          confirmBg: 'linear-gradient(135deg, #667eea, #764ba2)',
          confirmShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
          confirmHoverShadow: '0 6px 24px rgba(102, 126, 234, 0.5)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              zIndex: 10000,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '420px',
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.95))',
              border: '2px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), 0 0 30px rgba(99, 102, 241, 0.2)',
              zIndex: 10001,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
              borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: variantStyles.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: variantStyles.iconShadow,
                }}>
                  <AlertTriangle size={22} color="white" />
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#f1f5f9',
                }}>
                  {title}
                </h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCancel}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                }}
              >
                <X size={18} />
              </motion.button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              <p style={{
                margin: 0,
                fontSize: '15px',
                lineHeight: 1.6,
                color: '#94a3b8',
              }}>
                {message}
              </p>
            </div>

            {/* Actions */}
            <div style={{
              padding: '16px 24px 24px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cancelText}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: variantStyles.confirmHoverShadow }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: variantStyles.confirmBg,
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: variantStyles.confirmShadow,
                  transition: 'all 0.2s ease',
                }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Global confirm modal state management
type ConfirmCallback = (confirmed: boolean) => void;

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: 'danger' | 'warning' | 'info';
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
    variant?: 'danger' | 'warning' | 'info';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      if (setConfirmState) {
        setConfirmState({
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          variant: options.variant || 'danger',
          callback: resolve,
        });
      } else {
        // Fallback to native confirm if store not initialized
        resolve(window.confirm(options.message));
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
      onConfirm={() => confirmStore.close(true)}
      onCancel={() => confirmStore.close(false)}
    />
  );
};
