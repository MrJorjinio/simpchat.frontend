import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Calendar, Crown, Shield, Edit2, Trash2, LogOut, Key, Settings, UserPlus, Ban } from 'lucide-react';
import type { Chat, ChatMember } from '../../types/api.types';
import { chatService } from '../../services/chat.service';
import { useChatStore } from '../../stores/chatStore';
import { signalRService } from '../../services/signalr.service';
import { OnlineStatusIndicator } from '../common/OnlineStatusIndicator';
import { usePermissions } from '../../hooks/usePermission';
import { formatLastSeen } from '../../utils/helpers';
import { toast } from '../common/Toast';
import { confirm } from '../common/ConfirmModal';
import { isBanError, getBanErrorMessage, extractErrorMessage } from '../../utils/errorHandler';
import { PermissionModal } from './PermissionModal';

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

interface BannedUser {
  userId: string;
  username: string;
  avatarUrl?: string;
  bannedAt: string;
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
  const [isJoining, setIsJoining] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [presenceLoaded, setPresenceLoaded] = useState(false);
  const [showBannedUsers, setShowBannedUsers] = useState(false);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [isLoadingBannedUsers, setIsLoadingBannedUsers] = useState(false);

  const { isUserOnline, getUserLastSeen, loadChats, setInitialPresenceStates } = useChatStore();

