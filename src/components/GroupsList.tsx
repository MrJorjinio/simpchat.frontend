import { Plus, Users, Lock } from 'lucide-react';

export interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  isPrivate: boolean;
  unreadCount?: number;
}

interface GroupsListProps {
  groups: Group[];
  selectedGroupId?: string | null;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup?: () => void;
}

export const GroupsList = ({ groups, selectedGroupId, onSelectGroup, onCreateGroup }: GroupsListProps) => {
  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ padding: '0 8px', marginBottom: '16px' }}>
        <button
          onClick={onCreateGroup}
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
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      <p style={{ padding: '0 12px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
        GROUPS
      </p>

      <div style={{ padding: '0 8px' }}>
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: selectedGroupId === group.id ? 'var(--background)' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'left',
              borderLeft: selectedGroupId === group.id ? '3px solid var(--accent)' : 'none',
              paddingLeft: selectedGroupId === group.id ? '9px' : '12px',
            }}
            onMouseEnter={(e) => {
              if (selectedGroupId !== group.id) {
                e.currentTarget.style.backgroundColor = 'var(--background)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedGroupId !== group.id) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, flex: 1 }}>
                {group.name}
              </p>
              {group.isPrivate && <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
              {group.unreadCount && group.unreadCount > 0 && (
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
                  {group.unreadCount}
                </span>
              )}
            </div>
            {group.description && (
              <p
                style={{
                  margin: '0 0 4px 0',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {group.description}
              </p>
            )}
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users className="w-3 h-3" />
              {group.memberCount} members
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
