// utils/auth.js

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

export const getUserRole = () => {
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const decoded = JSON.parse(atob(parts[1]));
    return decoded?.role ?? null;
  } catch {
    // Malformed / tampered token — treat as unauthenticated instead of
    // crashing the whole app on <ProtectedRoute>.
    return null;
  }
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
