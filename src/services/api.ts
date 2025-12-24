import axios, { type AxiosError } from 'axios';

// Backend runs on HTTP by default, adjust if needed
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // CORS configuration
  withCredentials: true, // Required because backend uses AllowCredentials
});

// Add token to requests and handle FormData content type
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    console.log('[API] Adding token to request:', config.url, 'Token:', token.substring(0, 20) + '...');
    config.headers.Authorization = `Bearer ${token}`;
  }

  // If sending FormData, remove Content-Type header so browser sets it with correct boundary
  if (config.data instanceof FormData) {
    console.log('[API] FormData detected, removing Content-Type header for:', config.url);
    delete config.headers['Content-Type'];
  }

  return config;
});

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized - logging out user');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (error.response?.status === 400) {
      console.error('[API] 400 Bad Request:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default api;
