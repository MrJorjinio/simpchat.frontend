import React from 'react';
import {
  Plus,
  Megaphone,
  Smile,
  User,
  Bell,
  Shield,
  Sun,
  Moon,
  LogOut,
  X,
  Users,
  Radio,
  Palette
} from 'lucide-react';
import styles from './SettingsMenu.module.css';

export interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
  onCreateCustomReaction: () => void;
  onEditProfile: () => void;
  onShowNotifications: () => void;
  onShowAdminPanel: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  onCreateChannel,
  onCreateCustomReaction,
  onEditProfile,
  onShowNotifications,
  onShowAdminPanel,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
}) => {
  if (!isOpen) return null;

  const menuSections = [
    {
      title: 'Create',
      items: [
        { icon: Users, label: 'New Group', onClick: onCreateGroup, color: '#3b82f6' },
        { icon: Radio, label: 'New Channel', onClick: onCreateChannel, color: '#8b5cf6' },
        { icon: Smile, label: 'Custom Reaction', onClick: onCreateCustomReaction, color: '#f59e0b' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Edit Profile', onClick: onEditProfile, color: '#10b981' },
        { icon: Bell, label: 'Notifications', onClick: onShowNotifications, color: '#ef4444' },
        { icon: Shield, label: 'Admin Panel', onClick: onShowAdminPanel, color: '#6366f1' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: isDarkMode ? Sun : Moon,
          label: isDarkMode ? 'Light Mode' : 'Dark Mode',
          onClick: onToggleDarkMode,
          color: isDarkMode ? '#f59e0b' : '#6366f1',
        },
      ],
    },
  ];

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`${styles.menu} ${isDarkMode ? styles.dark : ''}`}>
        <div className={styles.header}>
          <h3 className={styles.title}>Settings</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDarkMode ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={22} strokeWidth={2.5} />
          </button>
        </div>

        <div className={styles.content}>
          {menuSections.map((section) => (
            <div key={section.title} className={styles.section}>
              <div className={styles.sectionHeader}>
                <span>{section.title}</span>
              </div>
              <div className={styles.sectionItems}>
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    className={styles.menuItem}
                    onClick={item.onClick}
                  >
                    <div className={styles.itemIcon} style={{ background: item.color }}>
                      <item.icon size={18} color="white" />
                    </div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.divider} />

          <button className={styles.logoutBtn} onClick={onLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};
