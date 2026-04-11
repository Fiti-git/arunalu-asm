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
  // Remove all relevant auth-related keys from localStorage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth');
  localStorage.removeItem('role');
  localStorage.removeItem('outlet');
  localStorage.removeItem('outletList');
  // Add other keys to clear here if needed

  // Force a hard reload of the page to reset app state fully
  window.location.reload();
};
