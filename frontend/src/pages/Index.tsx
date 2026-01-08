import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based redirection
  switch (user?.role) {
    case 'SUPER_ADMIN':
      return <Navigate to="/admin" replace />;
    case 'RESTAURANT':
      return <Navigate to="/restaurant" replace />;
    case 'SCREEN':
      return <Navigate to="/my-restaurants" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}
