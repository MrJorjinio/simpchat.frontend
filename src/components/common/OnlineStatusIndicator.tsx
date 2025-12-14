import { motion } from 'framer-motion';
import { formatLastSeen } from '../../utils/helpers';

interface OnlineStatusIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  lastSeen?: string;
  position?: 'standalone' | 'avatar-overlay';
  className?: string;
}

const sizeMap = {
  sm: 8,
  md: 10,
  lg: 12,
};

// Pulsing animation for online status
const pulseAnimation = {
  scale: [1, 1.2, 1],
  opacity: [1, 0.8, 1],
};

const glowAnimation = {
  boxShadow: [
    '0 0 0 0 rgba(34, 197, 94, 0.4)',
    '0 0 0 4px rgba(34, 197, 94, 0.2)',
    '0 0 0 0 rgba(34, 197, 94, 0)',
  ],
};

export const OnlineStatusIndicator = ({
  isOnline,
  size = 'sm',
  showLabel = false,
  lastSeen,
  position = 'standalone',
  className = '',
}: OnlineStatusIndicatorProps) => {
  const dotSize = sizeMap[size];
  const onlineColor = 'var(--online-color, #22c55e)';
  const offlineColor = 'var(--offline-color, #94a3b8)';

  const dotStyle = {
    width: dotSize,
    height: dotSize,
    backgroundColor: isOnline ? onlineColor : offlineColor,
    borderRadius: '50%',
  };

  if (position === 'avatar-overlay') {
    return (
      <motion.div
        className={className}
        style={{
          ...dotStyle,
          position: 'absolute',
          bottom: 0,
          right: 0,
          border: '2px solid var(--surface)',
          boxShadow: isOnline ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
        }}
        animate={isOnline ? { ...pulseAnimation, ...glowAnimation } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        title={isOnline ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
      />
    );
  }

  // Standalone position
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: showLabel ? '6px' : '0',
      }}
    >
      <motion.div
        style={{
          ...dotStyle,
          flexShrink: 0,
          boxShadow: isOnline ? '0 0 8px rgba(34, 197, 94, 0.5)' : 'none',
        }}
        animate={isOnline ? pulseAnimation : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {showLabel && (
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: '13px',
            color: isOnline ? 'var(--online-color, #22c55e)' : 'var(--text-muted)',
            whiteSpace: 'nowrap',
            fontWeight: isOnline ? 500 : 400,
          }}
        >
          {isOnline ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
        </motion.span>
      )}
    </div>
  );
};
