import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

function StatCard({ to, value, label, color = 'text-primary' }) {
  return (
    <Link to={to} className="col-6 col-md-4 col-lg-3 text-decoration-none">
      <div className="card border-0 shadow-sm h-100 resource-card">
        <div className="card-body text-center">
          <h4 className={`fw-bold ${color}`}>{value}</h4>
          <small className="text-dark">{label}</small>
        </div>
      </div>
    </Link>
  );
}

// Trimmed per Q1: the System Admin now only creates/manages Admin
// Librarian accounts, categories, and settings. Everything else (Manage
// Faculty, All Teachers, All Students, All Resources, Activity Log) has
// moved to the Admin Librarian dashboard.
export default function AdminDashboard() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);

  useEffect(() => {
    api.get('/admin/admin-librarians').then((res) => setCount(res.data.users.length));
  }, []);

  return (
    <>
      <h3 className="fw-bold mb-4">{`Welcome, ${user.full_name}`}</h3>
      <p className="text-muted mb-4">System Owner — you create and manage Admin Librarian accounts.</p>

      {count !== null && (
        <div className="row g-3 mb-4">
          <StatCard to="/admin/admin-librarians" value={count} label="Admin Librarian Accounts" color="text-primary" />
        </div>
      )}

      <div className="alert alert-info mt-2">
        <i className="bi bi-info-circle me-2"></i>
        As System Administrator, the only account type you create directly is the <strong>Admin Librarian</strong>.
        The Admin Librarian in turn creates Department Head, Librarian, Staff, and Student accounts, and gives the final
        approval on every resource in the library.
      </div>

      <div className="d-flex flex-wrap gap-2 mt-3">
        <Link to="/admin/admin-librarians" className="btn btn-brand">
          <i className="bi bi-person-badge me-1"></i> Manage Admin Librarian
        </Link>
        <Link to="/admin/categories" className="btn btn-outline-primary">
          <i className="bi bi-tags me-1"></i> Manage Categories
        </Link>
        <Link to="/admin/settings" className="btn btn-outline-primary">
          <i className="bi bi-gear me-1"></i> System Settings
        </Link>
        <Link to="/teacher/upload" className="btn btn-outline-primary">
          <i className="bi bi-cloud-upload me-1"></i> Upload Resource
        </Link>
      </div>
    </>
  );
}
