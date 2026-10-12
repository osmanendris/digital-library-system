import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { textFieldError, passwordStrengthError } from '../utils/validateText';

// Any role (student, teacher, faculty, librarian, admin) can edit their own
// profile here. Both the basic-info save AND the password change require the
// CURRENT password to be re-entered, protecting against a hijacked/left-open session.
export default function Profile() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    const fe = textFieldError(fullName, 'Full name', 5);
    if (fe) { setErr(fe); return; }
    try {
      const res = await api.put('/auth/profile', { full_name: fullName, email, current_password: profileCurrentPassword });
      setUser({ ...user, ...res.data.user });
      // The backend reissues a fresh token reflecting the updated info -
      // store it, so subsequent requests never rely on stale login-time data.
      if (res.data.token) localStorage.setItem('dl_token', res.data.token);
      setMsg('Profile updated successfully.');
      setProfileCurrentPassword('');
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Update failed.');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg(''); setErr('');
    const pe = passwordStrengthError(newPassword);
    if (pe) { setErr(pe); return; }
    try {
      await api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setMsg('Password changed successfully.');
      setCurrentPassword(''); setNewPassword('');
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Password change failed.');
    }
  };

  return (
    <>
      <h3 className="fw-bold mb-4">Profile Settings</h3>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-danger">{err}</div>}
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title mb-3">Basic Info</h5>
              <form onSubmit={saveProfile}>
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <input className="form-control text-capitalize" value={(user?.role || '').replace('_', ' ')} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label">Current Password <span className="text-muted small">(required to save changes)</span></label>
                  <input
                    type="password"
                    className="form-control"
                    value={profileCurrentPassword}
                    onChange={(e) => setProfileCurrentPassword(e.target.value)}
                    required
                    autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                  />
                </div>
                <button className="btn btn-brand">Save Changes</button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title mb-3">Change Password</h5>
              <form onSubmit={changePassword}>
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-control" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input type="password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" data-lpignore="true" data-1p-ignore="true" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
                  <div className="form-text">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.</div>
                </div>
                <button className="btn btn-outline-primary">Update Password</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
