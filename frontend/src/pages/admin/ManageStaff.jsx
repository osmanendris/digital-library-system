import AccountManager from '../../components/AccountManager';

// NEW role (Q2) - created by the Admin Librarian. Staff get all the same
// features Students have.
export default function ManageStaff() {
  return (
    <AccountManager
      apiBase="/admin-librarian/staff"
      activeBase="/admin-librarian/users"
      title="Manage Staff"
      entityLabel="Staff"
      idLabel="Staff ID"
    />
  );
}
