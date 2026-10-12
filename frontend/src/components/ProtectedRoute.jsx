import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// roles = array of allowed roles, e.g. ['admin'] or ['teacher','department_head']
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container py-5 text-center">
        <h3 className="text-danger">Access Denied</h3>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}
