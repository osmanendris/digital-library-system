import { useEffect, useState } from 'react';
import api from '../api/axios';
import SearchInput from './SearchInput';
import Modal from './Modal';
import formatBytes from '../utils/formatBytes';

/**
 * Generic resource-approval queue, used by both Faculty (stage-1 approval
 * of their own teachers' uploads) and Admin Librarian (final approval of
 * everything else).
 *
 * Q4: opening the file to review it is OPTIONAL - a reviewer can approve
 * or reject directly from the summary, or open the file first if they
 * want to inspect it.
 */
export default function ApprovalQueueGeneric({ apiBase, description }) {
  const [resources, setResources] = useState([]);
  const [q, setQ] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [reason, setReason] = useState('');
  const [viewing, setViewing] = useState(null);

  const load = () => api.get(`${apiBase}/queue`).then((res) => setResources(res.data.resources));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [apiBase]);

  const approve = async (id) => {
    await api.patch(`${apiBase}/resources/${id}/approve`);
    setViewing(null);
    load();
  };

  const [rejectErr, setRejectErr] = useState('');
  const submitReject = async () => {
    if (reason.trim().length < 10) {
      setRejectErr('Rejection reason must be at least 10 characters long.');
      return;
    }
    setRejectErr('');
    try {
      await api.patch(`${apiBase}/resources/${rejectId}/reject`, { reason });
      setRejectId(null); setReason(''); setViewing(null);
      load();
    } catch (e) {
      setRejectErr(e.response?.data?.message || 'Could not reject resource.');
    }
  };

  // Opens ONLY the file itself - no site navbar/sidebar/app shell around
  // it - by fetching it as a blob and handing that straight to the
  // browser's native viewer. Routing through the app's own /resource/:id
  // page instead (an earlier version of this) loaded the ENTIRE website in
  // the new tab, which is confusing during a quick review. The backend
  // still runs docx/ppt/etc. through the same LibreOffice-to-PDF
  // conversion used everywhere else, so those still render correctly here
  // too, not just raw formats the browser understands natively.
  //
  // epub is the one exception: no browser has a built-in epub viewer (even
  // as a raw blob, it just downloads), so a bare blob can never preview it
  // no matter what the backend does. The app DOES have a real epub reader
  // (epub.js) - it just only runs inside the full React app, not in a
  // standalone blob tab. So for epub specifically, open the full Reader
  // page instead (as a review tab - see ResourceReader.jsx's "Close Tab"
  // button for that context) rather than the raw-blob approach used for
  // every other format.
  const [opening, setOpening] = useState(false);
  const openFile = async (r) => {
    if ((r.file_type || '').toLowerCase() === 'epub') {
      window.open(`/resource/${r.id}/reader?review=1`, '_blank', 'noopener');
      return;
    }
    setOpening(true);
    try {
      const res = await api.get(`${apiBase}/resources/${r.id}/review-file`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('Could not open the file for review.');
    } finally {
      setOpening(false);
    }
  };

  const filtered = resources.filter((r) =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.uploader_name || '').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <h3 className="fw-bold mb-4">Approval Queue</h3>
      {description && <p className="text-muted">{description}</p>}
      <SearchInput value={q} onChange={setQ} placeholder="Search by title or uploader..." />

      <div className="table-responsive">
        <table className="table table-hover bg-white align-middle">
          <thead><tr><th>Title</th><th>Uploaded By</th><th>Role</th><th>Type</th><th>Size</th><th>Category</th><th>Submitted</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.uploader_name}</td>
                <td className="text-capitalize">{(r.uploader_role || '').replace('_', ' ')}</td>
                <td className="text-uppercase small">{r.file_type}</td>
                <td>{formatBytes(r.file_size)}</td>
                <td>{r.category_name || '-'}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="text-nowrap">
                  <button className="btn btn-sm btn-outline-success" onClick={() => setViewing(r)}>
                    <i className="bi bi-eye"></i> Review
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan="8" className="text-center text-muted py-4">Queue is empty. All caught up!</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Full detail view - the file MUST be opened here before Approve/Reject unlock */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Resource Details" size="lg">
        {viewing && (
          <div>
            <table className="table table-sm">
              <tbody>
                <tr><th style={{ width: 160 }}>Title</th><td>{viewing.title}</td></tr>
                <tr><th style={{ width: 160 }}>Author</th><td>{viewing.author || '-'}</td></tr>
                <tr><th>Subject</th><td>{viewing.subject || '-'}</td></tr>
                <tr><th>Category</th><td>{viewing.category_name || '-'}</td></tr>
                <tr><th>Keywords</th><td>{viewing.keywords || '-'}</td></tr>
                <tr><th>Description</th><td>{viewing.description || '-'}</td></tr>
                <tr><th>File Type</th><td className="text-uppercase">{viewing.file_type}</td></tr>
                <tr><th>File Size</th><td>{formatBytes(viewing.file_size)}</td></tr>
                <tr><th>Downloadable</th><td>{viewing.downloadable ? 'Yes' : 'No'}</td></tr>
                <tr><th>Uploaded By</th><td>{viewing.uploader_name} <span className="text-capitalize text-muted">({(viewing.uploader_role || '').replace('_', ' ')})</span></td></tr>
                <tr><th>Submitted</th><td>{new Date(viewing.created_at).toLocaleString()}</td></tr>
              </tbody>
            </table>

            <button className="btn btn-outline-primary w-100 mb-3" disabled={opening} onClick={() => openFile(viewing)}>
              <i className="bi bi-file-earmark-text me-1"></i> {opening ? 'Opening…' : 'Open File to Review (optional)'}
            </button>

            <div className="d-flex gap-2 mt-2">
              <button className="btn btn-success flex-fill" onClick={() => approve(viewing.id)}>
                <i className="bi bi-check-lg me-1"></i> Approve
              </button>
              <button className="btn btn-outline-danger flex-fill" onClick={() => { setRejectErr(''); setRejectId(viewing.id); }}>
                <i className="bi bi-x-lg me-1"></i> Reject
              </button>
            </div>
          </div>
        )}
      </Modal>

      {rejectId && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5>Reject Resource</h5></div>
              <div className="modal-body">
                <label className="form-label">Reason for rejection (at least 10 characters)</label>
                <textarea className="form-control" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} minLength={10} required />
                {rejectErr && <div className="text-danger small mt-1">{rejectErr}</div>}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => { setRejectId(null); setRejectErr(''); }}>Cancel</button>
                <button className="btn btn-danger" onClick={submitReject}>Confirm Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
