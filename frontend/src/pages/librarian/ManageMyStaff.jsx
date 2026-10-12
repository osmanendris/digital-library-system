import AccountManager from '../../components/AccountManager';

// Q8: Librarians can now register Staff accounts too (previously only the
// Admin Librarian could). The Admin Librarian's own "Manage Staff" page
// already shows every staff account system-wide regardless of who
// registered them.
export default function ManageMyStaff() {
  return (
    <AccountManager
      apiBase="/librarian/staff"
      activeBase="/librarian/staff"
      title="Manage Staff"
      entityLabel="Staff"
      idLabel="Staff ID"
    />
  );
}
