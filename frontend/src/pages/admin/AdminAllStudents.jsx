import ReadOnlyUserList from '../../components/ReadOnlyUserList';

// Moved here from System Admin (Q1). Shows EVERY student regardless of
// who registered them (a Librarian or the Admin Librarian - Q2/Q5),
// unlike "Manage Students" which only shows the ones the Admin Librarian
// personally registered.
export default function AdminAllStudents() {
  return (
    <ReadOnlyUserList
      apiPath="/admin-librarian/all-students"
      title="All Students (System-wide)"
      idLabel="Student ID"
      withDepartment
      withGraduationDate
    />
  );
}
