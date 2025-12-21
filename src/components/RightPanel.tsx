import React, { useState, useEffect } from 'react';
import { UserX, UserCheck, Trash2, Ban } from 'lucide-react';
import type { Chat, ChatMember } from '../types/api.types';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { chatService } from '../services/chat.service';
import { userService } from '../services/user.service';
import { getInitials, fixMinioUrl } from '../utils/helpers';
import { getBanErrorMessage, extractErrorMessage } from '../utils/errorHandler';
import { AddMemberModal } from './ChatView';
import { PermissionModal } from './modals/PermissionModal';
import { toast } from './common/Toast';
import { confirm } from './common/ConfirmModal';
import { usePermissions } from '../hooks/usePermission';
import styles from './Dashboard.module.css';

export interface RightPanelProps {
  currentChat: Chat | null;
  onReloadChat: () => Promise<void>;
  onViewUserProfile: (userId: string) => void;
  onConversationDeleted?: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ currentChat, onReloadChat, onViewUserProfile, onConversationDeleted }) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ChatMember | null>(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [chatProfile, setChatProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const { user: currentUser } = useAuthStore();

  // Get permissions for current chat
  const { canAddUsers, canManageChatInfo, canManageBans, canManageUsers } = usePermissions(currentChat?.id);

  // Determine if current user is admin
  const currentMember = chatProfile?.members?.find((m: any) => m.userId === currentUser?.id);
  const isAdmin = currentMember?.role === 'admin';

  // Fetch chat profile to get full member/participant data
  useEffect(() => {
    const fetchChatProfile = async () => {
      if (!currentChat?.id) return;

      // Handle temp_dm_ chats - these are new DMs that don't exist yet
      if (currentChat.id.startsWith('temp_dm_')) {
        const userId = currentChat.id.replace('temp_dm_', '');
        console.log('[RightPanel] Temp DM chat, loading user profile for:', userId);
        setIsLoadingProfile(true);
        try {
          const { userService } = await import('../services/user.service');
          const userProfile = await userService.getUserProfile(userId);
          // Create a mock chat profile from user data
          setChatProfile({
            id: currentChat.id,
            name: userProfile.username,
            type: 'dm',
            avatar: userProfile.avatar,
            members: [{
              userId: userProfile.id,
              user: userProfile,
              role: 'member',
            }],
            participantsCount: 2,
          });
        } catch (error) {
          console.error('[RightPanel] Failed to load user profile:', error);
          setChatProfile(null);
        } finally {
          setIsLoadingProfile(false);
        }
        return;
      }

      setIsLoadingProfile(true);
      try {
        const profile = await chatService.getChatProfile(currentChat.id);
        console.log('[RightPanel] Chat profile loaded:', profile);
        setChatProfile(profile);
      } catch (error) {
        console.error('[RightPanel] Failed to load chat profile:', error);
        setChatProfile(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchChatProfile();
  }, [currentChat?.id]);

  // Get block status from store
  const { usersYouBlocked, addBlockedUser, removeBlockedUser } = useChatStore();

  // Check block status for DM chats
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (!currentChat || currentChat.type !== 'dm' || !chatProfile?.members) {
        setIsUserBlocked(false);
        return;
      }

      const otherMember = chatProfile.members.find((m: any) => m.userId !== currentUser?.id);
      if (!otherMember) {
        setIsUserBlocked(false);
        return;
      }

      // First check if already in store
      if (usersYouBlocked.has(otherMember.userId)) {
        setIsUserBlocked(true);
        return;
      }

      try {
        const blocked = await userService.getBlockStatus(otherMember.userId);
        setIsUserBlocked(blocked);
        // Sync to store if blocked
        if (blocked) {
          addBlockedUser(otherMember.userId);
        }
      } catch (error) {
        console.error('[RightPanel] Failed to check block status:', error);
        setIsUserBlocked(false);
      }
    };

    checkBlockStatus();
  }, [currentChat?.id, currentChat?.type, chatProfile?.members, currentUser?.id]);

  // Subscribe to store changes
  useEffect(() => {
    if (!currentChat || currentChat.type !== 'dm' || !chatProfile?.members) {
      return;
    }

    const otherMember = chatProfile.members.find((m: any) => m.userId !== currentUser?.id);
    if (!otherMember) return;

    const isBlockedInStore = usersYouBlocked.has(otherMember.userId);
    if (isBlockedInStore !== isUserBlocked) {
      setIsUserBlocked(isBlockedInStore);
    }
  }, [usersYouBlocked, currentChat?.id, chatProfile?.members, currentUser?.id]);

  // Handle block/unblock user
  const handleBlockUser = async () => {
    if (!otherUser) return;

    const action = isUserBlocked ? 'unblock' : 'block';
    const confirmed = await confirm({
      title: isUserBlocked ? 'Unblock User' : 'Block User',
      message: isUserBlocked
        ? `Are you sure you want to unblock ${otherUser.username}? They will be able to message you again.`
        : `Are you sure you want to block ${otherUser.username}? They won't be able to send you messages.`,
      confirmText: isUserBlocked ? 'Unblock' : 'Block',
      cancelText: 'Cancel',
      variant: isUserBlocked ? 'warning' : 'danger',
    });

    if (!confirmed) return;

    setIsBlockingUser(true);
    try {
      if (isUserBlocked) {
        await userService.unblockUser(otherUser.id);
        // Update store immediately for instant UI feedback
        removeBlockedUser(otherUser.id);
        toast.success(`${otherUser.username} has been unblocked`);
      } else {
        await userService.blockUser(otherUser.id);
        // Update store immediately for instant UI feedback
        addBlockedUser(otherUser.id);
        toast.success(`${otherUser.username} has been blocked`);
      }
      setIsUserBlocked(!isUserBlocked);
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      toast.error(extractErrorMessage(error, `Failed to ${action} user`));
    } finally {
      setIsBlockingUser(false);
    }
  };

  // Handle delete conversation
  const handleDeleteConversation = async () => {
    if (!currentChat) return;

    const confirmed = await confirm({
      title: 'Delete Conversation',
      message: `Are you sure you want to delete this conversation? All messages will be permanently deleted.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeletingConversation(true);
    try {
      await chatService.deleteConversation(currentChat.id);
      toast.success('Conversation deleted');
      onConversationDeleted?.();
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error(extractErrorMessage(error, 'Failed to delete conversation'));
    } finally {
      setIsDeletingConversation(false);
    }
  };

  // Handle delete + block
  const handleDeleteAndBlock = async () => {
    if (!currentChat || !otherUser) return;

    const confirmed = await confirm({
      title: 'Delete & Block',
      message: `Are you sure you want to delete this conversation and block ${otherUser.username}? All messages will be deleted and they won't be able to message you.`,
      confirmText: 'Delete & Block',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    setIsDeletingConversation(true);
    try {
      // First delete the conversation, then block the user
      await chatService.deleteConversation(currentChat.id);
      await userService.blockUser(otherUser.id);
      toast.success(`Conversation deleted and ${otherUser.username} blocked`);
      onConversationDeleted?.();
    } catch (error) {
      console.error('Failed to delete and block:', error);
      toast.error(extractErrorMessage(error, 'Failed to delete and block'));
    } finally {
      setIsDeletingConversation(false);
    }
  };

  if (!currentChat) {
    return <div className={styles.rightPanel} />;
  }

  // For DMs, get the other user (not current user)
  // Chat profile returns members array, find the other participant
  const otherUser = currentChat.type === 'dm' && chatProfile?.members
    ? chatProfile.members.find((m: any) => m.userId !== currentUser?.id)?.user
    : null;

  const handleBanMember = async (member: ChatMember) => {
    const confirmed = await confirm({
      title: 'Ban Member',
      message: `Are you sure you want to ban "${member.user.username}" from this chat? They won't be able to rejoin.`,
      confirmText: 'Ban',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await chatService.banUser(currentChat.id, member.userId);
      toast.success(`${member.user.username} has been banned and removed from chat.`);
      await onReloadChat();
    } catch (error) {
      console.error('Failed to ban user:', error);
      toast.error(getBanErrorMessage(error));
    }
  };

  const handleTogglePrivacy = async () => {
    const newPrivacy = currentChat.privacy === 'public' ? 'private' : 'public';

    const confirmed = await confirm({
      title: 'Change Privacy',
      message: `Change this chat to ${newPrivacy}? ${newPrivacy === 'private' ? 'Only invited members will be able to join.' : 'Anyone will be able to find and join.'}`,
      confirmText: 'Change',
      cancelText: 'Cancel',
      variant: 'info',
    });

    if (!confirmed) return;

    setIsTogglingPrivacy(true);
    try {
      await chatService.updateChatPrivacy(currentChat.id, newPrivacy);
      toast.success(`Chat privacy changed to ${newPrivacy}.`);
      await onReloadChat();
    } catch (error) {
      console.error('Failed to update privacy:', error);
      toast.error('Failed to update privacy. You may not have permission.');
    } finally {
      setIsTogglingPrivacy(false);
    }
  };

  return (
    <div className={styles.rightPanel}>
      <div className={styles.panelHeader}>
        <h3>Chat Info</h3>
      </div>
      <div className={styles.infoContent}>
        {currentChat.type === 'dm' ? (
          <>
            <div className={styles.infoSection}>
              <div className={styles.infoLabel} style={{ color: 'var(--text)', marginBottom: '12px', fontWeight: 600 }}>Member</div>

              {isLoadingProfile ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading profile...
                </div>
              ) : otherUser ? (
                <div
                  onClick={() => onViewUserProfile(otherUser.id)}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--background)',
                    border: '2px solid var(--border)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title="Click to view full profile"
                >
                  <div className={styles.memberAvatar}>
                    {(otherUser.avatar || otherUser.avatarUrl) ? (
                      <img
                        src={fixMinioUrl(otherUser.avatar || otherUser.avatarUrl)}
                        alt={otherUser.username}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        className={styles.avatarFallback}
                        style={{
                          width: '50px',
                          height: '50px',
                          fontSize: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          borderRadius: '50%',
                          fontWeight: 600
                        }}
                      >
                        {getInitials(otherUser.username)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                      {otherUser.username}
                    </div>
                    {otherUser.description && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
                        {otherUser.description}
                      </div>
                    )}
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                      {otherUser.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                      👤 Tap to view profile
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No user information available
                </div>
              )}
            </div>

            {/* Actions Section for DM */}
            {otherUser && (
              <div className={styles.infoSection} style={{ marginTop: '16px' }}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)', marginBottom: '12px', fontWeight: 600 }}>Actions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Block/Unblock User Button */}
                  <button
                    onClick={handleBlockUser}
                    disabled={isBlockingUser || isDeletingConversation}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: isUserBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: isUserBlocked ? '#10b981' : '#ef4444',
                      border: `1px solid ${isUserBlocked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: '8px',
                      cursor: (isBlockingUser || isDeletingConversation) ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      opacity: (isBlockingUser || isDeletingConversation) ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isBlockingUser && !isDeletingConversation) {
                        e.currentTarget.style.backgroundColor = isUserBlocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isUserBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    {isUserBlocked ? (
                      <>
                        <UserCheck size={16} />
                        {isBlockingUser ? 'Unblocking...' : 'Unblock User'}
                      </>
                    ) : (
                      <>
                        <Ban size={16} />
                        {isBlockingUser ? 'Blocking...' : 'Block User'}
                      </>
                    )}
                  </button>

                  {/* Delete Conversation Button */}
                  <button
                    onClick={handleDeleteConversation}
                    disabled={isDeletingConversation || isBlockingUser}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      cursor: (isDeletingConversation || isBlockingUser) ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      opacity: (isDeletingConversation || isBlockingUser) ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeletingConversation && !isBlockingUser) {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    }}
                  >
                    <Trash2 size={16} />
                    {isDeletingConversation ? 'Deleting...' : 'Delete Conversation'}
                  </button>

                  {/* Delete + Block Button */}
                  {!isUserBlocked && (
                    <button
                      onClick={handleDeleteAndBlock}
                      disabled={isDeletingConversation || isBlockingUser}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        color: '#dc2626',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: '8px',
                        cursor: (isDeletingConversation || isBlockingUser) ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        opacity: (isDeletingConversation || isBlockingUser) ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isDeletingConversation && !isBlockingUser) {
                          e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                      }}
                    >
                      <UserX size={16} />
                      Delete & Block
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Chat Name & Description */}
            {(chatProfile?.name || chatProfile?.description) && (
              <div className={styles.infoSection}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)', marginBottom: '8px', fontWeight: 600 }}>
                  {currentChat.type === 'group' ? 'Group' : 'Channel'} Info
                </div>
                <div style={{ padding: '12px', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
                    {chatProfile.name || currentChat.name}
                  </div>
                  {chatProfile.description && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                      {chatProfile.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      👥 {chatProfile.participantsCount || 0} members
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      🟢 {chatProfile.participantsOnline || 0} online
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Toggle - only show for admin or users with ManageChatInfo permission */}
            {(isAdmin || canManageChatInfo) && (
              <div className={styles.infoSection}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)' }}>Privacy</div>
                <button
                  onClick={handleTogglePrivacy}
                  disabled={isTogglingPrivacy}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    width: '100%',
                    marginTop: '4px',
                  }}
                >
                  {isTogglingPrivacy ? 'Changing...' : `Current: ${currentChat.privacy || 'private'} (Click to toggle)`}
                </button>
              </div>
            )}

            {/* Add Member Button - only show for admin or users with AddUsers permission */}
            {(isAdmin || canAddUsers) && (
              <div className={styles.infoSection}>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  ➕ Add Member
                </button>
              </div>
            )}

            {/* Members List with Toggle */}
            <div className={styles.infoSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)' }}>
                  Members ({chatProfile?.participants?.length || currentChat.members?.length || 0})
                </div>
                <button
                  onClick={() => setShowMembersList(!showMembersList)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {showMembersList ? '▼ Hide' : '▶ Show'}
                </button>
              </div>
              {showMembersList && (
                <div className={styles.memberList}>
                  {isLoadingProfile ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Loading members...
                    </div>
                  ) : chatProfile?.members && chatProfile.members.length > 0 ? (
                    chatProfile.members.map((member: any) => {
                      // Use normalized member structure - apply fixMinioUrl to avatar
                      const memberData = {
                        id: member.id || member.userId,
                        userId: member.userId || member.id,
                        user: {
                          id: member.user?.id || member.userId || member.id,
                          username: member.user?.username || member.username,
                          avatar: fixMinioUrl(member.user?.avatar || member.user?.avatarUrl || member.avatarUrl),
                          bio: member.user?.bio || member.user?.description || member.description,
                        },
                        role: member.role || 'member' as const,
                      };

                      return (
                        <div
                          key={memberData.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            marginBottom: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--surface)';
                            e.currentTarget.style.borderColor = 'var(--accent)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--background)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          <div
                            className={styles.memberAvatar}
                            style={{ flexShrink: 0, cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUserProfile(memberData.userId);
                            }}
                            title="View profile"
                          >
                            {memberData.user.avatar ? (
                              <img src={memberData.user.avatar} alt={memberData.user.username} />
                            ) : (
                              <div className={styles.avatarFallback}>{getInitials(memberData.user.username)}</div>
                            )}
                          </div>
                          <div
                            className={styles.memberInfo}
                            style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewUserProfile(memberData.userId);
                            }}
                            title="View profile"
                          >
                            <div className={styles.memberName} style={{ color: 'var(--text)', fontWeight: 600 }}>
                              {memberData.user.username}
                            </div>
                            {member.user?.isOnline !== undefined && (
                              <div className={styles.memberRole} style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                {member.user.isOnline ? '🟢 Online' : '⚫ Offline'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            {/* Manage Permissions button - only for admin or users with ManageUsers permission */}
                            {(isAdmin || canManageUsers) && (memberData.role as string) !== 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMember(memberData as ChatMember);
                                  setShowPermissionModal(true);
                                }}
                                title="Manage Permissions"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#6366f1',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366f1')}
                              >
                                🔐
                              </button>
                            )}
                            {/* Ban User button - only for admin or users with ManageBans permission */}
                            {(isAdmin || canManageBans) && (memberData.role as string) !== 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBanMember(memberData as ChatMember);
                                }}
                                title="Ban User"
                                style={{
                                  padding: '6px 10px',
                                  backgroundColor: '#dc3545',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c82333')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc3545')}
                              >
                                🚫
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No members found
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentChat.description && (
              <div className={styles.infoSection}>
                <div className={styles.infoLabel} style={{ color: 'var(--text)' }}>Description</div>
                <p style={{ color: 'var(--text-secondary)' }}>{currentChat.description}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          chatId={currentChat.id}
          chatType={currentChat.type}
          onMemberAdded={onReloadChat}
        />
      )}

      {/* Permission Management Modal */}
      {showPermissionModal && selectedMember && (
        <PermissionModal
          isOpen={showPermissionModal}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedMember(null);
          }}
          chatId={currentChat.id}
          member={selectedMember}
          onPermissionsChanged={onReloadChat}
        />
      )}
    </div>
  );
};
