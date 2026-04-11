import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '../utils/auth';


const ProtectedRoute = ({ requiredRole, children }) => {
  const auth = isAuthenticated();
  const role = getUserRole().trim().toLowerCase();
  const required = requiredRole.trim().toLowerCase();

  if (!auth) return <Navigate to="/" replace />;
  if (!role || role !== required) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
