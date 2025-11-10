// ProtectedRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import PropTypes from "prop-types";
import { getToken, userHasAnyRole } from "utils/auth";

const ProtectedRoute = ({ roles }) => {
  // Verifica se esiste un token in localStorage
  const isAuthenticated = Boolean(getToken());

  // Se autenticato, carica le rotte figlie (Outlet); altrimenti reindirizza al login
  if (!isAuthenticated) return <Navigate to="/authentication/sign-in" />;
  if (roles && roles.length && !userHasAnyRole(roles)) {
    return <Navigate to="/dashboard" />;
  }
  return <Outlet />;
};

export default ProtectedRoute;

ProtectedRoute.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string),
};

// (opzionale) default
ProtectedRoute.defaultProps = {
  roles: undefined,
};
