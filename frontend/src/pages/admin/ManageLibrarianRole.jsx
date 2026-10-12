import AccountManager from '../../components/AccountManager';

// NEW role (Q2) - created by the Admin Librarian.
export default function ManageLibrarianRole() {
  return (
    <AccountManager
      apiBase="/admin-librarian/librarians"
      activeBase="/admin-librarian/users"
      title="Manage Librarians"
      entityLabel="Librarian"
      idLabel="Staff ID"
    />
  );
}
