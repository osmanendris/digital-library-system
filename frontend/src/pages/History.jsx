import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import SearchInput from '../components/SearchInput';

export default function History() {
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/history').then((res) => setHistory(res.data.history));
  }, []);

  const filtered = history.filter((h) => !q || h.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h3 className="fw-bold mb-4">Reading History</h3>
      <SearchInput value={q} onChange={setQ} placeholder="Search your history..." />
      {filtered.length === 0 ? (
        <p className="text-muted">{history.length === 0 ? 'No activity yet.' : 'No matches.'}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white">
            <thead><tr><th>Title</th><th>Subject</th><th>Action</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id}>
                  <td><Link to={`/resource/${h.resource_id}`}>{h.title}</Link></td>
                  <td>{h.subject || '-'}</td>
                  <td className="text-capitalize">{h.action}</td>
                  <td>{new Date(h.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
