import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function StatCard({ to, value, label, color = 'text-primary' }) {
  return (
    <Link to={to} className="col-6 col-md-3 text-decoration-none">
      <div className="card border-0 shadow-sm h-100 resource-card">
        <div className="card-body text-center">
          <h4 className={`fw-bold ${color}`}>{value}</h4>
          <small className="text-dark">{label}</small>
        </div>
      </div>
    </Link>
  );
}

// Admin Librarian dashboard (renamed/expanded from Librarian - Q1). This
// role now gives the FINAL approval on every resource in the system (Q3)
// and oversees Faculty/Librarian/Staff/Student accounts.
export default function LibrarianDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [queuePreview, setQueuePreview] = useState([]);

  useEffect(() => {
    api.get('/admin-librarian/analytics').then((res) => setStats(res.data.stats));
    api.get('/admin-librarian/queue').then((res) => setQueuePreview(res.data.resources.slice(0, 6)));
  }, []);

  return (
    <>
      <h3 className="fw-bold mb-4">{`Welcome, ${user.full_name}`}</h3>
      <p className="text-muted mb-4">Central Gatekeeper — every resource in the system passes through your final approval.</p>

      {stats && (
        <div className="row g-3 mb-4">
          <StatCard to="/admin-librarian/queue" value={stats.pending_count} label="Pending Your Approval" color="text-warning" />
          <StatCard to="/admin-librarian/resources" value={stats.total_resources} label="Published Resources" />
          <StatCard to="/admin-librarian/all-teachers" value={stats.total_teachers} label="Teachers" />
          <StatCard to="/admin-librarian/all-students" value={stats.total_students} label="Students" />
        </div>
      )}
      {stats && (
        <div className="row g-3 mb-4">
          <StatCard to="/admin-librarian/department-heads" value={stats.total_department_head} label="Department Heads" />
          <StatCard to="/admin-librarian/librarians" value={stats.total_librarians} label="Librarians" />
          <StatCard to="/admin-librarian/staff" value={stats.total_staff} label="Staff" />
          <StatCard to="/admin-librarian/activity?action=downloaded" value={stats.total_downloads} label="Total Downloads" />
        </div>
      )}

      {/* Full drill-down: who exactly viewed/downloaded what, with their name,
          ID number, department, and role - not just a bare popularity count. */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        <Link to="/admin-librarian/activity?action=viewed" className="btn btn-outline-primary">
          <i className="bi bi-eye me-1"></i> View Full Viewing Activity
        </Link>
        <Link to="/admin-librarian/activity?action=downloaded" className="btn btn-outline-primary">
          <i className="bi bi-download me-1"></i> View Full Download Activity
        </Link>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0">Awaiting Your Approval</h6>
            <Link to="/admin-librarian/queue" className="small">Open full queue &rarr;</Link>
          </div>
          {/* No "quick approve" here on purpose (Q4): every approval/rejection
              requires opening and reviewing the actual file first, which only
              happens in the full Approval Queue. */}
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead><tr><th>Title</th><th>Uploaded By</th><th>Role</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {queuePreview.map((r) => (
                  <tr key={r.id}>
                    <td>{r.title}</td>
                    <td>{r.uploader_name}</td>
                    <td className="text-capitalize small">{(r.uploader_role || '').replace('_', ' ')}</td>
                    <td className="small">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td><Link to="/admin-librarian/queue" className="btn btn-sm btn-outline-secondary">Review</Link></td>
                  </tr>
                ))}
                {queuePreview.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-3">Queue is empty. All caught up!</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
