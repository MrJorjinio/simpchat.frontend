import { useState, useRef, useEffect } from 'react';
import { Send, Smile, AlertCircle, Loader } from 'lucide-react';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  edited?: boolean;
  reactions?: Record<string, string[]>;
}

interface ChatAreaProps {
  chatName: string;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  isLoading?: boolean;
  isLoadingMessages?: boolean;
  messageLoadError?: string | null;
  onRetryLoadMessages?: () => void;
  totalMessagesCount?: number;
  onLoadMoreMessages?: () => void;
}

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😢', '😡', '🎉'];

export const ChatArea = ({
  messages,
  currentUserId,
  onSendMessage,
  onAddReaction,
  onEditMessage,
  onDeleteMessage,
  isLoading = false,
  isLoadingMessages = false,
  messageLoadError = null,
  onRetryLoadMessages,
  totalMessagesCount = 0,
  onLoadMoreMessages,
}: ChatAreaProps) => {
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ messageId: string; x: number; y: number } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      onSendMessage(messageInput);
      setMessageInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ messageId, x: e.clientX, y: e.clientY });
  };

  const handleEditMessage = async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      setEditingMessageId(messageId);
      setEditingContent(msg.content);
      setContextMenu(null);
    }
  };

  const handleSaveEdit = async (messageId: string) => {
    if (editingContent.trim() && onEditMessage) {
      try {
        await onEditMessage(messageId, editingContent);
        setEditingMessageId(null);
        setEditingContent('');
      } catch (error) {
        console.error('Failed to edit message:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (onDeleteMessage && confirm('Are you sure you want to delete this message?')) {
      try {
        await onDeleteMessage(messageId);
        setContextMenu(null);
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {isLoadingMessages ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              gap: '16px',
            }}
          >
            <Loader className="w-8 h-8" style={{ animation: 'rotate 1s linear infinite', color: 'var(--accent)' }} />
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', margin: 0 }}>
              Loading messages...
            </p>
          </div>
        ) : messageLoadError ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              gap: '16px',
            }}
          >
            <AlertCircle className="w-8 h-8" style={{ color: '#d32f2f' }} />
            <p style={{ fontSize: '16px', color: '#d32f2f', margin: 0, textAlign: 'center' }}>
              {messageLoadError}
            </p>
            {onRetryLoadMessages && (
              <button
                onClick={onRetryLoadMessages}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(211, 47, 47, 0.1)',
                  color: '#d32f2f',
                  border: '1px solid rgba(211, 47, 47, 0.3)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                Retry
              </button>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '48px' }}>💬</div>
            <p style={{ fontSize: '16px', color: 'var(--text-muted)', margin: 0 }}>
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                marginBottom: '12px',
                gap: '8px',
                alignItems: 'flex-end',
              }}
              onMouseEnter={() => setShowEmojiPicker(msg.id)}
              onMouseLeave={() => setShowEmojiPicker(null)}
            >
              {msg.senderId !== currentUserId && showEmojiPicker === msg.id && (
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    transition: 'color 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                  onClick={() => setShowEmojiPicker(`picker-${msg.id}`)}
                >
                  <Smile className="w-5 h-5" />
                </button>
              )}

              <div style={{ position: 'relative' }}>
                {showEmojiPicker === `picker-${msg.id}` && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: msg.senderId === currentUserId ? 'auto' : 0,
                      right: msg.senderId === currentUserId ? 0 : 'auto',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      gap: '4px',
                      marginBottom: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      zIndex: 10,
                    }}
                  >
                    {EMOJI_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onAddReaction?.(msg.id, emoji);
                          setShowEmojiPicker(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--background)';
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {editingMessageId === msg.id ? (
                  // Edit mode
                  <div
                    style={{
                      maxWidth: '60%',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: '2px solid var(--accent)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--text)',
                        fontSize: '15px',
                        fontFamily: 'inherit',
                        minHeight: '60px',
                        resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleSaveEdit(msg.id)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--border)',
                          color: 'var(--text)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal message display
                  <div
                    style={{
                      maxWidth: '60%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      backgroundColor:
                        msg.senderId === currentUserId ? 'var(--chat-self)' : 'var(--chat-other)',
                      color: msg.senderId === currentUserId ? 'white' : 'var(--text)',
                      wordWrap: 'break-word',
                      cursor: 'context-menu',
                      position: 'relative',
                    }}
                    onContextMenu={(e) => handleContextMenu(e, msg.id)}
                  >
                    {msg.senderId !== currentUserId && (
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 700, opacity: 0.8 }}>
                        {msg.senderName}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.4 }}>
                      {msg.content}
                    </p>
                    {msg.edited && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                        (edited)
                      </p>
                    )}
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                )}

                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      marginTop: '6px',
                      flexWrap: 'wrap',
                      justifyContent: msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                      <button
                        key={emoji}
                        style={{
                          padding: '4px 8px',
                          fontSize: '13px',
                          backgroundColor: userIds.includes(currentUserId) ? 'var(--accent)' : 'var(--border)',
                          color: userIds.includes(currentUserId) ? 'white' : 'var(--text)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          onAddReaction?.(msg.id, emoji);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        {emoji} {userIds.length}
                      </button>
                    ))}
                  </div>
                )}

                {/* Context Menu */}
                {contextMenu?.messageId === msg.id && msg.senderId === currentUserId && (
                  <div
                    ref={contextMenuRef}
                    style={{
                      position: 'fixed',
                      top: `${contextMenu.y}px`,
                      left: `${contextMenu.x}px`,
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      minWidth: '160px',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      onClick={() => handleEditMessage(msg.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--background)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#d32f2f',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(211, 47, 47, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {messages.length > 0 && totalMessagesCount > messages.length && onLoadMoreMessages && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px',
              marginTop: '8px',
            }}
          >
            <button
              onClick={onLoadMoreMessages}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--border)',
                color: 'var(--text)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text)';
              }}
            >
              Load More Messages
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px 14px',
            fontSize: '15px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            backgroundColor: 'var(--background)',
            color: 'var(--text)',
            fontFamily: 'inherit',
            minHeight: '44px',
            maxHeight: '120px',
            boxSizing: 'border-box',
            resize: 'none',
            transition: 'all 0.3s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 102, 255, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!messageInput.trim() || isLoading}
          style={{
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: 700,
            backgroundColor: messageInput.trim() && !isLoading ? 'var(--accent)' : '#bdbdbd',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: messageInput.trim() && !isLoading ? 'pointer' : 'not-allowed',
            minHeight: '44px',
            minWidth: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            if (messageInput.trim() && !isLoading) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
