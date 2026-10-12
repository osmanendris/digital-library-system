import AccountManager from '../../components/AccountManager';

// Moved here from System Admin (Q1) - the Admin Librarian now creates and
// manages all Department Heads (role label renamed from "Faculty").
export default function ManageDepartmentHeads() {
  return (
    <AccountManager
      apiBase="/admin-librarian/department-heads"
      activeBase="/admin-librarian/users"
      title="Manage Department Heads"
      entityLabel="Department Head"
      idLabel="Staff ID"
      withDepartment
      showDepartmentHistory
    />
  );
}
