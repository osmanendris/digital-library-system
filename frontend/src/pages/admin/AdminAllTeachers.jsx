import ReadOnlyUserList from '../../components/ReadOnlyUserList';

// Moved here from System Admin (Q1). Teacher accounts are created and
// managed by their Faculty department head - this is a read-only,
// system-wide view for the Admin Librarian.
export default function AdminAllTeachers() {
  return (
    <ReadOnlyUserList
      apiPath="/admin-librarian/all-teachers"
      title="All Teachers (System-wide)"
      idLabel="Staff ID"
      withDepartment
    />
  );
}
