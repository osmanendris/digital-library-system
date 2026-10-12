import { useEffect, useState } from 'react';
import api from '../api/axios';
import Modal from './Modal';
import PasswordConfirmModal from './PasswordConfirmModal';
import SearchInput from './SearchInput';
import { textFieldError, idFieldError, passwordStrengthError, graduationDateError } from '../utils/validateText';

/**
 * Generic account-management CRUD page, used for every "create/list/edit/
 * deactivate/delete" account screen in the system (Faculty, Librarian,
 * Staff, Student, Admin Librarian), which are all identical in shape and
 * only differ in API base path, labels, and whether a Department field is
 * required.
 *
 * Q7: admin-side password reset was removed - account holders reset their
 * own password via "Forgot password?" on the login page (emailed OTP).
 *
 * Props:
 *  - apiBase: base path for create/list/update/delete, e.g. '/admin-librarian/department-heads'
 *  - activeBase: base path for the active/deactivate toggle, e.g. '/admin-librarian/users' (toggle hits `${activeBase}/:id/active`)
 *  - title: page heading, e.g. "Manage Faculty"
 *  - entityLabel: singular label used in buttons/messages, e.g. "Faculty"
 *  - idLabel: label for the ID field, e.g. "Staff ID" or "Student ID"
 *  - withDepartment: whether to show/require a Department field
 */
