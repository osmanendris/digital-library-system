import AccountManager from '../../components/AccountManager';

// NEW Librarian role (Q2): replaces Faculty's "Manage Teachers" with
// "Manage Students" - students can now be registered by either a
// Librarian or an Admin Librarian (Q5).
export default function ManageMyStudents() {
  return (
    <AccountManager
      apiBase="/librarian/students"
      activeBase="/librarian/students"
      title="Manage Students"
      entityLabel="Student"
      idLabel="Student ID"
      withDepartment
      withGraduationDate
    />
  );
}
