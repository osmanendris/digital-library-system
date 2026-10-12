import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import PasswordConfirmModal from '../../components/PasswordConfirmModal';
import SearchInput from '../../components/SearchInput';
import { textFieldError, idFieldError, passwordStrengthError } from '../../utils/validateText';

const emptyForm = { full_name: '', email: '', password: '', id_number: '' };

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => api.get('/department-head/teachers').then((res) => setTeachers(res.data.users));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setForm({ full_name: t.full_name, email: t.email, id_number: t.id_number || '', password: '' }); setErr(''); setModalOpen(true); };

  const submitCreate = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    { const fe = textFieldError(form.full_name, 'Full name', 5); if (fe) { setErr(fe); return; } }
    { const ie = idFieldError(form.id_number, 'Teacher ID'); if (ie) { setErr(ie); return; } }
    { const pe = passwordStrengthError(form.password); if (pe) { setErr(pe); return; } }
    try {
      await api.post('/department-head/teachers', form);
      setMsg('Teacher account created successfully.');
      setModalOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not create teacher account.');
    }
  };

  const submitEditForm = (e) => {
    e.preventDefault();
    setModalOpen(false);
    setPendingAction({ type: 'edit', target: editing });
  };

  const confirmEdit = async (confirm_password) => {
    await api.patch(`/department-head/teachers/${pendingAction.target.id}`, { ...form, confirm_password });
    setMsg('Teacher account updated successfully.');
    setPendingAction(null);
    load();
  };

  const toggleActive = async (t) => {
    await api.patch(`/department-head/teachers/${t.id}/active`, { is_active: !t.is_active });
    load();
  };

  const askDelete = (t) => setPendingAction({ type: 'delete', target: t });

  const confirmDelete = async (confirm_password) => {
    await api.delete(`/department-head/teachers/${pendingAction.target.id}`, { data: { confirm_password } });
    setMsg('Teacher account removed.');
    setPendingAction(null);
    load();
  };

  const filtered = teachers.filter((t) =>
    !q || t.full_name.toLowerCase().includes(q.toLowerCase()) || t.email.toLowerCase().includes(q.toLowerCase()) || (t.id_number || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">Manage Teachers</h3>
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name or email..." />
        <button className="btn btn-brand" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New Teacher
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Name</th><th>Staff ID</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td>{t.full_name}</td>
                <td>{t.id_number || '-'}</td>
                <td>{t.email}</td>
                <td><span className={`badge ${t.is_active ? 'bg-success' : 'bg-secondary'}`}>{t.is_active ? 'Active' : 'Deactivated'}</span></td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(t)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => toggleActive(t)}>
                    {t.is_active ? <i className="bi bi-pause-fill"></i> : <i className="bi bi-play-fill"></i>}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(t)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="5" className="text-center text-muted py-4">No teachers found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Teacher Account' : 'Create Teacher Account'}>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={editing ? submitEditForm : submitCreate}>
          <div className="mb-3">
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} minLength={5} required />
            <div className="form-text">At least 5 characters.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Teacher ID *</label>
            <input className="form-control" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} minLength={5} maxLength={12} required />
            <div className="form-text">5-12 characters, letters and/or numbers.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          {!editing && (
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="text" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
              <div className="form-text">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.</div>
            </div>
          )}
          <button className="btn btn-brand w-100">{editing ? 'Continue' : 'Create Account'}</button>
        </form>
      </Modal>

      <PasswordConfirmModal
        open={pendingAction?.type === 'edit' || pendingAction?.type === 'delete'}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Confirm Deletion' : 'Confirm Changes'}
        message={
          pendingAction?.type === 'delete'
            ? `Enter YOUR password to permanently remove ${pendingAction?.target?.full_name}'s account.`
            : `Enter YOUR password to save changes to ${pendingAction?.target?.full_name}'s account.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Remove Account' : 'Save Changes'}
        onCancel={() => setPendingAction(null)}
        onConfirm={pendingAction?.type === 'delete' ? confirmDelete : confirmEdit}
      />
    </>
  );
}