  // Determine if current user is admin
  const currentMember = profile?.members.find(m => m.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';

  // Get permissions for current user
  const { canAddUsers, canManageChatInfo, canManageBans, canManageUsers } = usePermissions(chat?.id);

  useEffect(() => {
    if (isOpen && chat.id) {
      setIsBanned(false); // Reset banned state when modal opens
      setPresenceLoaded(false); // Reset presence state when modal opens
      loadProfile();
    }
  }, [isOpen, chat.id]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profileData = await chatService.getChatProfile(chat.id);
      setProfile(profileData as ChatProfile);

      // Fetch presence states for all profile members
      const memberIds = (profileData as ChatProfile).members?.map(m => m.userId) || [];
      if (memberIds.length > 0) {
        try {
          const presenceStates = await signalRService.getPresenceStates(memberIds);
          if (Object.keys(presenceStates).length > 0) {
            setInitialPresenceStates(presenceStates);
            setPresenceLoaded(true); // Trigger re-render with updated presence
          }
        } catch (presenceError) {
          console.error('[GroupProfileModal] Failed to fetch presence states:', presenceError);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine if current user is a member
  const isMember = profile?.members.some(m => m.userId === currentUserId);

  const handleJoin = async () => {
    if (!chat || !chat.type) return;

    setIsJoining(true);
    try {
      const chatType = chat.type as 'group' | 'channel';
      await chatService.joinChat(chat.id, chatType);
      toast.success(`Successfully joined the ${chatType}!`);
      await loadChats(); // Reload chats to update sidebar
      await loadProfile(); // Reload profile to update member list
    } catch (error: any) {
      console.error('Failed to join:', error);
      if (isBanError(error)) {
        setIsBanned(true);
        toast.error(getBanErrorMessage(error));
      } else {
        toast.error(extractErrorMessage(error, 'Failed to join'));
      }
    } finally {
      setIsJoining(false);
    }
  };

  const loadBannedUsers = async () => {
    if (!chat?.id || (!isAdmin && !canManageBans)) return;

    setIsLoadingBannedUsers(true);
    try {
      const banned = await chatService.getBannedUsers(chat.id);
      setBannedUsers(banned);
    } catch (error) {
      console.error('[GroupProfileModal] Failed to load banned users:', error);
      toast.error(extractErrorMessage(error, 'Failed to load banned users'));
    } finally {
      setIsLoadingBannedUsers(false);
    }
  };

  const handleUnban = async (userId: string, username: string) => {
    const confirmed = await confirm({
      title: 'Unban User',
      message: `Are you sure you want to unban ${username}? They will be able to rejoin this ${chat.type === 'channel' ? 'channel' : 'group'}.`,
      confirmText: 'Unban',
      cancelText: 'Cancel',
      variant: 'info',
    });

    if (!confirmed) return;

    try {
      await chatService.unbanUser(chat.id, userId);
      toast.success(`${username} has been unbanned`);
      // Reload banned users list
      await loadBannedUsers();
    } catch (error) {
      console.error('[GroupProfileModal] Failed to unban user:', error);
      toast.error(extractErrorMessage(error, 'Failed to unban user'));
    }
  };

  // Load banned users when showing the banned users section
  useEffect(() => {
    if (showBannedUsers && (isAdmin || canManageBans)) {
      loadBannedUsers();
    }
  }, [showBannedUsers, isAdmin, canManageBans]);

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
    if (!chat || (!isAdmin && !canAddUsers)) return;

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
      if (isBanError(error)) {
        toast.error('This user is banned from this chat and cannot be added.');
      } else {
        toast.error(extractErrorMessage(error, 'Failed to add member'));
      }
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

  // Calculate online count directly from profile members (more reliable than store lookup)
  // Note: presenceLoaded state change triggers re-render after presence states are fetched
  const onlineCount = profile?.members.filter(m => isUserOnline(m.userId)).length || 0;
  const totalMembers = profile?.members.length || 0;

  // Debug log for online count
  console.log('[GroupProfileModal] Online count:', onlineCount, 'Total members:', totalMembers, 'Presence loaded:', presenceLoaded);

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
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
            aria-label="Close"
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
              fontSize: '24px',
              fontWeight: 300,
              lineHeight: 1,
              color: 'var(--text)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
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
              {(isAdmin || canAddUsers || canManageChatInfo) && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(isAdmin || canAddUsers) && (
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
                    )}
                    {(isAdmin || canManageChatInfo) && onEditGroup && (
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
                    {isAdmin && onDeleteGroup && (
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

              {/* Banned User Message */}
              {isBanned && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <Ban size={32} color="#ef4444" style={{ marginBottom: '8px' }} />
                  <h4 style={{ margin: '0 0 8px 0', color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>
                    You Are Banned
                  </h4>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                    Sorry, you have been banned from this {chat.type === 'channel' ? 'channel' : 'group'} and cannot rejoin.
                  </p>
                </div>
              )}

              {/* Join Button for non-members (public groups/channels only) */}
              {!isMember && !isBanned && profile?.privacy === 'public' && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    onClick={handleJoin}
                    disabled={isJoining}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      backgroundColor: isJoining ? 'var(--text-muted)' : '#51cf66',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isJoining ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <UserPlus size={18} />
                    {isJoining ? 'Joining...' : `Join ${chat.type === 'channel' ? 'Channel' : 'Group'}`}
                  </button>
                </div>
              )}

              {/* Private group/channel message for non-members */}
              {!isMember && !isBanned && profile?.privacy === 'private' && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: 'var(--background)',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <Shield size={24} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                    This is a private {chat.type === 'channel' ? 'channel' : 'group'}. You need an invitation to join.
                  </p>
                </div>
              )}

              {/* Leave Group Button for non-admins */}
              {!isAdmin && isMember && onLeaveGroup && (
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

              {/* Banned Users Button (for admins or users with ManageBans permission) */}
              {(isAdmin || canManageBans) && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    onClick={() => setShowBannedUsers(true)}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: 'var(--background)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--background)';
                    }}
                  >
                    <Ban size={16} />
                    View Banned Users
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
                        canManageBans={canManageBans}
                        canManageUsers={canManageUsers}
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
                        canManageBans={canManageBans}
                        canManageUsers={canManageUsers}
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
                        canManageBans={canManageBans}
                        canManageUsers={canManageUsers}
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
          transition={{ duration: 0.15 }}
          onClick={() => setShowAddMember(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '100%',
              padding: '20px',
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
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-muted)',
                  fontSize: '22px',
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                ×
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

    {/* Banned Users Modal */}
    <AnimatePresence>
      {showBannedUsers && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1002,
          }}
          onClick={() => setShowBannedUsers(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--card)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              maxHeight: '500px',
              overflowY: 'auto',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <h3 style={{ margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ban size={20} color="#ef4444" />
                Banned Users
              </h3>
              <button
                onClick={() => setShowBannedUsers(false)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-muted)',
                  fontSize: '22px',
                  fontWeight: 300,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {isLoadingBannedUsers && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                Loading banned users...
              </div>
            )}

            {!isLoadingBannedUsers && bannedUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No banned users
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bannedUsers.map((user) => (
                <div
                  key={user.userId}
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
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
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
                          backgroundColor: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      >
                        {user.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{user.username}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Banned {new Date(user.bannedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnban(user.userId, user.username)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#51cf66',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    Unban
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
  canManageBans?: boolean;
  canManageUsers?: boolean;
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
  canManageBans = false,
  canManageUsers = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const online = isUserOnline(member.userId);
  const lastSeen = getUserLastSeen(member.userId);
  const isCurrentUser = member.userId === currentUserId;

  const getRoleBadge = () => {
    if (member.role === 'admin') {
      return (
        <span
          style={{
            padding: '3px 8px',
            backgroundColor: '#fbbf24',
            color: '#000',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Crown size={12} />
          Admin
        </span>
      );
    }
    if (member.role === 'moderator') {
      return (
        <span
          style={{
            padding: '3px 8px',
            backgroundColor: '#60a5fa',
            color: '#000',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Shield size={12} />
          Mod
        </span>
      );
    }
    if (member.role === 'member') {
      return (
        <span
          style={{
            padding: '3px 8px',
            backgroundColor: '#94a3b8',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Member
        </span>
      );
    }
    return null;
  };

  // Determine if current user can manage this member
  // Admin can manage all non-admin members
  // Users with specific permissions can perform those actions on non-admin members
  const canManage = !isCurrentUser && member.role !== 'admin' && (isAdmin || canManageBans || canManageUsers);

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

      {/* Actions Menu */}
      {canManage && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <Settings size={18} color="var(--text-muted)" />
          </button>
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.1 }}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: '100%',
                  marginBottom: '4px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                  minWidth: '180px',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Manage {member.user.username}
                  </span>
                </div>

                {/* Permissions Button - only show for admins or users with ManageUsers permission */}
                {(isAdmin || canManageUsers) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActions(false);
                      setShowPermissionModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Key size={14} color="var(--text-muted)" />
                    Manage Permissions
                  </button>
                )}

                {/* Danger Actions */}
                <div style={{
                  borderTop: '1px solid var(--border)',
                }}>
                  {(isAdmin || canManageBans) && onBanMember && (
                    <button
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
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Shield size={14} />
                      Ban Member
                    </button>
                  )}
                  {isAdmin && onKick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onKick(member.userId);
                        setShowActions(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.1s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(249, 115, 22, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={14} />
                      Remove Member
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Permission Modal */}
      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        chatId={chatId}
        member={{
          id: member.id || member.userId || '',
          userId: member.userId,
          user: {
            id: member.user.id || member.userId,
            username: member.user.username,
            avatarUrl: member.user.avatar,
          },
          role: (member.role as 'admin' | 'moderator' | 'member') || 'member',
        }}
        onPermissionsChanged={async () => {
          // Permissions are changed, can reload if needed
        }}
      />
    </div>
  );
};
