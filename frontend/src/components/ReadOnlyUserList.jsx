import { useEffect, useState } from 'react';
import api from '../api/axios';
import SearchInput from './SearchInput';

// Read-only, system-wide list of a given role - e.g. "All Teachers" or
// "All Students" on the Admin Librarian dashboard (moved here from the
// System Admin per Q1). No create/edit here on purpose: those accounts
// are managed by whoever actually created them (Faculty creates Teachers;
// Librarian/Admin Librarian create Students).
export default function ReadOnlyUserList({ apiPath, title, idLabel = 'ID', withDepartment = false, withGraduationDate = false }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get(apiPath).then((res) => setItems(res.data.users));
  }, [apiPath]);

  const filtered = items.filter((u) =>
    !q || u.full_name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) ||
    (u.id_number || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">{title}</h3>
      <div className="mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, email, or ID..." />
      </div>
      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Name</th><th>{idLabel}</th>{withDepartment && <th>Department</th>}{withGraduationDate && <th>Expected Graduation</th>}<th>Email</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.id_number || '-'}</td>
                {withDepartment && <td>{u.department || '-'}</td>}
                {withGraduationDate && <td>{u.expected_graduation ? new Date(u.expected_graduation).toLocaleDateString() : '-'}</td>}
                <td>{u.email}</td>
                <td><span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>{u.is_active ? 'Active' : 'Deactivated'}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={4 + (withDepartment ? 1 : 0) + (withGraduationDate ? 1 : 0)} className="text-center text-muted py-4">Nothing found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
