import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Calendar, Crown, Shield, Edit2, Trash2, LogOut, Key, Settings } from 'lucide-react';
import type { Chat, ChatMember } from '../../types/api.types';
import { chatService } from '../../services/chat.service';
import { useChatStore } from '../../stores/chatStore';
import { OnlineStatusIndicator } from '../common/OnlineStatusIndicator';
import { formatLastSeen } from '../../utils/helpers';
import { toast } from '../common/Toast';
import { confirm } from '../common/ConfirmModal';

const AVAILABLE_PERMISSIONS = [
  'SendMessage',
  'ManageMessages',
  'ManageReactions',
  'ManageUsers',
  'ManageChatInfo',
  'ManageBans',
  'PinMessages'
] as const;

interface GroupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat;
  currentUserId: string;
  onEditGroup?: () => void;
  onDeleteGroup?: () => void;
  onLeaveGroup?: () => void;
  onKickMember?: (userId: string) => void;
  onViewUserProfile?: (userId: string) => void;
  onBanMember?: (userId: string) => Promise<void>;
  onUnbanMember?: (userId: string) => Promise<void>;
  onUpdatePrivacy?: (privacy: 'public' | 'private') => Promise<void>;
}

interface ChatProfile {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdAt: string;
  members: ChatMember[];
  privacy?: 'public' | 'private';
}

