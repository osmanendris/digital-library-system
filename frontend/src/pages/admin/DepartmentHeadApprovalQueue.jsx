import ApprovalQueueGeneric from '../../components/ApprovalQueueGeneric';

// Faculty's queue: STAGE 1 approval, teacher uploads from their own department only.
export default function DepartmentHeadApprovalQueue() {
  return (
    <ApprovalQueueGeneric
      apiBase="/department-head"
      description="Stage-1 approval for resources uploaded by teachers you created. Approving here forwards the resource to the Admin Librarian for final approval - it is not published yet."
    />
  );
}
