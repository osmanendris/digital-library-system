import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import SearchInput from '../../components/SearchInput';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import PasswordConfirmModal from '../../components/PasswordConfirmModal';
import formatBytes from '../../utils/formatBytes';

// Librarian's full resource oversight: unlike Admin's read-only view, the
// Librarian can edit metadata or delete ANY resource (their core
// quality-control responsibility), in addition to approving/rejecting in
// the separate Approval Queue.
export default function LibrarianAllResources() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [pendingAction, setPendingAction] = useState(null); // { type: 'edit'|'delete', target }
  const [msg, setMsg] = useState('');

  const load = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/admin-librarian/resources', { params }).then((res) => setResources(res.data.resources));
    api.get('/categories').then((res) => setCategories(res.data.categories));
  };
  useEffect(() => { load(); }, [statusFilter]);

  const openEdit = (r) => {
    setEditing(r);
    setEditForm({
      title: r.title, author: r.author, subject: r.subject, keywords: r.keywords,
      description: r.description, category_id: r.category_id, downloadable: r.downloadable,
      file_type: r.file_type, allowed_roles: r.allowed_roles || [],
    });
  };

  const submitEditForm = (e) => {
    e.preventDefault();
    setEditing(null);
    setPendingAction({ type: 'edit', target: editing });
  };

  const confirmEdit = async (confirm_password) => {
    await api.patch(`/admin-librarian/resources/${pendingAction.target.id}`, { ...editForm, confirm_password });
    setMsg('Resource updated successfully.');
    setPendingAction(null);
    load();
  };

  const askDelete = (r) => setPendingAction({ type: 'delete', target: r });

  const confirmDelete = async (confirm_password) => {
    await api.delete(`/admin-librarian/resources/${pendingAction.target.id}`, { data: { confirm_password } });
    setMsg('Resource deleted.');
    setPendingAction(null);
    load();
  };

  const filtered = resources.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) ||
    (r.subject || '').toLowerCase().includes(q.toLowerCase()) ||
    (r.uploader_name || '').toLowerCase().includes(q.toLowerCase()) ||
    (r.category_name || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">All Resources</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search by title, uploader, or category..." />
        <div className="btn-group mb-3">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s || 'all'}
              className={`btn btn-sm ${statusFilter === s ? 'btn-brand' : 'btn-outline-secondary'}`}
              onClick={() => setSearchParams(s ? { status: s } : {})}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead>
            <tr>
              <th>Title</th><th>Subject</th><th>Uploaded By</th><th>Role</th><th>Category</th>
              <th>Status</th><th>Type</th><th>Size</th><th>Views</th><th>Downloads</th><th>Submitted</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.subject || '-'}</td>
                <td>{r.uploader_name || '-'}</td>
                <td className="text-capitalize">{(r.uploader_role || '').replace('_', ' ') || '-'}</td>
                <td>{r.category_name || '-'}</td>
                <td>
                  <StatusBadge status={r.status} />
                  {r.allowed_roles && r.allowed_roles.length > 0 && (
                    <span className="badge bg-warning text-dark ms-1" title={`Restricted to: ${r.allowed_roles.join(', ')}`}>
                      <i className="bi bi-shield-lock"></i>
                    </span>
                  )}
                </td>
                <td className="text-uppercase small">{r.file_type}</td>
                <td>{formatBytes(r.file_size)}</td>
                <td>{r.view_count}</td>
                <td>{r.download_count}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(r)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(r)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="12" className="text-center text-muted py-4">No resources match.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Resource Metadata" size="lg">
        {editing && (
          <form onSubmit={submitEditForm}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input className="form-control" value={editForm.title || ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Author</label>
                <input className="form-control" value={editForm.author || ''} onChange={(e) => setEditForm({ ...editForm, author: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Subject</label>
                <input className="form-control" value={editForm.subject || ''} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Category</label>
                <select className="form-select" value={editForm.category_id || ''} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}>
                  <option value="">-- None --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">
                  File Type <span className="text-muted small">(fix this if it doesn't match the actual uploaded file)</span>
                </label>
                <select className="form-select" value={editForm.file_type || ''} onChange={(e) => setEditForm({ ...editForm, file_type: e.target.value })}>
                  <option value="pdf">PDF</option>
                  <option value="epub">EPUB</option>
                  <option value="doc">DOC</option>
                  <option value="docx">DOCX</option>
                  <option value="ppt">PPT</option>
                  <option value="pptx">PPTX</option>
                  <option value="mp4">MP4</option>
                  <option value="mov">MOV</option>
                </select>
                {editing?.file_path && (
                  <div className="form-text">
                    Actual stored file ends in: <strong>.{editing.file_path.split('.').pop()}</strong> — File Type above should match this.
                  </div>
                )}
              </div>
              <div className="col-12">
                <label className="form-label">Keywords</label>
                <input className="form-control" value={editForm.keywords || ''} onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows="3" value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" checked={!!editForm.downloadable} onChange={(e) => setEditForm({ ...editForm, downloadable: e.target.checked })} id="dlEdit" />
                  <label className="form-check-label" htmlFor="dlEdit">Allow download</label>
                </div>
              </div>
              <div className="col-12">
                <label className="form-label mb-1">Restrict Access <span className="text-muted small">(optional)</span></label>
                <p className="text-muted small mb-2">
                  Leave everything unchecked to allow every logged-in role. Check specific roles to
                  restrict this resource to ONLY those roles.
                </p>
                <div className="d-flex flex-wrap gap-3">
                  {['admin', 'admin_librarian', 'department_head', 'teacher', 'librarian', 'staff', 'student'].map((role) => (
                    <div className="form-check" key={role}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`edit-role-${role}`}
                        checked={(editForm.allowed_roles || []).includes(role)}
                        onChange={() => {
                          const current = editForm.allowed_roles || [];
                          setEditForm({
                            ...editForm,
                            allowed_roles: current.includes(role) ? current.filter((r) => r !== role) : [...current, role],
                          });
                        }}
                      />
                      <label className="form-check-label text-capitalize" htmlFor={`edit-role-${role}`}>{role.replace('_', ' ')}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn btn-brand w-100 mt-3">Continue</button>
          </form>
        )}
      </Modal>

      <PasswordConfirmModal
        open={!!pendingAction}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Confirm Deletion' : 'Confirm Changes'}
        message={
          pendingAction?.type === 'delete'
            ? `Enter YOUR password to permanently delete "${pendingAction?.target?.title}".`
            : `Enter YOUR password to save changes to "${pendingAction?.target?.title}".`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete Resource' : 'Save Changes'}
        onCancel={() => setPendingAction(null)}
        onConfirm={pendingAction?.type === 'delete' ? confirmDelete : confirmEdit}
      />
    </>
  );
}
