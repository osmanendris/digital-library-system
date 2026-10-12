import AccountManager from '../../components/AccountManager';

// Q2: shows and manages EVERY student system-wide, regardless of whether
// a Librarian or the Admin Librarian registered them.
export default function ManageStudents() {
  return (
    <AccountManager
      apiBase="/admin-librarian/students"
      activeBase="/admin-librarian/students"
      title="Manage Students"
      entityLabel="Student"
      idLabel="Student ID"
      withDepartment
      withGraduationDate
    />
  );
}
