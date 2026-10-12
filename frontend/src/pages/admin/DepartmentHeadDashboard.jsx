import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';

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

export default function DepartmentHeadDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [queuePreview, setQueuePreview] = useState([]);

  useEffect(() => {
    api.get('/department-head/analytics').then((res) => setStats(res.data.stats));
    api.get('/department-head/queue').then((res) => setQueuePreview(res.data.resources.slice(0, 6)));
  }, []);

  return (
    <>
      <h3 className="fw-bold mb-4">{`Welcome, ${user.full_name}`}</h3>
      <p className="text-muted mb-4">{user.department} Department — click any stat below for full detail</p>

      {stats && (
        <div className="row g-3 mb-4">
          <StatCard to="/department-head/queue" value={stats.pending_count} label="Pending Approval" color="text-warning" />
          <StatCard to="/department-head/monitor" value={stats.total_resources} label="Department Resources" />
          <StatCard to="/department-head/monitor" value={stats.total_views} label="Total Views" />
          <StatCard to="/department-head/monitor" value={stats.total_downloads} label="Total Downloads" />
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0">Awaiting Your Approval</h6>
            <Link to="/department-head/queue" className="small">Open full queue &rarr;</Link>
          </div>
          {/* No "quick approve" here on purpose (Q4): every approval/rejection
              requires opening and reviewing the actual file first, which only
              happens in the full Approval Queue. */}
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Title</th><th>Teacher</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {queuePreview.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.uploader_name}</td>
                    <td className="small">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td><Link to="/department-head/queue" className="btn btn-sm btn-outline-secondary">Review</Link></td>
                  </tr>
                ))}
                {queuePreview.length === 0 && <tr><td colSpan="4" className="text-center text-muted py-3">Queue is empty. All caught up!</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="alert alert-info mt-4">
        <i className="bi bi-info-circle me-2"></i>
        Approving here is stage 1 only — it forwards the resource to the <strong>Admin Librarian</strong> for
        final approval before it becomes visible to anyone. Resources you upload yourself go straight to the
        Admin Librarian's queue.
      </div>
    </>
  );
}
