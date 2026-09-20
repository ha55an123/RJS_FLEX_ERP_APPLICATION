import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAuthStorage,
} from '../utils/authStorage';
import { notifySessionInvalid } from '../utils/authEvents';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        throw new Error('Missing refresh token');
      }

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || ''}/auth/refresh`,
        null,
        { params: { token: refresh } }
      );

      setTokens(data.access_token, refresh);
      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function shouldAttemptRefresh(error) {
  if (!error.response || error.response.status !== 401) return false;
  if (error.config?._retry) return false;

  const url = error.config?.url || '';
  if (url.includes('/auth/')) return false;

  return Boolean(getRefreshToken());
}

function invalidateSession() {
  clearAuthStorage();
  notifySessionInvalid();

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (!shouldAttemptRefresh(err)) {
      return Promise.reject(err);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      if (refreshError.response?.status === 401) {
        invalidateSession();
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;
