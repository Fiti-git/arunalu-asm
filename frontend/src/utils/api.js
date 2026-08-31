import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — refresh the access token once on 401 and retry the
// original request. Multiple concurrent 401s share a single refresh promise so
// we don't hammer /api/token/refresh/ from every failing request.
// ---------------------------------------------------------------------------
let refreshPromise = null;

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return Promise.reject(new Error('No refresh token'));

  refreshPromise = axios
    .post(`${BASE_URL}/api/token/refresh/`, { refresh })
    .then((res) => {
      const { access, refresh: newRefresh } = res.data || {};
      if (!access) throw new Error('Refresh response missing access token');
      localStorage.setItem('access_token', access);
      if (newRefresh) localStorage.setItem('refresh_token', newRefresh);
      return access;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }
    // Don't try to refresh the refresh call itself.
    if (config.url && config.url.includes('/api/token/refresh/')) {
      return Promise.reject(error);
    }
    config._retried = true;
    try {
      const access = await refreshAccessToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${access}`;
      return api.request(config);
    } catch (refreshErr) {
      // Refresh failed → force logout so the user re-authenticates.
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth');
      localStorage.removeItem('role');
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/';
      }
      return Promise.reject(refreshErr);
    }
  },
);

export default api;
