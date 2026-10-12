import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import SearchInput from '../../components/SearchInput';

const emptyForm = { name: '' };

// Q8: TTLM levels are a managed list (like Departments/Categories) so the
// upload page's "Level" dropdown is populated from here instead of being
// free-typed.
export default function ManageTtlmLevels() {
  const [levels, setLevels] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => api.get('/ttlm-levels').then((res) => setLevels(res.data.levels));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setModalOpen(true); };
  const openEdit = (l) => { setEditing(l); setForm({ name: l.name }); setErr(''); setModalOpen(true); };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if (editing) {
        await api.patch(`/ttlm-levels/${editing.id}`, form);
        setMsg('Level updated.');
      } else {
        await api.post('/ttlm-levels', form);
        setMsg('Level created.');
      }
      setModalOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not save level.');
    }
  };

  const remove = async (l) => {
    if (!window.confirm(`Delete the "${l.name}" level?`)) return;
    await api.delete(`/ttlm-levels/${l.id}`);
    setMsg('Level deleted.');
    load();
  };

  const filtered = levels.filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h3 className="fw-bold mb-4">Manage TTLM Levels</h3>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search levels..." />
        <button className="btn btn-brand" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New Level
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Name</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(l)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(l)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="2" className="text-center text-muted py-4">No levels found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Level' : 'Add Level'}>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Name (e.g. "Level 1")</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ name: e.target.value })} required />
          </div>
          <button className="btn btn-brand w-100">{editing ? 'Save Changes' : 'Add Level'}</button>
        </form>
      </Modal>
    </>
  );
}
