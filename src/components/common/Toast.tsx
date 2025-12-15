import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import styles from './Toast.module.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 4000;
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    const closeTimer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [toast.id, toast.duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={22} />;
      case 'error':
        return <XCircle size={22} />;
      case 'warning':
        return <AlertCircle size={22} />;
      case 'info':
        return <Info size={22} />;
    }
  };

  return (
    <div className={`${styles.toast} ${styles[toast.type]} ${isExiting ? styles.exit : ''}`}>
      <div className={styles.iconWrapper}>
        {getIcon()}
      </div>
      <span className={styles.message}>{toast.message}</span>
      <button
        onClick={handleClose}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          border: 'none',
          borderRadius: '6px',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '8px',
        }}
      >
        <X size={16} strokeWidth={3} />
      </button>
      <div className={styles.progressBar} style={{ animationDuration: `${toast.duration || 4000}ms` }} />
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast store for global access
type ToastListener = (toasts: ToastMessage[]) => void;

class ToastStore {
  private toasts: ToastMessage[] = [];
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  show(type: ToastType, message: string, duration?: number) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastMessage = { id, type, message, duration };
    this.toasts.push(toast);
    this.notify();
    return id;
  }

  success(message: string, duration?: number) {
    return this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    return this.show('error', message, duration || 5000);
  }

  warning(message: string, duration?: number) {
    return this.show('warning', message, duration);
  }

  info(message: string, duration?: number) {
    return this.show('info', message, duration);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  getToasts() {
    return [...this.toasts];
  }
}

export const toastStore = new ToastStore();

// Convenience functions
export const toast = {
  success: (message: string, duration?: number) => toastStore.success(message, duration),
  error: (message: string, duration?: number) => toastStore.error(message, duration),
  warning: (message: string, duration?: number) => toastStore.warning(message, duration),
  info: (message: string, duration?: number) => toastStore.info(message, duration),
};
