// utils/auth.js

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

export const getUserRole = () => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) return null;

  const decoded = JSON.parse(atob(accessToken.split('.')[1]));
  return decoded.role;
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth');
  localStorage.removeItem('role');
  localStorage.removeItem('outlet');
  localStorage.removeItem('outletList');
  window.location.reload();
};
