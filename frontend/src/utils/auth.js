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

export const isServiceProvider = () => {
  return getUserRole() === 'ServiceProvider';
};

export const getLicense = () => {
  try {
    return JSON.parse(localStorage.getItem('license') || '{}');
  } catch {
    return {};
  }
};

export const hasFeature = (code) => {
  const lic = getLicense();
  return lic.features?.includes(code) ?? true;
};

export const getLicenseState = () => {
  const lic = getLicense();
  return lic.state || 'active';
};

export const isReadOnly = () => {
  return getLicenseState() === 'readonly';
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth');
  localStorage.removeItem('role');
  localStorage.removeItem('outlet');
  localStorage.removeItem('outletList');
  localStorage.removeItem('license');
  window.location.reload();
};
