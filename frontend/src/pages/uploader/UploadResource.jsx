import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { textFieldError, isPureNumber } from '../../utils/validateText';

// Friendly labels + accepted extensions for each file "type" a resource can be tagged as.
// The actual set of extensions the SERVER will accept is driven live by
// Settings > Allowed File Types (Admin-configurable) - fetched below.
const TYPE_LABELS = {
  pdf: { label: 'PDF Document', ext: ['.pdf'] },
  epub: { label: 'EPUB E-book', ext: ['.epub'] },
  ppt: { label: 'Presentation (PPT/PPTX)', ext: ['.ppt', '.pptx'] },
  pptx: { label: 'Presentation (PPTX)', ext: ['.pptx'] },
  doc: { label: 'Word Document (DOC)', ext: ['.doc'] },
  docx: { label: 'Word Document (DOCX)', ext: ['.docx'] },
  video: { label: 'Video', ext: ['.mp4', '.mov', '.mkv'] },
  mp4: { label: 'Video (MP4)', ext: ['.mp4'] },
  mov: { label: 'Video (MOV)', ext: ['.mov'] },
};

export default function UploadResource() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [ttlmLevels, setTtlmLevels] = useState([]);
  const [allowedTypes, setAllowedTypes] = useState([]);
  const [maxSizeMb, setMaxSizeMb] = useState(100);
  const [form, setForm] = useState({
    title: '', author: '', subject: '', keywords: '', description: '',
    category_id: '', downloadable: false, file_type: '',
    publish_immediately: false, is_ttlm: false, ttlm_level_id: '',
  });
  // Optional: restrict which roles can see/read/download this resource at
  // all. Empty selection = visible to every logged-in role (default,
  // unrestricted) - same as before this feature existed.
  const [restrictedRoles, setRestrictedRoles] = useState([]);
  const ALL_ROLES = ['admin', 'admin_librarian', 'department_head', 'teacher', 'librarian', 'staff', 'student'];
  const toggleRole = (role) => {
    setRestrictedRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]);
  };
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data.categories));
    api.get('/ttlm-levels').then((res) => setTtlmLevels(res.data.levels));
    api.get('/settings').then((res) => {
      const types = (res.data.settings.allowed_file_types || 'pdf,epub,mp4')
        .split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      setAllowedTypes(types);
      setMaxSizeMb(parseInt(res.data.settings.max_file_size_mb) || 100);
      setForm((f) => ({ ...f, file_type: types[0] || 'pdf' }));
    });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const acceptAttr = allowedTypes.flatMap((t) => TYPE_LABELS[t]?.ext || [`.${t}`]).join(',');

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr(''); setLoading(true);
    if (!file) { setErr('Please choose a file to upload.'); setLoading(false); return; }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setErr(`File exceeds the maximum allowed size of ${maxSizeMb}MB.`);
      setLoading(false);
      return;
    }
    // Make sure the actual file you picked matches the File Type you selected
    // above - e.g. selecting "PDF" but choosing a .docx file used to silently
    // upload anyway, and then fail (or force a download) when read online.
    const expectedExts = TYPE_LABELS[form.file_type]?.ext || [`.${form.file_type}`];
    const actualExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!expectedExts.includes(actualExt)) {
      setErr(`You selected "${TYPE_LABELS[form.file_type]?.label || form.file_type}" as the file type, but chose a file ending in "${actualExt}". Please either pick a matching file, or change the File Type dropdown to match (accepted for this type: ${expectedExts.join(', ')}).`);
      setLoading(false);
      return;
    }
    for (const [value, label, minLen] of [[form.title, 'Title', 3], [form.author, 'Author', 3], [form.subject, 'Subject', 3], [form.description, 'Description', 1]]) {
      const fieldErr = textFieldError(value, label, minLen);
      if (fieldErr) { setErr(fieldErr); setLoading(false); return; }
    }
    if (form.keywords && isPureNumber(form.keywords)) {
      setErr('Keywords must be text, not just a number.');
      setLoading(false);
      return;
    }
    if (form.is_ttlm && !form.ttlm_level_id) {
      setErr('Select a TTLM level, or uncheck the TTLM box.');
      setLoading(false);
      return;
    }
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('file', file);
      if (cover) data.append('cover', cover);
      if (restrictedRoles.length > 0) data.append('allowed_roles', JSON.stringify(restrictedRoles));

      const res = await api.post('/resources', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg(res.data.message);
      setForm((f) => ({ ...f, title: '', author: '', subject: '', keywords: '', description: '', category_id: '', downloadable: false, publish_immediately: false, is_ttlm: false, ttlm_level_id: '' }));
      setRestrictedRoles([]);
      setFile(null); setCover(null);
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h3 className="fw-bold mb-4">Upload New Resource</h3>
      <div className="alert alert-secondary small">
        Allowed file types right now: <strong>{allowedTypes.join(', ') || 'loading...'}</strong> · Max size: <strong>{maxSizeMb}MB</strong>
        {(user.role === 'admin') && <> — change this in <a href="/admin/settings">System Settings</a>.</>}
      </div>
      <div className="card shadow-sm border-0">
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Title *</label>
                <input className="form-control" name="title" value={form.title} onChange={handleChange} minLength={3} required />
                <div className="form-text">At least 3 characters.</div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Author *</label>
                <input className="form-control" name="author" value={form.author} onChange={handleChange} minLength={3} required />
                <div className="form-text">At least 3 characters.</div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Subject *</label>
                <input className="form-control" name="subject" value={form.subject} onChange={handleChange} minLength={3} required />
                <div className="form-text">At least 3 characters.</div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Category *</label>
                <select className="form-select" name="category_id" value={form.category_id} onChange={(e) => {
                  const category_id = e.target.value;
                  setForm((f) => ({ ...f, category_id, ...(category_id ? {} : { is_ttlm: false, ttlm_level_id: '' }) }));
                }} required>
                  <option value="">-- Select --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="is_ttlm"
                    id="ttlm"
                    checked={form.is_ttlm}
                    disabled={!form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, is_ttlm: e.target.checked, ttlm_level_id: e.target.checked ? f.ttlm_level_id : '' }))}
                  />
                  <label className="form-check-label" htmlFor="ttlm">
                    TTLM {!form.category_id && <span className="text-muted">(select a category first)</span>}
                  </label>
                </div>
              </div>
              {form.is_ttlm && (
                <div className="col-12 col-md-6">
                  <label className="form-label">TTLM Level *</label>
                  <select className="form-select" name="ttlm_level_id" value={form.ttlm_level_id} onChange={handleChange} required>
                    <option value="">-- Select level --</option>
                    {ttlmLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  {ttlmLevels.length === 0 && (
                    <div className="form-text text-warning">No levels exist yet — ask the Admin Librarian to add one under "Manage TTLM Levels".</div>
                  )}
                </div>
              )}
              <div className="col-12">
                <label className="form-label">Keywords (comma separated)</label>
                <input className="form-control" name="keywords" value={form.keywords} onChange={handleChange} />
              </div>
              <div className="col-12">
                <label className="form-label">Description *</label>
                <textarea className="form-control" rows="3" name="description" value={form.description} onChange={handleChange} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">File Type *</label>
                <select className="form-select" name="file_type" value={form.file_type} onChange={handleChange} required>
                  {allowedTypes.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]?.label || t.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6 d-flex align-items-end">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" name="downloadable" checked={form.downloadable} onChange={handleChange} id="dl" />
                  <label className="form-check-label" htmlFor="dl">Allow download</label>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Resource File *</label>
                <input type="file" className="form-control" accept={acceptAttr} onChange={(e) => setFile(e.target.files[0])} required />
                <div className="form-text">Accepted: {allowedTypes.join(', ')}</div>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">Cover Image (optional)</label>
                <input type="file" accept="image/*" className="form-control" onChange={(e) => setCover(e.target.files[0])} />
              </div>

              {user.role === 'admin_librarian' && (
                <div className="col-12">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" name="publish_immediately" checked={form.publish_immediately} onChange={handleChange} id="pub" />
                    <label className="form-check-label" htmlFor="pub">
                      Quick Approve (skip the approval queue — publishes straight to Browse Library)
                    </label>
                  </div>
                </div>
              )}

              <div className="col-12">
                <label className="form-label mb-1">
                  Restrict Access <span className="text-muted small">(optional)</span>
                </label>
                <p className="text-muted small mb-2">
                  By default, every logged-in role can see and read this resource once approved. Select
                  specific roles below to restrict it to ONLY those roles — everyone else won't see it
                  at all, anywhere in the site.
                </p>
                <div className="d-flex flex-wrap gap-3">
                  {ALL_ROLES.map((role) => (
                    <div className="form-check" key={role}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`role-${role}`}
                        checked={restrictedRoles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <label className="form-check-label text-capitalize" htmlFor={`role-${role}`}>{role.replace('_', ' ')}</label>
                    </div>
                  ))}
                </div>
                {restrictedRoles.length > 0 && (
                  <div className="alert alert-warning small mt-2 py-2 mb-0">
                    <i className="bi bi-shield-lock me-1"></i>
                    Only <strong>{restrictedRoles.join(', ')}</strong> will be able to see or open this resource.
                  </div>
                )}
              </div>
            </div>
            <button className="btn btn-brand mt-4" disabled={loading}>{loading ? 'Uploading...' : 'Submit Resource'}</button>
            {msg && <div className="alert alert-success mt-3 mb-0">{msg}</div>}
            {err && <div className="alert alert-danger mt-3 mb-0">{err}</div>}
          </form>
        </div>
      </div>
    </>
  );
}
