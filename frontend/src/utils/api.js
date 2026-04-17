import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://123.231.60.24:1605',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 503 && error.response?.data?.setup_required) {
      window.location.href = '/license-setup-required';
      return new Promise(() => {});
    }
    if (error.response?.status === 402) {
      const state = error.response?.data?.detail || '';
      if (state.includes('read-only')) {
        console.warn('System is in read-only mode.');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
