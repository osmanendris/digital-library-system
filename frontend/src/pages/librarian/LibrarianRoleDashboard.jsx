import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function StatCard({ to, value, label, color = 'text-primary' }) {
  return (
    <Link to={to} className="col-6 col-sm-3 text-decoration-none">
      <div className="card border-0 shadow-sm h-100 resource-card">
        <div className="card-body text-center">
          <h4 className={`fw-bold ${color}`}>{value}</h4>
          <small className="text-dark">{label}</small>
        </div>
      </div>
    </Link>
  );
}

// NEW "Librarian" role (Q2) - created by the Admin Librarian. Gets
// Faculty's feature set except "Manage Teachers" is replaced by
// "Manage Students".
export default function LibrarianRoleDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/librarian/analytics').then((res) => setStats(res.data.stats));
  }, []);

  return (
    <>
      <h3 className="fw-bold mb-4">{`Welcome, ${user.full_name}`}</h3>
      <p className="text-muted mb-4">Click any stat below for full detail.</p>

      {stats && (
        <div className="row g-3 mb-4">
          <StatCard to="/teacher/my-uploads" value={stats.total_resources} label="My Uploads" />
          <StatCard to="/teacher/my-uploads" value={stats.pending_count} label="Pending Approval" color="text-warning" />
          <StatCard to="/teacher/my-uploads" value={stats.total_views} label="Total Views" />
          <StatCard to="/teacher/my-uploads" value={stats.total_downloads} label="Total Downloads" />
        </div>
      )}

      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        You can register new Students (<Link to="/librarian/students">Manage Students</Link>) to help the
        Admin Librarian. Any resource you upload still goes to the <strong>Admin Librarian</strong> for approval.
      </div>
    </>
  );
}
