import { create } from 'zustand';

interface PreferencesState {
  fancyAnimations: boolean;
  toggleFancyAnimations: () => void;
  setFancyAnimations: (enabled: boolean) => void;
}

// Get initial preference from localStorage
const getInitialFancyAnimations = (): boolean => {
  const stored = localStorage.getItem('simpchat-fancy-animations');
  if (stored === 'false') {
    return false;
  }
  // Default to true for new users
  return true;
};

export const usePreferencesStore = create<PreferencesState>((set) => ({
  fancyAnimations: getInitialFancyAnimations(),

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
}));
