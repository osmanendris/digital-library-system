import { useState } from 'react';
import Modal from './Modal';

// Reusable "type your password to confirm" prompt for sensitive edit/delete
// actions. The parent supplies onConfirm(password) which performs the actual
// API call; this component just collects and validates that a password was
// typed, and surfaces any error the parent reports back (e.g. wrong password).
export default function PasswordConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldName] = useState(() => `confirm-pw-${Math.random().toString(36).slice(2)}`);

  const handleConfirm = async () => {
    if (!password) { setError('Please enter your password.'); return; }
    setLoading(true); setError('');
    try {
      await onConfirm(password);
      setPassword('');
    } catch (e) {
      setError(e?.response?.data?.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword(''); setError('');
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel} title={title || 'Confirm Your Password'}>
      <p className="text-muted small">{message || 'For security, please re-enter your password to continue.'}</p>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <input
        type="password"
        className="form-control mb-3"
        placeholder="Your current password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        autoComplete="new-password"
        data-lpignore="true"
        data-1p-ignore="true"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        name={fieldName}
      />
      <div className="d-flex gap-2">
        <button className="btn btn-outline-secondary flex-fill" onClick={handleCancel}>Cancel</button>
        <button className={`btn flex-fill ${danger ? 'btn-danger' : 'btn-brand'}`} onClick={handleConfirm} disabled={loading}>
          {loading ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
