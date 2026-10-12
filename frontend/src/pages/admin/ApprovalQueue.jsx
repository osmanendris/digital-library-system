import ApprovalQueueGeneric from '../../components/ApprovalQueueGeneric';

// Admin Librarian's queue: FINAL approval stage for every resource (Q3).
export default function ApprovalQueue() {
  return (
    <ApprovalQueueGeneric
      apiBase="/admin-librarian"
      description="Final approval stage for every resource in the system. Teacher uploads arrive here only after their Department Head has already given stage-1 approval."
    />
  );
}
