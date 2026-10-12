export default function StatusBadge({ status }) {
  const map = {
    pending: 'bg-warning text-dark',
    approved: 'bg-success',
    rejected: 'bg-danger',
  };
  return <span className={`badge ${map[status] || 'bg-secondary'} text-capitalize`}>{status}</span>;
}
