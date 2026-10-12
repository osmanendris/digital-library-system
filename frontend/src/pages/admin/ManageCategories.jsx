import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import PasswordConfirmModal from '../../components/PasswordConfirmModal';
import SearchInput from '../../components/SearchInput';
import { textFieldError } from '../../utils/validateText';

const emptyForm = { name: '', description: '' };

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => {
    api.get('/categories').then((res) => setCategories(res.data.categories));
    api.get('/admin/category-requests').then((res) => setRequests(res.data.requests));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setModalOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setErr(''); setModalOpen(true); };

  const submitCreate = async (e) => {
    e.preventDefault();
    setErr('');
    const fe = textFieldError(form.name, 'Category name', 5);
    if (fe) { setErr(fe); return; }
    try {
      await api.post('/admin/categories', form);
      setMsg('Category created.');
      setModalOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not create category.');
    }
  };

  const submitEditForm = (e) => {
    e.preventDefault();
    const fe = textFieldError(form.name, 'Category name', 5);
    if (fe) { setErr(fe); return; }
    setModalOpen(false);
    setPendingAction({ type: 'edit', target: editing });
  };

  const confirmEdit = async (confirm_password) => {
    try {
      await api.patch(`/admin/categories/${pendingAction.target.id}`, { ...form, confirm_password });
      setMsg('Category updated.');
      setPendingAction(null);
      load();
    } catch (e2) {
      setPendingAction(null);
      setErr(e2.response?.data?.message || 'Could not update category.');
    }
  };

  const askDelete = (c) => setPendingAction({ type: 'delete', target: c });

  const confirmDelete = async (confirm_password) => {
    await api.delete(`/admin/categories/${pendingAction.target.id}`, { data: { confirm_password } });
    setMsg('Category deleted.');
    setPendingAction(null);
    load();
  };

  const reviewRequest = async (id, decision) => {
    await api.patch(`/admin/category-requests/${id}`, { decision });
    load();
  };

  const filtered = categories.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <h3 className="fw-bold mb-4">Manage Categories</h3>
      {msg && <div className="alert alert-success">{msg}</div>}

      {requests.length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title">Pending Category Requests from Department Heads</h5>
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Name</th><th>Requested By</th><th>Description</th><th>Actions</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{r.requester_name} ({r.department})</td>
                      <td className="small text-muted">{r.description}</td>
                      <td>
                        <button className="btn btn-sm btn-success me-2" onClick={() => reviewRequest(r.id, 'approved')}>Approve</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => reviewRequest(r.id, 'rejected')}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search categories..." />
        <button className="btn btn-brand" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New Category
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Name</th><th>Description</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="small text-muted">{c.description}</td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(c)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(c)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="3" className="text-center text-muted py-4">No categories found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : 'Add Category'}>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={editing ? submitEditForm : submitCreate}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} minLength={5} required />
            <div className="form-text">At least 5 characters.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn btn-brand w-100">{editing ? 'Continue' : 'Add Category'}</button>
        </form>
      </Modal>

      <PasswordConfirmModal
        open={!!pendingAction}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Confirm Deletion' : 'Confirm Changes'}
        message={
          pendingAction?.type === 'delete'
            ? `Enter YOUR password to permanently delete the "${pendingAction?.target?.name}" category.`
            : `Enter YOUR password to save changes to the "${pendingAction?.target?.name}" category.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete Category' : 'Save Changes'}
        onCancel={() => setPendingAction(null)}
        onConfirm={pendingAction?.type === 'delete' ? confirmDelete : confirmEdit}
      />
    </>
  );
}
