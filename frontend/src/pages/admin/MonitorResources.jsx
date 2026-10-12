import { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';

export default function MonitorResources() {
  const [resources, setResources] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/department-head/teacher-resources').then((res) => setResources(res.data.resources));
  }, []);

  const filtered = resources.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.uploader_name || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">Monitor Teacher Uploads</h3>
      <p className="text-muted">Full history of your teachers' uploads (all statuses). To approve or reject a pending one, use the <a href="/department-head/queue">Approval Queue</a>.</p>
      <SearchInput value={q} onChange={setQ} placeholder="Search by title or teacher..." />
      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Title</th><th>Uploaded By</th><th>Category</th><th>Status</th><th>Views</th><th>Downloads</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.uploader_name}</td>
                <td>{r.category_name || '-'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.view_count}</td>
                <td>{r.download_count}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-4">No uploads from your teachers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
