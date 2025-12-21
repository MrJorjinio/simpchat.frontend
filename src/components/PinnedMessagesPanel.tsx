import React, { useEffect, useState } from 'react';
import { Pin, ChevronDown, ChevronUp, ArrowRight, Loader2 } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import type { PinnedMessage } from '../types/api.types';
import { getInitials, formatTime, fixMinioUrl } from '../utils/helpers';
import styles from './PinnedMessagesPanel.module.css';

interface PinnedMessagesPanelProps {
  chatId: string;
  onJumpToMessage: (messageId: string) => void;
  canUnpin: boolean;
}

export const PinnedMessagesPanel: React.FC<PinnedMessagesPanelProps> = ({
  chatId,
  onJumpToMessage,
  canUnpin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [unpinningId, setUnpinningId] = useState<string | null>(null);

  const { loadPinnedMessages, getPinnedMessages, unpinMessage, isLoadingPinned } = useChatStore();
  const pinnedMessages = getPinnedMessages(chatId);

  useEffect(() => {
    if (chatId) {
      loadPinnedMessages(chatId);
    }
  }, [chatId, loadPinnedMessages]);

  const handleUnpin = async (messageId: string) => {
    setUnpinningId(messageId);
    try {
      await unpinMessage(messageId);
    } catch (error) {
      console.error('Failed to unpin message:', error);
    } finally {
      setUnpinningId(null);
    }
  };

  // Don't show the panel if there are no pinned messages
  // (loading state is handled inside the expanded panel)
  if (pinnedMessages.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={styles.headerLeft}>
          <Pin size={16} className={styles.pinIcon} />
          <span className={styles.title}>Pinned Messages</span>
          <span className={styles.count}>{pinnedMessages.length}</span>
        </div>
        <div className={styles.headerRight}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {isLoadingPinned ? (
            <div className={styles.loading}>
              <Loader2 size={20} className={styles.spinner} />
              <span>Loading pinned messages...</span>
            </div>
          ) : (
            <div className={styles.messagesList}>
              {pinnedMessages.map((msg: PinnedMessage) => (
                <div key={msg.messageId} className={styles.pinnedMessage}>
                  <div className={styles.messageAvatar}>
                    {msg.senderAvatarUrl ? (
                      <img src={fixMinioUrl(msg.senderAvatarUrl) || msg.senderAvatarUrl} alt={msg.senderUsername} />
                    ) : (
                      <div className={styles.avatarFallback}>
                        {getInitials(msg.senderUsername)}
                      </div>
                    )}
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.senderName}>{msg.senderUsername}</span>
                      <span className={styles.messageTime}>{formatTime(msg.sentAt)}</span>
                    </div>
                    <div className={styles.messageText}>
                      {msg.content || (msg.fileUrl ? '[File attachment]' : '[Empty message]')}
                    </div>
                    {msg.pinnedByUsername && (
                      <div className={styles.pinnedBy}>
                        <Pin size={12} />
                        <span>Pinned by {msg.pinnedByUsername}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.messageActions}>
                    <button
                      className={styles.jumpButton}
                      onClick={() => onJumpToMessage(msg.messageId)}
                      title="Jump to message"
                    >
                      <ArrowRight size={16} />
                    </button>
                    {canUnpin && (
                      <button
                        className={styles.unpinButton}
                        onClick={() => handleUnpin(msg.messageId)}
                        disabled={unpinningId === msg.messageId}
                        title="Unpin message"
                      >
                        {unpinningId === msg.messageId ? (
                          <Loader2 size={16} className={styles.spinner} />
                        ) : (
                          <span style={{ fontSize: '18px', fontWeight: 300, lineHeight: 1 }}>×</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PinnedMessagesPanel;
