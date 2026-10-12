import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  return (
    <>
      <h3 className="fw-bold mb-4">{`Welcome, ${user.full_name}`}</h3>
      <p className="text-muted mb-4">{user.department} Department</p>
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        Every resource you upload is sent to the <strong>Librarian</strong> for approval before it becomes visible to students.
        Use the menu to upload a new resource or check the status of your existing uploads.
      </div>
    </>
  );
}
