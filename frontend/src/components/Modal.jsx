// Simple, dependency-free modal (no Bootstrap JS) - fully controlled by the
// parent via the `open` prop, so it can never be silently broken by a
// script-loading issue.
export default function Modal({ open, title, onClose, children, size }) {
  if (!open) return null;
  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded shadow w-100 ${size === 'lg' ? 'lg-modal' : ''}`}
        style={{ maxWidth: size === 'lg' ? 700 : 480, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center border-bottom p-3">
          <h5 className="mb-0">{title}</h5>
          <button className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
}
