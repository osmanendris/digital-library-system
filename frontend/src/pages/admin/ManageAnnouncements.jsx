import { useEffect, useState } from 'react';
import api from '../../api/axios';
import Modal from '../../components/Modal';
import PasswordConfirmModal from '../../components/PasswordConfirmModal';
import SearchInput from '../../components/SearchInput';
import { textFieldError } from '../../utils/validateText';
import { assetBase } from '../../utils/assetUrl';

// Q3: announcements can now include an image and/or video (an uploaded
// file, or a pasted link like YouTube instead of an upload). Every role
// reads the full post - with its media - on their own "Announcements"
// dashboard page; this table is just the management/authoring screen.
const emptyForm = { title: '', message: '', video_url: '' };

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [clearImage, setClearImage] = useState(false);
  const [clearVideo, setClearVideo] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const load = () => api.get('/announcements/all').then((res) => setAnnouncements(res.data.announcements));
  useEffect(() => { load(); }, []);

  const resetMediaState = () => { setImageFile(null); setVideoFile(null); setClearImage(false); setClearVideo(false); };

  const openCreate = () => { setEditing(null); setForm(emptyForm); resetMediaState(); setErr(''); setModalOpen(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({ title: a.title, message: a.message, video_url: a.video_url || '' });
    resetMediaState();
    setErr(''); setModalOpen(true);
  };

  const validate = () => {
    const te = textFieldError(form.title, 'Title', 3);
    if (te) return te;
    const me = textFieldError(form.message, 'Message', 10);
    if (me) return me;
    return null;
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('message', form.message);
    if (form.video_url && !videoFile) fd.append('video_url', form.video_url);
    if (imageFile) fd.append('image', imageFile);
    if (videoFile) fd.append('video', videoFile);
    if (clearImage) fd.append('clear_image', 'true');
    if (clearVideo) fd.append('clear_video', 'true');
    return fd;
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setErr('');
    const ve = validate();
    if (ve) { setErr(ve); return; }
    try {
      await api.post('/announcements', buildFormData(), { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('Announcement posted. It is now visible to every role on their Announcements page (and the public Home page).');
      setModalOpen(false);
      load();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not post announcement.');
    }
  };

  const submitEditForm = (e) => {
    e.preventDefault();
    const ve = validate();
    if (ve) { setErr(ve); return; }
    setModalOpen(false);
    setPendingAction({ type: 'edit', target: editing });
  };

  const confirmEdit = async (confirm_password) => {
    try {
      const fd = buildFormData();
      fd.append('confirm_password', confirm_password);
      await api.patch(`/announcements/${pendingAction.target.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg('Announcement updated.');
      setPendingAction(null);
      load();
    } catch (e2) {
      setPendingAction(null);
      setErr(e2.response?.data?.message || 'Could not update announcement.');
    }
  };

  const toggleActive = async (a) => {
    await api.patch(`/announcements/${a.id}/active`, { is_active: !a.is_active });
    load();
  };

  const askDelete = (a) => setPendingAction({ type: 'delete', target: a });

  const confirmDelete = async (confirm_password) => {
    try {
      await api.delete(`/announcements/${pendingAction.target.id}`, { data: { confirm_password } });
      setMsg('Announcement deleted.');
      setPendingAction(null);
      load();
    } catch (e2) {
      setPendingAction(null);
      setErr(e2.response?.data?.message || 'Could not delete announcement.');
    }
  };

  const filtered = announcements.filter((a) =>
    !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.message.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">Manage Announcements</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && !modalOpen && <div className="alert alert-danger">{err}</div>}

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search announcements..." />
        <button className="btn btn-brand" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New Announcement
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Media</th><th>Title</th><th>Message</th><th>Posted</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.image_filename && <img src={`${assetBase}/uploads/media/${a.image_filename}`} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />}
                  {(a.video_filename || a.video_url) && <i className="bi bi-camera-video ms-1 text-muted"></i>}
                </td>
                <td className="fw-semibold" style={{ maxWidth: 200, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{a.title}</td>
                <td className="small text-muted" style={{ maxWidth: 360, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{a.message.length > 120 ? a.message.slice(0, 120) + '…' : a.message}</td>
                <td className="text-nowrap small text-muted">{new Date(a.created_at).toLocaleDateString()}</td>
                <td><span className={`badge ${a.is_active ? 'bg-success' : 'bg-secondary'}`}>{a.is_active ? 'Active' : 'Paused'}</span></td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(a)}><i className="bi bi-pencil"></i></button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => toggleActive(a)} title={a.is_active ? 'Pause (hide from everyone)' : 'Activate (show to everyone)'}>
                    {a.is_active ? <i className="bi bi-pause-fill"></i> : <i className="bi bi-play-fill"></i>}
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => askDelete(a)}><i className="bi bi-trash"></i></button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="6" className="text-center text-muted py-4">No announcements yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Announcement' : 'New Announcement'}>
        {err && <div className="alert alert-danger">{err}</div>}
        <form onSubmit={editing ? submitEditForm : submitCreate}>
          <div className="mb-3">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} minLength={3} required />
            <div className="form-text">At least 3 characters.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Message *</label>
            <textarea className="form-control" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} minLength={10} required />
            <div className="form-text">At least 10 characters. Shown in full (as a paragraph) on everyone's Announcements page.</div>
          </div>

          <div className="mb-3">
            <label className="form-label">Image (optional)</label>
            {editing?.image_filename && !clearImage && (
              <div className="mb-2 d-flex align-items-center gap-2">
                <img src={`${assetBase}/uploads/media/${editing.image_filename}`} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setClearImage(true)}>Remove current image</button>
              </div>
            )}
            <input type="file" accept="image/*" className="form-control" onChange={(e) => setImageFile(e.target.files[0] || null)} />
          </div>

          <div className="mb-3">
            <label className="form-label">Video (optional)</label>
            {editing?.video_filename && !clearVideo && (
              <div className="mb-2 d-flex align-items-center gap-2">
                <span className="text-muted small"><i className="bi bi-camera-video me-1"></i>Current video uploaded</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setClearVideo(true)}>Remove current video</button>
              </div>
            )}
            <input type="file" accept="video/*" className="form-control mb-2" onChange={(e) => setVideoFile(e.target.files[0] || null)} />
            <div className="form-text mb-1">— or paste a link instead (e.g. YouTube) —</div>
            <input
              type="url" className="form-control" placeholder="https://youtube.com/watch?v=..."
              value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              disabled={!!videoFile}
            />
          </div>

          <button className="btn btn-brand w-100">{editing ? 'Continue' : 'Post Announcement'}</button>
        </form>
      </Modal>

      <PasswordConfirmModal
        open={pendingAction?.type === 'edit' || pendingAction?.type === 'delete'}
        danger={pendingAction?.type === 'delete'}
        title={pendingAction?.type === 'delete' ? 'Confirm Deletion' : 'Confirm Changes'}
        message={
          pendingAction?.type === 'delete'
            ? `Enter YOUR password to permanently delete the "${pendingAction?.target?.title}" announcement.`
            : `Enter YOUR password to save changes to the "${pendingAction?.target?.title}" announcement.`
        }
        confirmLabel={pendingAction?.type === 'delete' ? 'Delete Announcement' : 'Save Changes'}
        onCancel={() => setPendingAction(null)}
        onConfirm={pendingAction?.type === 'delete' ? confirmDelete : confirmEdit}
      />
    </>
  );
}
