import api from './api';
import type { LoginCredentials, RegisterRequest, OTPResponse } from '../types/api.types';

export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<any>('/auth/login', credentials);
    // Backend returns: { success: true, statusCode: 200, data: "token_string", error: null }
    // Extract the token from the response
    const apiResult = response.data;
    const token = apiResult?.data || response.data;
    return token;
  },

  register: async (data: RegisterRequest) => {
    const response = await api.post<any>('/auth/register', data);
    // Backend returns: { success: true, statusCode: 200, data: "token_string", error: null }
    // Extract the token from the response
    const apiResult = response.data;
    const token = apiResult?.data || response.data;
    return token;
  },

  sendOTP: async (email: string) => {
    const response = await api.post<OTPResponse>(
      `/otp/send-to-email?email=${encodeURIComponent(email)}`
    );
    return response.data;
  },

  updatePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.put('/auth/update-password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  resetPasswordByEmail: async (email: string, password: string, otp: string) => {
    const response = await api.put('/auth/reset-password-by-email', {
      email,
      password,
      otp,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
