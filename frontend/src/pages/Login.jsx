import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleHome = {
  admin: '/admin',
  admin_librarian: '/admin-librarian',
  department_head: '/department-head',
  teacher: '/teacher',
  librarian: '/librarian',
  staff: '/dashboard',
  student: '/dashboard',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Both fields start read-only and only become editable on focus. Browsers
  // generally will NOT auto-populate a field that's read-only when the page
  // loads, which is what was causing old credentials to appear pre-filled
  // after logout. Combined with autoComplete="off" this also suppresses the
  // saved-credentials suggestion dropdown in most browsers.
  const [emailReadOnly, setEmailReadOnly] = useState(true);
  const [passwordReadOnly, setPasswordReadOnly] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(roleHome[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <img src="/logo.jpg" alt="logo" style={{ width: 70, height: 70, borderRadius: '50%' }} />
                <h4 className="mt-3 fw-bold">Welcome Back</h4>
                <p className="text-muted small">
                  All accounts (Department Head, Teacher, Librarian, Staff, Student) are created by an administrator or your
                  department. Contact them if you don't have login credentials yet.
                </p>
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={handleSubmit} autoComplete="off">
                {/* Hidden decoy fields absorb the browser's autofill targeting
                    before it reaches the real fields below. */}
                <input type="text" name="fake-username" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />
                <input type="password" name="fake-password" style={{ display: 'none' }} tabIndex="-1" aria-hidden="true" />

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailReadOnly(false)}
                    readOnly={emailReadOnly}
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    name="login-email-field"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordReadOnly(false)}
                    readOnly={passwordReadOnly}
                    required
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    name="login-password-field"
                  />
                </div>
                <button className="btn btn-brand w-100" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                <div className="text-center mt-3">
                  <Link to="/forgot-password" className="small">Forgot password?</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
