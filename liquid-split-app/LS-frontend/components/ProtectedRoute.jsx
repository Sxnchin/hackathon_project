import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../src/utils/authContext";

const ProtectedRoute = ({ children }) => {
  const { readToken } = useAuth();
  const token = readToken();
  const location = useLocation();

  // If not logged in, redirect to login
  if (!token) {
    console.warn("No token found — redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
