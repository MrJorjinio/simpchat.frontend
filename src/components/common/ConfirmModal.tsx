import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '400px',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: variant === 'danger' ? '#ef4444' : variant === 'warning' ? '#f59e0b' : '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <AlertTriangle size={20} color="white" />
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#f1f5f9',
                }}>
                  {title}
                </h3>
              </div>
              <button
                onClick={onCancel}
                aria-label="Close"
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
                  fontSize: '22px',
                  fontWeight: 300,
                  lineHeight: 1,
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              <p style={{
                margin: 0,
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#94a3b8',
              }}>
                {message}
              </p>
            </div>

            {/* Actions */}
            <div style={{
              padding: '12px 20px 20px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: variant === 'danger' ? '#ef4444' : variant === 'warning' ? '#f59e0b' : '#6366f1',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
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
      console.log('[ConfirmModal] show() called, setConfirmState exists:', !!setConfirmState);
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
        console.warn('[ConfirmModal] Store not initialized! Using native confirm.');
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
    console.log('[ConfirmModal] Initializing confirm store...');
    confirmStore.init(setState);
    return () => {
      console.log('[ConfirmModal] Cleanup - resetting store');
    };
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
