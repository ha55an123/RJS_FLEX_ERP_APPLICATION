import axios from 'axios';

const api = axios.create({
  // Works in both local dev and docker:
  // - if VITE_API_URL is provided, use it
  // - otherwise hit nginx proxy path
  baseURL: import.meta.env.VITE_API_URL || '/',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const url = err.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/');

    if (err.response?.status === 401 && !isAuthEndpoint) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || ''}/auth/refresh`,
            null,
            { params: { token: refresh } }
          );
          localStorage.setItem('access_token', data.access_token);
          err.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
