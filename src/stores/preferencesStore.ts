import { create } from 'zustand';

interface PreferencesState {
  fancyAnimations: boolean;
  showChats: boolean;
  toggleFancyAnimations: () => void;
  setFancyAnimations: (enabled: boolean) => void;
  toggleShowChats: () => void;
  setShowChats: (enabled: boolean) => void;
}

// Get initial preference from localStorage
const getInitialFancyAnimations = (): boolean => {
  const stored = localStorage.getItem('simpchat-fancy-animations');
  if (stored === 'true') {
    return true;
  }
  // Default to false for new users (better performance)
  return false;
};

const getInitialShowChats = (): boolean => {
  const stored = localStorage.getItem('simpchat-show-chats');
  if (stored === 'false') {
    return false;
  }
  // Default to true for new users
  return true;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  fancyAnimations: getInitialFancyAnimations(),
  showChats: getInitialShowChats(),

  toggleFancyAnimations: () => {
    set((state) => {
      const newValue = !state.fancyAnimations;
      localStorage.setItem('simpchat-fancy-animations', String(newValue));
      return { fancyAnimations: newValue };
    });
  },

  setFancyAnimations: (enabled: boolean) => {
    localStorage.setItem('simpchat-fancy-animations', String(enabled));
    set({ fancyAnimations: enabled });
  },

  toggleShowChats: () => {
    set((state) => {
      const newValue = !state.showChats;
      localStorage.setItem('simpchat-show-chats', String(newValue));
      return { showChats: newValue };
    });
  },

  setShowChats: (enabled: boolean) => {
    localStorage.setItem('simpchat-show-chats', String(enabled));
    set({ showChats: enabled });
  },
}));
