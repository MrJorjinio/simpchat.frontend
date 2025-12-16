import api from './api';
import { normalizeUser, normalizeUsers } from '../utils/normalizers';

export const userService = {
  getCurrentUser: async () => {
    const response = await api.get<any>('/users/me');
    const rawUser = response.data?.data || response.data;
    return normalizeUser(rawUser);
  },

  updateProfile: async (formData: FormData) => {
    // Backend PUT /users/me returns NO user data, just success/failure
    await api.put<any>('/users/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Re-fetch user data to get updated profile
    return userService.getCurrentUser();
  },

  searchUsers: async (username: string) => {
    const response = await api.get<any>(
      `/users/search/${encodeURIComponent(username)}`
    );
    const rawUsers = response.data?.data || response.data;
    return normalizeUsers(rawUsers);
  },

  getUserProfile: async (userId: string) => {
    const response = await api.get<any>(`/users/${userId}`);
    console.log('[UserService] getUserProfile raw response:', response.data);
    const rawUser = response.data?.data || response.data;
    console.log('[UserService] getUserProfile rawUser:', rawUser);
    console.log('[UserService] getUserProfile description:', rawUser?.description, rawUser?.Description);
    return normalizeUser(rawUser);
  },

  updateLastSeen: async () => {
    const response = await api.put<any>('/users/last-seen');
    return response.data?.data || response.data;
  },

  // Admin endpoints
  getAllUsers: async () => {
    const response = await api.get<any>('/users');
    const rawUsers = response.data?.data || response.data;
    return normalizeUsers(rawUsers);
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete<any>(`/users/${userId}`);
    return response.data?.data || response.data;
  },

  blockUser: async (userId: string) => {
    const response = await api.post<any>(`/users/block/${userId}`);
    return response.data?.data || response.data;
  },

  unblockUser: async (userId: string) => {
    const response = await api.post<any>(`/users/unblock/${userId}`);
    return response.data?.data || response.data;
  },

  getBlockedUsers: async () => {
    const response = await api.get<any>('/users/blocked');
    const rawUsers = response.data?.data || response.data;
    return normalizeUsers(rawUsers);
  },
};
