// src/utils/auth.js

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

export const getUserRole = () => {
  // If you have the role encoded in the JWT token, you can extract it here
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) return null;

  const decoded = JSON.parse(atob(accessToken.split('.')[1]));
  return decoded.role; // Assuming role is encoded in the JWT payload
};

// Add logout function to clear the authentication tokens
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};