export const GroupProfileModal: React.FC<GroupProfileModalProps> = ({
  isOpen,
  onClose,
  chat,
  currentUserId,
  onEditGroup,
  onDeleteGroup,
  onLeaveGroup,
  onKickMember,
  onViewUserProfile,
  onBanMember,
  onUpdatePrivacy,
}) => {
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState<ChatMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const { isUserOnline, getUserLastSeen, getOnlineMembersCount } = useChatStore();

  // Determine if current user is admin
  const currentMember = profile?.members.find(m => m.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';

  useEffect(() => {
    if (isOpen && chat.id) {
      loadProfile();
    }
  }, [isOpen, chat.id]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profileData = await chatService.getChatProfile(chat.id);
      setProfile(profileData as ChatProfile);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter members based on search query
  useEffect(() => {
    if (!profile?.members) {
      setFilteredMembers([]);
      return;
    }

    if (!memberSearchQuery.trim()) {
      setFilteredMembers(profile.members);
      return;
    }

    const query = memberSearchQuery.toLowerCase();
    const filtered = profile.members.filter(member =>
      member.user.username.toLowerCase().includes(query) ||
      member.user.email?.toLowerCase().includes(query)
    );

    setFilteredMembers(filtered);
  }, [profile?.members, memberSearchQuery]);

  const handleKick = async (userId: string) => {
    if (!onKickMember) return;

    const confirmed = await confirm({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the group?',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      onKickMember(userId);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setAddMemberQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const userService = await import('../../services/user.service').then(m => m.userService);
      const results = await userService.searchUsers(query);
      // Filter out users who are already members
      const memberIds = new Set(profile?.members.map(m => m.userId) || []);
      const filteredResults = results.filter((u: any) => !memberIds.has(u.id));
      setUserSearchResults(filteredResults);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!chat || !isAdmin) return;

    try {
      if (chat.type === 'group') {
        await chatService.addMemberToGroup(chat.id, userId);
      } else if (chat.type === 'channel') {
        await chatService.addMemberToChannel(chat.id, userId);
      }

      toast.success('Member added successfully');
      setShowAddMember(false);
      setAddMemberQuery('');
      setUserSearchResults([]);
      await loadProfile(); // Reload to show new member
    } catch (error: any) {
      console.error('Failed to add member:', error);
      toast.error(error.response?.data?.message || 'Failed to add member');
    }
  };

  const handleLeave = async () => {
    if (!onLeaveGroup) return;

    const confirmed = await confirm({
      title: 'Leave Group',
      message: 'Are you sure you want to leave this group? You will lose access to all messages and content.',
      confirmText: 'Leave',
      cancelText: 'Stay',
      variant: 'warning',
    });

    if (confirmed) {
      onLeaveGroup();
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!onDeleteGroup) return;

    const confirmed = await confirm({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This action cannot be undone and all messages will be permanently deleted.',
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      onDeleteGroup();
      onClose();
    }
  };

  // Group filtered members by role
  const groupedMembers = {
    admin: [] as ChatMember[],
    moderator: [] as ChatMember[],
    member: [] as ChatMember[],
  };

  filteredMembers.forEach(member => {
    groupedMembers[member.role].push(member);
  });

  const onlineCount = getOnlineMembersCount(chat.id);
  const totalMembers = profile?.members.length || 0;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30
            }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
            {chat.type === 'channel' ? 'Channel' : 'Group'} Profile
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={24} color="var(--text)" />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading profile...
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          {!isLoading && !error && profile && (
            <>
              {/* Avatar and Basic Info */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      marginBottom: '16px',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                      fontWeight: 700,
                      marginBottom: '16px',
                    }}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, color: 'var(--text)' }}>
                  {profile.name}
                </h3>
                {profile.description && (
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                    {profile.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <Users size={20} color="var(--text-muted)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>
                    {totalMembers}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Members</div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#51cf66',
                      margin: '0 auto 4px auto',
                    }}
                  />
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#51cf66' }}>
                    {onlineCount}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Online Now</div>
                </div>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <Calendar size={20} color="var(--text-muted)" style={{ marginBottom: '4px' }} />
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created</div>
                </div>
              </div>

              {/* Privacy Settings */}
              {profile.privacy && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'var(--text)'
                  }}>
                    Privacy
                  </h4>
                  <div style={{
                    padding: '16px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                        {profile.privacy === 'public' ? 'Public' : 'Private'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {profile.privacy === 'public'
                          ? 'Anyone can find and join'
                          : 'Invite-only membership'}
                      </div>
                    </div>
                    {isAdmin && onUpdatePrivacy && (
                      <button
                        onClick={async () => {
                          const newPrivacy = profile.privacy === 'public' ? 'private' : 'public';
                          const confirmed = await confirm({
                            title: 'Change Privacy',
                            message: `Change this ${chat?.type || 'chat'} to ${newPrivacy}? ${newPrivacy === 'private' ? 'Only invited members will be able to join.' : 'Anyone will be able to find and join.'}`,
                            confirmText: 'Change',
                            cancelText: 'Cancel',
                            variant: 'info',
                          });
                          if (confirmed) {
                            onUpdatePrivacy(newPrivacy);
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 600,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        Change to {profile.privacy === 'public' ? 'Private' : 'Public'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setShowAddMember(true)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: '#51cf66',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Users size={16} />
                      Add Member
                    </button>
                    {onEditGroup && (
                      <button
                        onClick={onEditGroup}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          backgroundColor: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Edit2 size={16} />
                        Edit {chat.type === 'channel' ? 'Channel' : 'Group'}
                      </button>
                    )}
                    {onDeleteGroup && (
                      <button
                        onClick={handleDelete}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Leave Group Button for non-admins */}
              {!isAdmin && onLeaveGroup && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    onClick={handleLeave}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <LogOut size={16} />
                    Leave {chat.type === 'channel' ? 'Channel' : 'Group'}
                  </button>
                </div>
              )}

              {/* Members List */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
                  Members ({totalMembers})
                </h4>

                {/* Member Search Bar */}
                {totalMembers > 5 && (
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        backgroundColor: 'var(--background)',
                        border: '2px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: 'var(--text)',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    />
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      marginTop: '4px'
                    }}>
                      Showing {filteredMembers.length} of {totalMembers} members
                    </div>
                  </div>
                )}

                {/* Admins */}
                {groupedMembers.admin.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Admins
                    </div>
                    {groupedMembers.admin.map((member) => (
                      <MemberItem
                        key={member.id}
                        member={member}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        isUserOnline={isUserOnline}
                        getUserLastSeen={getUserLastSeen}
                        onViewProfile={onViewUserProfile}
                        onKick={handleKick}
                        onBanMember={onBanMember}
                        chatId={chat.id}
                      />
                    ))}
                  </div>
                )}

                {/* Moderators */}
                {groupedMembers.moderator.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Moderators
                    </div>
                    {groupedMembers.moderator.map((member) => (
                      <MemberItem
                        key={member.id}
                        member={member}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        isUserOnline={isUserOnline}
                        getUserLastSeen={getUserLastSeen}
                        onViewProfile={onViewUserProfile}
                        onKick={handleKick}
                        onBanMember={onBanMember}
                        chatId={chat.id}
                      />
                    ))}
                  </div>
                )}

                {/* Members */}
                {groupedMembers.member.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Members
                    </div>
                    {groupedMembers.member.map((member) => (
                      <MemberItem
                        key={member.id}
                        member={member}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        isUserOnline={isUserOnline}
                        getUserLastSeen={getUserLastSeen}
                        onViewProfile={onViewUserProfile}
                        onKick={handleKick}
                        onBanMember={onBanMember}
                        chatId={chat.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Add Member Modal */}
    <AnimatePresence>
      {showAddMember && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAddMember(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>Add Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search users..."
              value={addMemberQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--text)',
                fontSize: '14px',
                marginBottom: '16px',
              }}
              autoFocus
            />

            {isSearchingUsers && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                Searching...
              </div>
            )}

            {!isSearchingUsers && userSearchResults.length === 0 && addMemberQuery && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No users found
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userSearchResults.map((user: any) => (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    backgroundColor: 'var(--background)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    >
                      {user.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        {user.username}
                      </div>
                      {user.email && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
};

interface MemberItemProps {
  member: ChatMember;
  currentUserId: string;
  isAdmin: boolean;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => string | undefined;
  onViewProfile?: (userId: string) => void;
  onKick?: (userId: string) => void;
  onBanMember?: (userId: string) => Promise<void>;
  chatId: string;
}

const MemberItem: React.FC<MemberItemProps> = ({
  member,
  currentUserId,
  isAdmin,
  isUserOnline,
  getUserLastSeen,
  onViewProfile,
  onKick,
  onBanMember,
  chatId,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const online = isUserOnline(member.userId);
  const lastSeen = getUserLastSeen(member.userId);
  const isCurrentUser = member.userId === currentUserId;

  const handleAddPermission = async (permission: string) => {
    try {
      await chatService.addUserPermission(chatId, member.userId, permission);
      toast.success(`Permission "${permission}" granted to ${member.user.username}`);
      setShowPermissions(false);
      setShowActions(false);
    } catch (error: any) {
      console.error('Failed to add permission:', error);
      toast.error(error.response?.data?.message || 'Failed to grant permission');
    }
  };

  const getRoleBadge = () => {
    if (member.role === 'admin') {
      return (
        <motion.span
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 15
          }}
          style={{
            padding: '4px 10px',
            backgroundColor: '#ffd43b',
            color: '#000',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(255, 212, 59, 0.4)',
          }}
        >
          <Crown size={14} />
          Admin
        </motion.span>
      );
    }
    if (member.role === 'moderator') {
      return (
        <motion.span
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 15,
            delay: 0.05
          }}
          style={{
            padding: '4px 10px',
            backgroundColor: '#74c0fc',
            color: '#000',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(116, 192, 252, 0.4)',
          }}
        >
          <Shield size={14} />
          Mod
        </motion.span>
      );
    }
    if (member.role === 'member') {
      return (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 15,
            delay: 0.1
          }}
          style={{
            padding: '4px 10px',
            backgroundColor: '#adb5bd',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Member
        </motion.span>
      );
    }
    return null;
  };

  // Determine if current user can manage this member
  const canManage = isAdmin && !isCurrentUser && member.role !== 'admin';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: 'var(--background)',
        borderRadius: '8px',
        marginBottom: '8px',
        cursor: onViewProfile ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
        position: 'relative',
      }}
      onClick={() => onViewProfile && onViewProfile(member.userId)}
      onMouseEnter={(e) => {
        if (onViewProfile) {
          e.currentTarget.style.backgroundColor = 'var(--border)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--background)';
      }}
    >
      {/* Avatar with online indicator */}
      <div style={{ position: 'relative', marginRight: '12px' }}>
        {member.user.avatar ? (
          <img
            src={member.user.avatar}
            alt={member.user.username}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            {member.user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <OnlineStatusIndicator
          isOnline={online}
          lastSeen={lastSeen}
          size="sm"
          position="avatar-overlay"
        />
      </div>

      {/* User info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {member.user.username}
            {isCurrentUser && ' (You)'}
          </span>
          {getRoleBadge()}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {online ? 'Online' : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline'}
        </div>
      </div>

      {/* Actions - Beautiful Glowing Menu */}
      {canManage && (
        <div style={{ position: 'relative' }}>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: showActions
                ? '0 0 15px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(0, 0, 0, 0.15)'
                : '0 2px 8px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
            }}
          >
            <Settings size={16} color="#818cf8" />
          </motion.button>
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: '100%',
                  marginBottom: '8px',
                  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.95))',
                  border: '2px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.2)',
                  minWidth: '200px',
                  zIndex: 1000,
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#818cf8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Manage {member.user.username}
                  </span>
                </div>

                {/* Permissions Button */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPermissions(!showPermissions);
                  }}
                  whileHover={{ backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                  }}>
                    <Key size={14} color="white" />
                  </div>
                  Manage Permissions
                </motion.button>

                {/* Permissions List */}
                <AnimatePresence>
                  {showPermissions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        overflow: 'hidden',
                      }}
                    >
                      {AVAILABLE_PERMISSIONS.map((permission, idx) => (
                        <motion.button
                          key={permission}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPermission(permission);
                          }}
                          whileHover={{
                            backgroundColor: 'rgba(99, 102, 241, 0.2)',
                            paddingLeft: '24px',
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px 10px 20px',
                            background: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: '#94a3b8',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            boxShadow: '0 0 6px rgba(102, 126, 234, 0.5)',
                          }} />
                          {permission}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Danger Actions */}
                <div style={{
                  borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                  marginTop: '4px',
                }}>
                  {onBanMember && (
                    <motion.button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await confirm({
                          title: 'Ban Member',
                          message: `Are you sure you want to ban ${member.user.username}? They will not be able to rejoin this group.`,
                          confirmText: 'Ban',
                          cancelText: 'Cancel',
                          variant: 'danger',
                        });
                        if (confirmed) {
                          onBanMember(member.userId);
                        }
                        setShowActions(false);
                      }}
                      whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                      }}>
                        <Shield size={14} color="white" />
                      </div>
                      Ban Member
                    </motion.button>
                  )}
                  {onKick && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        onKick(member.userId);
                        setShowActions(false);
                      }}
                      whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#f87171',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.4)',
                      }}>
                        <Trash2 size={14} color="white" />
                      </div>
                      Remove Member
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
