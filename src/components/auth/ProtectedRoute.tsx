import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, initialized } = useAuth();

  console.log('[ProtectedRoute] Current state:', { isAuthenticated, isLoading, initialized });

  // Show loading while checking auth OR while initializing OR while logging in
  if (isLoading || !initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--background)', color: 'var(--text)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If not authenticated and init is complete, redirect to landing page
  if (!isAuthenticated) {
    console.warn('[ProtectedRoute] Not authenticated, redirecting to landing page');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
