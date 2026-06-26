import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { LoadingScreen } from '../../components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('client' | 'admin' | 'super_admin')[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
}) => {
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && !user && !isLoading) {
      loadUser();
    }
  }, [isAuthenticated, user, isLoading, loadUser]);

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'client' ? '/portal' : '/admin/dashboard';
    return <Navigate to={redirectTo || fallback} replace />;
  }

  return <>{children}</>;
};
