import { create } from 'zustand';

type Theme = 'dark';

interface ThemeState {
  theme: Theme;
}

// Always apply dark theme
const applyTheme = () => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('simpchat-theme', 'dark');
};

export const useThemeStore = create<ThemeState>(() => {
  applyTheme();

  return {
    theme: 'dark',
  };
});
