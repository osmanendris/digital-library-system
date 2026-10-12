import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  return (
    <>
      <h3 className="fw-bold mb-4">{`Welcome, ${user.full_name}`}</h3>
      <p className="text-muted">
        Use the menu to browse the library, check your favorites and reading history, or suggest a
        new resource for the Librarian to add.
      </p>
    </>
  );
}
