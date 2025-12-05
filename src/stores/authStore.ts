import { create } from 'zustand';
import type { User, LoginCredentials } from '../types/api.types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (email: string, username: string, password: string, otpCode: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
  initializeAuth: () => void;
}

const getStoredToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  initialized: false,

  initializeAuth: () => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    console.log('[authStore] Initializing auth:', {
      hasUser: !!storedUser,
      hasToken: !!storedToken,
      user: storedUser
    });
    set({
      user: storedUser,
      token: storedToken,
      initialized: true,
    });
  },

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      console.log('[authStore] Logging in...');
      const token = await authService.login(credentials);
      console.log('[authStore] Token received:', token ? token.substring(0, 20) + '...' : 'No token');

      if (!token) {
        throw new Error('No token received from login');
      }

      // Save token to localStorage FIRST so API calls can use it
      localStorage.setItem('token', token);

      // Fetch actual user data from backend using GET /users/me
      console.log('[authStore] Fetching user profile from /users/me...');
      const { userService } = await import('../services/user.service');
      const userData = await userService.getCurrentUser();

      // IMPORTANT: Backend GET /users/me doesn't return email, so preserve it from credentials if it's an email
      if (!userData.email && credentials.credential.includes('@')) {
        userData.email = credentials.credential;
      }

      console.log('[authStore] User profile fetched:', userData);

      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      console.log('[authStore] Updating state with user and token...');
      set({ user: userData, token, isLoading: false });
      console.log('[authStore] Login complete, state updated');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      console.error('[authStore] Login error:', errorMessage, error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, username: string, password: string, otpCode: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('[authStore] Registering user...');
      const token = await authService.register({
        email,
        username,
        password,
        otpCode,
      });
      console.log('[authStore] Token received:', token ? token.substring(0, 20) + '...' : 'No token');

      if (!token) {
        throw new Error('No token received from registration');
      }

      // Save token to localStorage FIRST so API calls can use it
      localStorage.setItem('token', token);

      // Fetch actual user data from backend using GET /users/me
      console.log('[authStore] Fetching user profile from /users/me...');
      const { userService } = await import('../services/user.service');
      const userData = await userService.getCurrentUser();

      // IMPORTANT: Backend GET /users/me doesn't return email, so preserve it from registration
      if (!userData.email) {
        userData.email = email;
      }

      console.log('[authStore] User profile fetched:', userData);

      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      console.log('[authStore] Updating state with user and token...');
      set({ user: userData, token, isLoading: false });
      console.log('[authStore] Registration complete, state updated');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      console.error('[authStore] Registration error:', errorMessage, error);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({ user: null, token: null });
  },

  setUser: (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  clearError: () => set({ error: null }),
}));
