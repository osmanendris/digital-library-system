import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { passwordStrengthError } from '../utils/validateText';

// Q7: lets anyone reset their own password with an emailed OTP, replacing
// the admin-side "Reset Password" button.
export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email' -> 'reset' -> 'done'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requestOtp = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMsg(res.data.message);
      setStep('reset');
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setErr('');
    const pe = passwordStrengthError(newPassword);
    if (pe) { setErr(pe); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      setStep('done');
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Could not reset password.');
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
                <h4 className="fw-bold">Forgot Password</h4>
                <p className="text-muted small">
                  {step === 'email' && "Enter your account email and we'll send you a one-time code."}
                  {step === 'reset' && 'Enter the code we emailed you along with your new password.'}
                  {step === 'done' && 'Your password has been reset.'}
                </p>
              </div>
              {err && <div className="alert alert-danger py-2">{err}</div>}
              {msg && step === 'reset' && <div className="alert alert-success py-2">{msg}</div>}

              {step === 'email' && (
                <form onSubmit={requestOtp}>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <button className="btn btn-brand w-100" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Code'}</button>
                </form>
              )}

              {step === 'reset' && (
                <form onSubmit={submitReset}>
                  <div className="mb-3">
                    <label className="form-label">6-digit code</label>
                    <input className="form-control" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required autoFocus />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">New password</label>
                    <input type="text" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
                    <div className="form-text">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.</div>
                  </div>
                  <button className="btn btn-brand w-100" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
                  <button type="button" className="btn btn-link w-100 mt-1" onClick={requestOtp}>Resend code</button>
                </form>
              )}

              {step === 'done' && (
                <div className="text-center">
                  <div className="alert alert-success">Your password has been reset successfully.</div>
                  <button className="btn btn-brand w-100" onClick={() => navigate('/login')}>Go to Login</button>
                </div>
              )}

              <div className="text-center mt-3">
                <Link to="/login" className="small">Back to login</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
