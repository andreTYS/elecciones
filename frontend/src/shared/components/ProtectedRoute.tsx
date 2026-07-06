import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ minLevel = 1 }: { minLevel?: number }) {
  const { isAuth, nivel } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  if (nivel < minLevel) return <Navigate to="/" replace />;
  return <Outlet />;
}