export default function AccountManager({ apiBase, activeBase, title, entityLabel, idLabel = 'Staff ID', withDepartment = false, showDepartmentHistory = false, withGraduationDate = false }) {
  const emptyForm = { full_name: '', email: '', password: '', id_number: '', ...(withDepartment ? { department: '' } : {}), ...(withGraduationDate ? { expected_graduation: '' } : {}) };
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptHistory, setDeptHistory] = useState(null);
  const [deptHistoryLoading, setDeptHistoryLoading] = useState(false);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [warn, setWarn] = useState('');
  const [err, setErr] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => api.get(apiBase).then((res) => setItems(res.data.users));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [apiBase]);
  useEffect(() => {
    if (withDepartment) api.get('/departments').then((res) => setDepartments(res.data.departments));
    /* eslint-disable-next-line */
  }, [withDepartment]);

  // Q4: when creating a Department Head, look up whether the chosen
  // department has any history (a previously deleted head + the teachers
  // they created) so the Admin Librarian sees it before confirming.
  useEffect(() => {
    if (!showDepartmentHistory || editing || !form.department) { setDeptHistory(null); return; }
    const dept = departments.find((d) => d.name === form.department);
    if (!dept) { setDeptHistory(null); return; }
    let cancelled = false;
    setDeptHistoryLoading(true);
    api.get(`/admin-librarian/departments/${dept.id}/history`)
      .then((res) => { if (!cancelled) setDeptHistory(res.data); })
      .catch(() => { if (!cancelled) setDeptHistory(null); })
      .finally(() => { if (!cancelled) setDeptHistoryLoading(false); });
    return () => { cancelled = true; };
    /* eslint-disable-next-line */
  }, [showDepartmentHistory, form.department, editing, departments]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setErr(''); setModalOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ full_name: u.full_name, email: u.email, id_number: u.id_number || '', password: '', ...(withDepartment ? { department: u.department || '' } : {}), ...(withGraduationDate ? { expected_graduation: u.expected_graduation ? String(u.expected_graduation).slice(0, 10) : '' } : {}) });
    setErr(''); setModalOpen(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setWarn('');
    const fe = textFieldError(form.full_name, 'Full name', 5);
    if (fe) { setErr(fe); return; }
    const ie = idFieldError(form.id_number, idLabel);
    if (ie) { setErr(ie); return; }
    const pe = passwordStrengthError(form.password);
    if (pe) { setErr(pe); return; }
    if (withGraduationDate) {
      const ge = graduationDateError(form.expected_graduation);
      if (ge) { setErr(ge); return; }
    }
    try {
      const res = await api.post(apiBase, form);
      if (res.data.emailSent === false) {
        setWarn(res.data.message);
      } else {
        setMsg(res.data.message || `${entityLabel} account created successfully. Login credentials were emailed to them.`);
      }
      setModalOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || `Could not create ${entityLabel.toLowerCase()} account.`);
    }
  };

  const submitEditForm = (e) => {
    e.preventDefault();
    setModalOpen(false);
    setPendingAction({ type: 'edit', target: editing });
  };

  const confirmEdit = async (confirm_password) => {
    try {
      await api.patch(`${apiBase}/${pendingAction.target.id}`, { ...form, confirm_password });
      setMsg(`${entityLabel} account updated successfully.`);
      setPendingAction(null);
      load();
    } catch (e2) {
      setPendingAction(null);
      setErr(e2.response?.data?.message || `Could not update ${entityLabel.toLowerCase()} account.`);
    }
  };

  const toggleActive = async (u) => {
    await api.patch(`${activeBase}/${u.id}/active`, { is_active: !u.is_active });
    load();
  };

  const askDelete = (u) => setPendingAction({ type: 'delete', target: u });

  const confirmDelete = async (confirm_password) => {
    await api.delete(`${apiBase}/${pendingAction.target.id}`, { data: { confirm_password } });
    setMsg(`${entityLabel} account deleted.`);
    setPendingAction(null);
    load();
  };

  const filtered = items.filter((u) =>
    !q || u.full_name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) ||
    (u.id_number || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">{title}</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {warn && <div className="alert alert-warning">{warn}</div>}
      {err && !modalOpen && <div className="alert alert-danger">{err}</div>}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by name, email, or ID..." />
        <button className="btn btn-brand" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New {entityLabel}
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Name</th><th>{idLabel}</th>{withDepartment && <th>Department</th>}{withGraduationDate && <th>Expected Graduation</th>}<th>Email</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.id_number || '-'}</td>
                {withDepartment && <td>{u.department || '-'}</td>}
                {withGraduationDate && <td>{u.expected_graduation ? new Date(u.expected_graduation).toLocaleDateString() : '-'}</td>}
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>{u.is_active ? 'Active' : 'Deactivated'}</span>
                  {u.is_active && u.graduation_override && (
                    <span className="badge bg-info text-dark ms-1" title="Manually reactivated after the expected graduation date passed (e.g. withdrawal cancelled). The automatic deactivation job will not touch this account again unless the graduation date is changed.">
                      Manually kept active
                    </span>
                  )}
                </td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(u)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => toggleActive(u)}>
                    {u.is_active ? <i className="bi bi-pause-fill"></i> : <i className="bi bi-play-fill"></i>}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(u)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5 + (withDepartment ? 1 : 0) + (withGraduationDate ? 1 : 0)} className="text-center text-muted py-4">No {entityLabel.toLowerCase()} accounts found.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${entityLabel} Account` : `Create ${entityLabel} Account`}>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={editing ? submitEditForm : submitCreate}>
          <div className="mb-3">
            <label className="form-label">Full Name *</label>
            <input className="form-control" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} minLength={5} required />
            <div className="form-text">At least 5 characters.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">{idLabel} *</label>
            <input className="form-control" value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} minLength={5} maxLength={12} required />
            <div className="form-text">5-12 characters, letters and/or numbers.</div>
          </div>
          {withDepartment && (
            <div className="mb-3">
              <label className="form-label">Department *</label>
              <select className="form-select" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                <option value="" disabled>Select a department...</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.default_id ? `${d.default_id} — ${d.name}` : d.name}</option>)}
              </select>
              {departments.length === 0 && (
                <div className="form-text text-warning">No departments exist yet. Add one under "Manage Departments" first.</div>
              )}
            </div>
          )}

          {showDepartmentHistory && !editing && form.department && (
            <div className="mb-3">
              {deptHistoryLoading && <div className="text-muted small">Checking department history...</div>}
              {!deptHistoryLoading && deptHistory && deptHistory.currentHead && (
                <div className="alert alert-warning small mb-2">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  <strong>{deptHistory.currentHead.full_name}</strong> is already the Department Head for this department. Remove them first before assigning a new one.
                </div>
              )}
              {!deptHistoryLoading && deptHistory && !deptHistory.currentHead && (deptHistory.formerHeads.length > 0 || deptHistory.teachers.length > 0) && (
                <div className="alert alert-info small mb-2">
                  <i className="bi bi-clock-history me-1"></i>
                  <strong>This department had a previous Department Head.</strong>
                  {deptHistory.formerHeads.length > 0 && (
                    <div className="mt-2">
                      {deptHistory.formerHeads.map((h) => (
                        <div key={h.id}>
                          Most recently: <strong>{h.full_name}</strong> ({h.email}{h.id_number ? `, ID ${h.id_number}` : ''}) — deleted {new Date(h.deleted_at).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  )}
                  {deptHistory.teachers.length > 0 && (
                    <div className="mt-2">
                      <div>Teachers already created under this department ({deptHistory.teachers.length}):</div>
                      <ul className="mb-0">
                        {deptHistory.teachers.map((t) => (
                          <li key={t.id}>{t.full_name} — {t.email}{t.id_number ? ` (ID ${t.id_number})` : ''} {!t.is_active && <span className="text-muted">(deactivated)</span>}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2">These teachers will remain assigned to this department and become visible to whoever you assign as the new Department Head.</div>
                </div>
              )}
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">Email (this is where their login credentials will be sent)</label>
            <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          {withGraduationDate && (
            <div className="mb-3">
              <label className="form-label">Expected Graduation Date *</label>
              <input type="date" className="form-control" value={form.expected_graduation} onChange={(e) => setForm({ ...form, expected_graduation: e.target.value })} required />
              <div className="form-text">Year, month, and day. Once this date passes, the account is automatically deactivated (it can be manually reactivated afterward if needed, e.g. a cancelled withdrawal).</div>
            </div>
          )}
          {!editing && (
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="text" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
              <div className="form-text">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character. This will be emailed to the new account's Gmail address along with their username.</div>
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
            ? `Enter YOUR password to permanently delete ${pendingAction?.target?.full_name}'s account.`
            : `Enter YOUR password to save changes to ${pendingAction?.target?.full_name}'s account.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete Account' : 'Save Changes'}
        onCancel={() => setPendingAction(null)}
        onConfirm={pendingAction?.type === 'delete' ? confirmDelete : confirmEdit}
      />
    </>
  );
}
