import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import PasswordConfirmModal from '../../components/PasswordConfirmModal';
import SearchInput from '../../components/SearchInput';

const emptyForm = { name: '' };

// Q1: departments are now a managed list (like categories) so the
// Department Head (Faculty) creation form can pick one from a dropdown
// instead of free-typing it.
// Q3: editing or deleting an EXISTING department now requires the
// controller's own password, matching every other edit/delete action
// elsewhere in the app.
export default function ManageDepartments() {
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => api.get('/departments').then((res) => setDepartments(res.data.departments));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setModalOpen(true); };
  const openEdit = (d) => { setEditing(d); setForm({ name: d.name }); setErr(''); setModalOpen(true); };

  // Creating a brand-new department doesn't need a password (nothing existing
  // is being changed) - only editing/deleting an EXISTING one does.
  const submitCreate = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/departments', form);
      setMsg('Department created.');
      setModalOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not create department.');
    }
  };

  const submitEditForm = (e) => {
    e.preventDefault();
    setModalOpen(false);
    setPendingAction({ type: 'edit', target: editing });
  };

  const confirmEdit = async (confirm_password) => {
    await api.patch(`/departments/${pendingAction.target.id}`, { ...form, confirm_password });
    setMsg('Department updated.');
    setPendingAction(null);
    load();
  };

  const askDelete = (d) => setPendingAction({ type: 'delete', target: d });

  const confirmDelete = async (confirm_password) => {
    await api.delete(`/departments/${pendingAction.target.id}`, { data: { confirm_password } });
    setMsg('Department deleted.');
    setPendingAction(null);
    load();
  };

  const filtered = departments.filter((d) => !q || d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h3 className="fw-bold mb-4">Manage Departments</h3>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search departments..." />
        <button className="btn btn-brand" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New Department
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Department ID</th><th>Name</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td><span className="badge bg-secondary">{d.default_id}</span></td>
                <td>{d.name}</td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(d)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(d)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-4">No departments found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={editing ? submitEditForm : submitCreate}>
          {editing && (
            <div className="mb-3">
              <label className="form-label">Department ID</label>
              <input className="form-control" value={editing.default_id} disabled readOnly />
              <div className="form-text">Assigned automatically when the department was created — this never changes.</div>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ name: e.target.value })} required />
          </div>
          <button className="btn btn-brand w-100">{editing ? 'Continue' : 'Add Department'}</button>
        </form>
      </Modal>

      <PasswordConfirmModal
        open={pendingAction?.type === 'edit' || pendingAction?.type === 'delete'}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Confirm Deletion' : 'Confirm Changes'}
        message={
          pendingAction?.type === 'delete'
            ? `Enter YOUR password to permanently delete the "${pendingAction?.target?.name}" department.`
            : `Enter YOUR password to save changes to the "${pendingAction?.target?.name}" department.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete Department' : 'Save Changes'}
        onCancel={() => setPendingAction(null)}
        onConfirm={pendingAction?.type === 'delete' ? confirmDelete : confirmEdit}
      />
    </>
  );
}
