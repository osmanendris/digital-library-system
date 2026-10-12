import { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import formatBytes from '../../utils/formatBytes';

export default function MyUploads() {
  const [resources, setResources] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/resources/mine/uploads').then((res) => setResources(res.data.resources));
  }, []);

  const filtered = resources.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h3 className="fw-bold mb-4">My Uploads</h3>
      <SearchInput value={q} onChange={setQ} placeholder="Search my uploads..." />
      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead>
            <tr>
              <th>Title</th><th>Subject</th><th>File Type</th><th>Size</th><th>Category</th>
              <th>Status</th><th>Views</th><th>Downloads</th><th>Rejection Reason</th><th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.subject || '-'}</td>
                <td className="text-uppercase small">{r.file_type}</td>
                <td>{formatBytes(r.file_size)}</td>
                <td>{r.category_name || '-'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>{r.view_count}</td>
                <td>{r.download_count}</td>
                <td className="text-muted small">{r.rejection_reason || '-'}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="10" className="text-center text-muted py-4">You haven't uploaded anything yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
