import { useState, useEffect } from 'react';
import api from '../api/axios';
import { textFieldError } from '../utils/validateText';

export default function RequestResource() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadRequests = () => api.get('/requests/mine').then((res) => setMyRequests(res.data.requests));

  useEffect(() => { loadRequests(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    for (const [value, label] of [[title, 'Title'], [subject, 'Subject']]) {
      const fieldErr = textFieldError(value, label);
      if (fieldErr) { setErr(fieldErr); return; }
    }
    try {
      await api.post('/requests', { title, author, subject, reason });
      setMsg('Your request has been sent to the Librarian.');
      setTitle(''); setAuthor(''); setSubject(''); setReason('');
      loadRequests();
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not submit request.');
    }
  };

  return (
    <>
      <h3 className="fw-bold mb-4">Suggest a New Resource</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="form-label">Title *</label>
                  <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Subject *</label>
                  <input className="form-control" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Author</label>
                  <input className="form-control" value={author} onChange={(e) => setAuthor(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Why do you need this?</label>
                  <textarea className="form-control" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <button className="btn btn-brand">Submit Request</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <h5>My Requests</h5>
          <div className="table-responsive">
            <table className="table bg-white">
              <thead><tr><th>Title</th><th>Subject</th><th>Status</th></tr></thead>
              <tbody>
                {myRequests.map((r) => (
                  <tr key={r.id}><td>{r.title}</td><td>{r.subject || '-'}</td><td className="text-capitalize">{r.status}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
