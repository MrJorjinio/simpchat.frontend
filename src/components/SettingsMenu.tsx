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
  Settings,
  Sparkles,
  X
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
      icon: Sparkles,
      items: [
        { icon: Plus, label: 'New Group', onClick: onCreateGroup, color: '#667eea' },
        { icon: Megaphone, label: 'New Channel', onClick: onCreateChannel, color: '#f093fb' },
        { icon: Smile, label: 'Custom Reaction', onClick: onCreateCustomReaction, color: '#4facfe' },
      ],
    },
    {
      title: 'Account',
      icon: User,
      items: [
        { icon: User, label: 'Edit Profile', onClick: onEditProfile, color: '#11998e' },
        { icon: Bell, label: 'Notifications', onClick: onShowNotifications, color: '#fa709a' },
        { icon: Shield, label: 'Admin Panel', onClick: onShowAdminPanel, color: '#a8edea' },
      ],
    },
    {
      title: 'Preferences',
      icon: Settings,
      items: [
        {
          icon: isDarkMode ? Sun : Moon,
          label: isDarkMode ? 'Light Mode' : 'Dark Mode',
          onClick: onToggleDarkMode,
          color: isDarkMode ? '#f6d365' : '#4ca1af',
        },
      ],
    },
  ];

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={`${styles.menu} ${isDarkMode ? styles.dark : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <Settings size={20} color="white" />
            </div>
            <div>
              <h3 className={styles.title}>Settings</h3>
              <p className={styles.subtitle}>Customize your experience</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.content}>
          {menuSections.map((section, idx) => (
            <div key={section.title} className={styles.section} style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className={styles.sectionHeader}>
                <section.icon size={14} />
                <span>{section.title}</span>
              </div>
              <div className={styles.sectionItems}>
                {section.items.map((item, itemIdx) => (
                  <button
                    key={item.label}
                    className={styles.menuItem}
                    onClick={item.onClick}
                    style={{ animationDelay: `${(idx * 3 + itemIdx) * 0.03}s` }}
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
