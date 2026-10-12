import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from './DashboardLayout';
import { isReviewTab } from '../utils/reviewTab';

// This is mounted ONCE as a layout route wrapping every logged-in page
// (see App.jsx). Because React Router keeps this component instance alive
// while only swapping the <Outlet/> content underneath it, the sidebar's
// DOM node (and its scroll position) is never recreated when navigating
// between dashboard pages - fixing the "sidebar jumps back to top" bug.
export default function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // A review tab (opened from the Approval Queue to preview an epub)
  // should show ONLY the file - no sidebar/dashboard chrome around it.
  if (isReviewTab(location.search)) {
    return <div className="container-fluid py-3"><Outlet /></div>;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
