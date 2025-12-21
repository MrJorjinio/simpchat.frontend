import React, { useState, useEffect } from 'react';
import { Shield, MessageSquare, Users, Settings, Ban, Pin, UserPlus, Loader2 } from 'lucide-react';
import { extractErrorMessage } from '../../utils/errorHandler';
import { toast } from '../common/Toast';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import styles from './PermissionModal.module.css';

export interface ChatMember {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  role: 'admin' | 'moderator' | 'member';
}

export interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  member: ChatMember;
  onPermissionsChanged: () => Promise<void>;
}

interface PermissionDef {
  name: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'messaging' | 'moderation' | 'management';
}

const PERMISSIONS: PermissionDef[] = [
  {
    name: 'SendMessage',
    label: 'Send Messages',
    description: 'Allow sending messages in this chat',
    icon: <MessageSquare size={18} />,
    category: 'messaging',
  },
  {
    name: 'ManageMessages',
    label: 'Manage Messages',
    description: 'Edit or delete messages from other users',
    icon: <Settings size={18} />,
    category: 'moderation',
  },
  {
    name: 'AddUsers',
    label: 'Add Users',
    description: 'Invite new members to this chat',
    icon: <UserPlus size={18} />,
    category: 'management',
  },
  {
    name: 'ManageUsers',
    label: 'Manage Users',
    description: 'Remove members and manage their roles',
    icon: <Users size={18} />,
    category: 'management',
  },
  {
    name: 'ManageChatInfo',
    label: 'Manage Chat Info',
    description: 'Edit chat name, description, and avatar',
    icon: <Settings size={18} />,
    category: 'management',
  },
  {
    name: 'ManageBans',
    label: 'Manage Bans',
    description: 'Ban or unban users from this chat',
    icon: <Ban size={18} />,
    category: 'moderation',
  },
  {
    name: 'PinMessages',
    label: 'Pin Messages',
    description: 'Pin important messages for all members',
    icon: <Pin size={18} />,
    category: 'messaging',
  },
];

