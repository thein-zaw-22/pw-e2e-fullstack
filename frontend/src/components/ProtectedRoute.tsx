/**
 * Protected route component.
 * Redirects to the login page if the user is not authenticated.
 * Wrap any route that requires login with this component.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn } = useAuth();

  // If the user is not logged in, redirect to login page
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // User is logged in, show the protected content
  return <>{children}</>;
}
