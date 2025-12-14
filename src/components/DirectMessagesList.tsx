import { UserPlus } from 'lucide-react';
import { OnlineStatusIndicator } from './common/OnlineStatusIndicator';
import { useChatStore } from '../stores/chatStore';

export interface DirectMessage {
  id: string;
  userId: string;
  username: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline: boolean;
  unreadCount?: number;
}

interface DirectMessagesListProps {
  messages: DirectMessage[];
  selectedUserId?: string | null;
  onSelectUser: (userId: string) => void;
  onCreateDM?: () => void;
}

export const DirectMessagesList = ({ messages, selectedUserId, onSelectUser, onCreateDM }: DirectMessagesListProps) => {
  const { isUserOnline, getUserLastSeen } = useChatStore();

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 8px', marginBottom: '16px' }}>
        <button
          onClick={onCreateDM}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '14px',
            fontWeight: 700,
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <UserPlus className="w-4 h-4" />
          New DM
        </button>
      </div>

      <p style={{ padding: '0 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
        DIRECT MESSAGES
      </p>

      <div style={{ padding: '0 8px' }}>
        {messages.map((dm) => (
          <button
            key={dm.id}
            onClick={() => onSelectUser(dm.userId)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: selectedUserId === dm.userId ? 'var(--background)' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'left',
              borderLeft: selectedUserId === dm.userId ? '3px solid var(--accent)' : 'none',
              paddingLeft: selectedUserId === dm.userId ? '9px' : '12px',
            }}
            onMouseEnter={(e) => {
              if (selectedUserId !== dm.userId) {
                e.currentTarget.style.backgroundColor = 'var(--background)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedUserId !== dm.userId) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <OnlineStatusIndicator
                isOnline={isUserOnline(dm.userId)}
                lastSeen={getUserLastSeen(dm.userId)}
                size="sm"
                position="standalone"
              />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, flex: 1 }}>
                {dm.username}
              </p>
              {dm.unreadCount && dm.unreadCount > 0 && (
                <span
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {dm.unreadCount}
                </span>
              )}
            </div>
            {dm.lastMessage && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {dm.lastMessage}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {dm.lastMessageTime}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