const CATEGORIES = {
  messaging: { label: 'Messaging', order: 1 },
  moderation: { label: 'Moderation', order: 2 },
  management: { label: 'Management', order: 3 },
};

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  chatId,
  member,
  onPermissionsChanged,
}) => {
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPermissions();
      setIsClosing(false);
    }
  }, [isOpen, chatId, member.userId]);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const { permissionService } = await import('../../services/permission.service');
      const response = await permissionService.getUserPermissions(chatId, member.userId);
      // Backend returns { userId, username, chatId, permissions: [{ permissionId, permissionName }] }
      const permissionsArray = response?.permissions || response;
      const permissionNames = Array.isArray(permissionsArray)
        ? permissionsArray.map((p: any) => p.permissionName || p.name || p)
        : [];
      setUserPermissions(permissionNames);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setUserPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePermission = async (permissionName: string) => {
    const hasPermission = userPermissions.includes(permissionName);
    setUpdatingPermission(permissionName);

    // Get current user to check if we're modifying our own permissions
    const currentUser = useAuthStore.getState().user;
    const isModifyingOwnPermissions = currentUser?.id === member.userId;

    try {
      const { permissionService } = await import('../../services/permission.service');

      if (hasPermission) {
        await permissionService.revokePermission(chatId, member.userId, permissionName);
        setUserPermissions(userPermissions.filter((p) => p !== permissionName));

        // If modifying own permissions, update store immediately for instant UI feedback
        if (isModifyingOwnPermissions) {
          useChatStore.getState().revokePermission(chatId, permissionName);
        }

        toast.success(`Revoked "${PERMISSIONS.find(p => p.name === permissionName)?.label}" permission`);
      } else {
        await permissionService.grantPermission(chatId, member.userId, permissionName);
        setUserPermissions([...userPermissions, permissionName]);

        // If modifying own permissions, update store immediately for instant UI feedback
        if (isModifyingOwnPermissions) {
          useChatStore.getState().grantPermission(chatId, permissionName);
        }

        toast.success(`Granted "${PERMISSIONS.find(p => p.name === permissionName)?.label}" permission`);
      }

      await onPermissionsChanged();
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error(extractErrorMessage(error, 'Failed to update permission'));
    } finally {
      setUpdatingPermission(null);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const groupedPermissions = PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, PermissionDef[]>);

  const sortedCategories = Object.entries(groupedPermissions).sort(
    ([a], [b]) => CATEGORIES[a as keyof typeof CATEGORIES].order - CATEGORIES[b as keyof typeof CATEGORIES].order
  );

  const grantedCount = userPermissions.length;
  const totalCount = PERMISSIONS.length;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.closing : ''}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.modal} ${isClosing ? styles.closing : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <Shield size={20} />
            </div>
            <div>
              <h2 className={styles.title}>Manage Permissions</h2>
              <p className={styles.subtitle}>Configure access for this member</p>
            </div>
          </div>
          <button onClick={handleClose} className={styles.closeBtn} aria-label="Close">
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* User Info Card */}
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>
              {member.user.avatarUrl ? (
                <img src={member.user.avatarUrl} alt={member.user.username} />
              ) : (
                getInitials(member.user.username)
              )}
            </div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{member.user.username}</div>
              <div className={styles.userRole}>
                <span className={`${styles.roleBadge} ${styles[member.role]}`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
              </div>
            </div>
            <div className={styles.permissionStats}>
              <div className={styles.statNumber}>{grantedCount}</div>
              <div className={styles.statLabel}>of {totalCount}</div>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}>
                <Loader2 size={32} className={styles.spin} />
              </div>
              <p>Loading permissions...</p>
              <div className={styles.skeletonList}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={styles.skeletonItem}>
                    <div className={styles.skeletonIcon} />
                    <div className={styles.skeletonText}>
                      <div className={styles.skeletonLine} style={{ width: '60%' }} />
                      <div className={styles.skeletonLine} style={{ width: '80%' }} />
                    </div>
                    <div className={styles.skeletonToggle} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.permissionsList}>
              {sortedCategories.map(([category, permissions], categoryIndex) => (
                <div
                  key={category}
                  className={styles.category}
                  style={{ animationDelay: `${categoryIndex * 0.1}s` }}
                >
                  <div className={styles.categoryHeader}>
                    <span className={styles.categoryLabel}>
                      {CATEGORIES[category as keyof typeof CATEGORIES].label}
                    </span>
                    <span className={styles.categoryCount}>
                      {permissions.filter(p => userPermissions.includes(p.name)).length} / {permissions.length}
                    </span>
                  </div>
                  <div className={styles.categoryItems}>
                    {permissions.map((permission, permIndex) => {
                      const hasPermission = userPermissions.includes(permission.name);
                      const isUpdating = updatingPermission === permission.name;

                      return (
                        <div
                          key={permission.name}
                          className={`${styles.permissionItem} ${hasPermission ? styles.granted : ''} ${isUpdating ? styles.updating : ''}`}
                          style={{ animationDelay: `${(categoryIndex * 0.1) + (permIndex * 0.05)}s` }}
                        >
                          <div className={styles.permissionIcon}>
                            {permission.icon}
                          </div>
                          <div className={styles.permissionInfo}>
                            <div className={styles.permissionLabel}>{permission.label}</div>
                            <div className={styles.permissionDescription}>{permission.description}</div>
                          </div>
                          <button
                            className={`${styles.toggleSwitch} ${hasPermission ? styles.on : styles.off}`}
                            onClick={() => handleTogglePermission(permission.name)}
                            disabled={isUpdating}
                          >
                            <div className={styles.toggleTrack}>
                              <div className={styles.toggleThumb}>
                                {isUpdating && <Loader2 size={12} className={styles.spin} />}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            <Shield size={14} />
            <span>Changes take effect immediately</span>
          </div>
          <button onClick={handleClose} className={styles.doneButton}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default PermissionModal;
