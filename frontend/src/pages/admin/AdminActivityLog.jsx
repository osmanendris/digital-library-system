import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import SearchInput from '../../components/SearchInput';

// Full drill-down of who viewed/downloaded what - shows identity detail
// (name, ID number, department, role). This screen now lives exclusively
// on the Admin Librarian dashboard (moved here from System Admin - Q1).
export default function AdminActivityLog() {
  const apiPrefix = '/admin-librarian';
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action') === 'viewed' ? 'viewed' : 'downloaded';
  const [activity, setActivity] = useState([]);
  const [q, setQ] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSelectedResourceId(null);
    api.get(`${apiPrefix}/activity`, { params: { action } })
      .then((res) => setActivity(res.data.activity))
      .finally(() => setLoading(false));
  }, [action, apiPrefix]);

  // Group the raw event log into a per-resource summary: "Programming Course
  // - downloaded 10 times", sorted by count. Clicking one filters the
  // detailed table below to just that resource's events.
  const summary = useMemo(() => {
    const groups = {};
    activity.forEach((a) => {
      if (!groups[a.resource_id]) {
        groups[a.resource_id] = { resource_id: a.resource_id, title: a.resource_title, subject: a.resource_subject, count: 0 };
      }
      groups[a.resource_id].count += 1;
    });
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [activity]);

  const filtered = activity.filter((a) =>
    (!selectedResourceId || a.resource_id === selectedResourceId) &&
    (!q ||
      a.resource_title.toLowerCase().includes(q.toLowerCase()) ||
      a.user_name.toLowerCase().includes(q.toLowerCase()) ||
      (a.department || '').toLowerCase().includes(q.toLowerCase()) ||
      (a.id_number || '').toLowerCase().includes(q.toLowerCase()))
  );

  const actionWord = action === 'downloaded' ? 'downloaded' : 'viewed';

  return (
    <>
      <h3 className="fw-bold mb-4">Activity Log</h3>
      <div className="btn-group mb-3">
        <button
          className={`btn btn-sm ${action === 'downloaded' ? 'btn-brand' : 'btn-outline-secondary'}`}
          onClick={() => setSearchParams({ action: 'downloaded' })}
        >
          <i className="bi bi-download me-1"></i> Most Downloaded
        </button>
        <button
          className={`btn btn-sm ${action === 'viewed' ? 'btn-brand' : 'btn-outline-secondary'}`}
          onClick={() => setSearchParams({ action: 'viewed' })}
        >
          <i className="bi bi-eye me-1"></i> Most Viewed
        </button>
      </div>

      {!loading && summary.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3">
              Top {action === 'downloaded' ? 'Downloaded' : 'Viewed'} Resources
              {selectedResourceId && (
                <button className="btn btn-sm btn-outline-secondary float-end" onClick={() => setSelectedResourceId(null)}>
                  <i className="bi bi-x-lg me-1"></i> Clear filter
                </button>
              )}
            </h6>
            <div className="row g-2">
              {summary.slice(0, 10).map((s) => (
                <div className="col-12 col-md-6" key={s.resource_id}>
                  <button
                    className={`btn btn-sm w-100 text-start ${selectedResourceId === s.resource_id ? 'btn-brand' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedResourceId(s.resource_id === selectedResourceId ? null : s.resource_id)}
                  >
                    <strong>{s.title}</strong>{s.subject && <span className="opacity-75"> ({s.subject})</span>} — {actionWord} {s.count} time{s.count !== 1 ? 's' : ''}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-muted small mt-2 mb-0">
              Click a resource above to see exactly who {actionWord} it below (name, ID, department).
            </p>
          </div>
        </div>
      )}

      <SearchInput value={q} onChange={setQ} placeholder="Search by resource, name, ID, or department..." />

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white align-middle">
            <thead>
              <tr>
                <th>Resource</th><th>Subject</th><th>{action === 'downloaded' ? 'Downloaded By' : 'Viewed By'}</th>
                <th>ID Number</th><th>Department</th><th>Role</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td><Link to={`/resource/${a.resource_id}`}>{a.resource_title}</Link></td>
                  <td>{a.resource_subject || '-'}</td>
                  <td>{a.user_name}</td>
                  <td>{a.id_number || '-'}</td>
                  <td>{a.department || '-'}</td>
                  <td className="text-capitalize">{(a.user_role || '').replace('_', ' ')}</td>
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="text-center text-muted py-4">No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
