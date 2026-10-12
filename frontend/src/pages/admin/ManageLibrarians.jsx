import AccountManager from '../../components/AccountManager';

// System Admin: the ONLY account type created directly here now is the
// Admin Librarian (Q1 - renamed from "Librarian", label updated to
// "Manage Admin Librarian" in the sidebar).
export default function ManageLibrarians() {
  return (
    <AccountManager
      apiBase="/admin/admin-librarians"
      activeBase="/admin/users"
      title="Manage Admin Librarian"
      entityLabel="Admin Librarian"
      idLabel="Staff ID"
    />
  );
}
