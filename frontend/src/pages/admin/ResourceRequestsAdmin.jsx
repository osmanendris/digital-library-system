import { useEffect, useState } from 'react';
import api from '../../api/axios';
import SearchInput from '../../components/SearchInput';

export default function ResourceRequestsAdmin() {
  const [requests, setRequests] = useState([]);
  const [q, setQ] = useState('');

  const load = () => api.get('/requests').then((res) => setRequests(res.data.requests));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/requests/${id}`, { status });
    load();
  };

  const filtered = requests.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.requester_name || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">Resource Requests</h3>
      <SearchInput value={q} onChange={setQ} placeholder="Search by title or requester..." />
      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Title</th><th>Subject</th><th>Author</th><th>Requested By</th><th>Role</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.subject || '-'}</td>
                <td>{r.author || '-'}</td>
                <td>{r.requester_name}</td>
                <td>
                  <span className={`badge ${r.requester_role === 'staff' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                    {r.requester_role === 'staff' ? 'Staff' : 'Student'}
                  </span>
                </td>
                <td className="small text-muted">{r.reason || '-'}</td>
                <td className="text-capitalize">{r.status}</td>
                <td>
                  {r.status === 'open' && (
                    <>
                      <button className="btn btn-sm btn-success me-2" onClick={() => updateStatus(r.id, 'fulfilled')}>Mark Fulfilled</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => updateStatus(r.id, 'declined')}>Decline</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="8" className="text-center text-muted py-4">No requests found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
