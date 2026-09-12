import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
      if (envUrl) {
        try {
          const parsed = new URL(envUrl);
          if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            parsed.hostname = currentHost;
            return parsed.toString().replace(/\/$/, '');
          }
        } catch {
          // fallback
        }
      }
      return `http://${currentHost}:5000/api`;
    }
  }
  return envUrl || 'http://localhost:5000/api';
};

const API_BASE_URL = resolveApiBaseUrl();

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach JWT access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('kabadiwala_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('kabadiwala_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data.data.accessToken;
          localStorage.setItem('kabadiwala_token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          // Token refresh failed, clear session
          localStorage.removeItem('kabadiwala_token');
          localStorage.removeItem('kabadiwala_refresh_token');
          localStorage.removeItem('kabadiwala_user');
          window.location.href = '/login';
        }
      }
    }

    // User-friendly network/timeout message when backend is unreachable
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        error.message = 'Backend is taking too long to respond. Please ensure the backend server is running on port 5000 and try again.';
      } else {
        error.message = 'Unable to reach Kabadiwala backend (port 5000). Please check if the backend server is running.';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
