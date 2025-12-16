import React, { useState, useEffect } from 'react';
import type { Chat, ChatMember } from '../types/api.types';
import { useAuthStore } from '../stores/authStore';
import { chatService } from '../services/chat.service';
import { getInitials, fixMinioUrl } from '../utils/helpers';
import { getBanErrorMessage } from '../utils/errorHandler';
import { AddMemberModal, PermissionModal } from './ChatView';
import { toast } from './common/Toast';
import { confirm } from './common/ConfirmModal';
import styles from './Dashboard.module.css';

export interface RightPanelProps {
  currentChat: Chat | null;
  onReloadChat: () => Promise<void>;
  onViewUserProfile: (userId: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ currentChat, onReloadChat, onViewUserProfile }) => {
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ChatMember | null>(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [chatProfile, setChatProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const { user: currentUser } = useAuthStore();

  // Fetch chat profile to get full member/participant data
  useEffect(() => {
    const fetchChatProfile = async () => {
      if (!currentChat?.id) return;

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

            {/* Privacy Toggle */}
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

            {/* Add Member Button */}
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
                            {(memberData.role as string) !== 'admin' && (
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
