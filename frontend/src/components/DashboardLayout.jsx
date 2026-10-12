import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Human-friendly labels for the sidebar header (raw role strings like
// "admin_librarian" would look wrong stitched together as "admin_librarian Panel").
const ROLE_LABELS = {
  admin: 'System Admin',
  admin_librarian: 'Admin Librarian',
  department_head: 'Department Head',
  teacher: 'Teacher',
  librarian: 'Librarian',
  staff: 'Staff',
  student: 'Student',
};

// Vertical nav links per role.
const NAV_BY_ROLE = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/request-resource', label: 'Request a Resource', icon: 'bi-chat-square-text' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
  // Staff get all the same features Students have (Q2)
  staff: [
    { to: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/request-resource', label: 'Request a Resource', icon: 'bi-chat-square-text' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/teacher/upload', label: 'Upload Resource', icon: 'bi-cloud-upload' },
    { to: '/teacher/my-uploads', label: 'My Uploads', icon: 'bi-folder2-open' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
  department_head: [
    { to: '/department-head', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/department-head/queue', label: 'Approval Queue', icon: 'bi-check2-square' },
    { to: '/department-head/teachers', label: 'Manage Teachers', icon: 'bi-person-plus' },
    { to: '/department-head/monitor', label: 'Monitor Uploads', icon: 'bi-eye' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/teacher/upload', label: 'Upload Resource', icon: 'bi-cloud-upload' },
    { to: '/teacher/my-uploads', label: 'My Uploads', icon: 'bi-folder2-open' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
  // NEW role (Q2): same as Faculty, except "Manage Teachers" is replaced
  // by "Manage Students" (students can be registered by Librarian too).
  librarian: [
    { to: '/librarian', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/librarian/students', label: 'Manage Students', icon: 'bi-people' },
    { to: '/librarian/staff', label: 'Manage Staff', icon: 'bi-person-badge' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/teacher/upload', label: 'Upload Resource', icon: 'bi-cloud-upload' },
    { to: '/teacher/my-uploads', label: 'My Uploads', icon: 'bi-folder2-open' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
  // Renamed from "Librarian" (Q1) - now also inherits Manage Faculty /
  // All Teachers / All Students / All Resources / Activity Log from the
  // System Admin, plus creates Librarian & Staff accounts (Q2), and gives
  // the FINAL approval on every resource in the system (Q3).
  admin_librarian: [
    { to: '/admin-librarian', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/admin-librarian/queue', label: 'Approval Queue', icon: 'bi-check2-square' },
    { to: '/admin-librarian/resources', label: 'All Resources', icon: 'bi-collection' },
    { to: '/admin-librarian/department-heads', label: 'Manage Department Heads', icon: 'bi-building' },
    { to: '/admin-librarian/departments', label: 'Manage Departments', icon: 'bi-diagram-3' },
    { to: '/admin-librarian/ttlm-levels', label: 'Manage TTLM Levels', icon: 'bi-bar-chart-steps' },
    { to: '/admin-librarian/librarians', label: 'Manage Librarians', icon: 'bi-person-badge' },
    { to: '/admin-librarian/staff', label: 'Manage Staff', icon: 'bi-person-workspace' },
    { to: '/admin-librarian/students', label: 'Manage Students', icon: 'bi-people' },
    { to: '/admin-librarian/all-teachers', label: 'All Teachers', icon: 'bi-person-video3' },
    { to: '/admin-librarian/all-students', label: 'All Students', icon: 'bi-people-fill' },
    { to: '/admin-librarian/requests', label: 'Resource Requests', icon: 'bi-chat-square-text' },
    { to: '/admin-librarian/activity', label: 'Activity Log', icon: 'bi-clock-history' },
    { to: '/admin-librarian/announcements', label: 'Manage Announcements', icon: 'bi-megaphone' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/teacher/upload', label: 'Upload Resource', icon: 'bi-cloud-upload' },
    { to: '/teacher/my-uploads', label: 'My Uploads', icon: 'bi-folder2-open' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
  // Trimmed per Q1: only creates/manages Admin Librarian accounts now.
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2' },
    { to: '/announcements', label: 'Announcements', icon: 'bi-megaphone' },
    { to: '/admin/admin-librarians', label: 'Manage Admin Librarian', icon: 'bi-person-badge' },
    { to: '/admin/categories', label: 'Manage Categories', icon: 'bi-tags' },
    { to: '/admin/announcements', label: 'Manage Announcements', icon: 'bi-megaphone' },
    { to: '/admin/settings', label: 'System Settings', icon: 'bi-gear' },
    { to: '/browse', label: 'Browse Library', icon: 'bi-search' },
    { to: '/teacher/upload', label: 'Upload Resource', icon: 'bi-cloud-upload' },
    { to: '/teacher/my-uploads', label: 'My Uploads', icon: 'bi-folder2-open' },
    { to: '/favorites', label: 'My Favorites', icon: 'bi-bookmark-heart' },
    { to: '/history', label: 'Reading History', icon: 'bi-clock-history' },
    { to: '/profile', label: 'Profile Settings', icon: 'bi-person-gear' },
  ],
};

// NOTE: intentionally uses only plain onClick (React state), never Bootstrap's
// data-bs-toggle/data-bs-dismiss on these links. Bootstrap's JS installs a
// document-wide click listener for [data-bs-dismiss] that calls
// preventDefault() on ANY matching element - including links outside any
// offcanvas - which was silently blocking navigation. Keeping this sidebar
// 100% React-controlled means it can never be broken by Bootstrap's script.
function SidebarLinks({ links, activePath, onNavigate }) {
  return (
    <ul className="nav flex-column p-2">
      {links.map((l) => (
        <li className="nav-item" key={l.to}>
          <Link
            to={l.to}
            onClick={onNavigate}
            className={`nav-link sidebar-link rounded d-flex align-items-center gap-2 px-3 py-2 mb-1 ${
              activePath === l.to ? 'active' : 'text-dark'
            }`}
          >
            <i className={`bi ${l.icon}`}></i>
            <span>{l.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = NAV_BY_ROLE[user?.role] || [];

  return (
    <div className="container-fluid px-0">
      <div className="row g-0">
        {/* Mobile-only menu trigger - plain React state, not Bootstrap JS */}
        <div className="col-12 d-md-none border-bottom bg-white p-2">
          <button className="btn btn-outline-primary w-100" type="button" onClick={() => setMobileOpen(true)}>
            <i className="bi bi-list me-2"></i>Menu
          </button>
        </div>

        {/* Desktop / tablet: fixed left sidebar, always visible at md+ */}
        <aside className="col-md-3 col-lg-2 d-none d-md-block bg-white border-end sidebar-sticky">
          <div className="px-3 py-4 border-bottom">
            <div className="fw-bold text-primary text-uppercase small">{ROLE_LABELS[user?.role] || user?.role} Panel</div>
            <div className="text-truncate">{user?.full_name}</div>
          </div>
          <SidebarLinks links={links} activePath={location.pathname} />
        </aside>

        {/* Mobile: slide-in panel, fully controlled by React state */}
        {mobileOpen && (
          <>
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-md-none"
              style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="position-fixed top-0 start-0 h-100 bg-white shadow d-md-none"
              style={{ width: 280, maxWidth: '85vw', zIndex: 1045, overflowY: 'auto' }}
            >
              <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                <div>
                  <div className="fw-bold text-primary text-uppercase small">{ROLE_LABELS[user?.role] || user?.role} Panel</div>
                  <div className="text-truncate">{user?.full_name}</div>
                </div>
                <button className="btn-close" onClick={() => setMobileOpen(false)} aria-label="Close"></button>
              </div>
              <SidebarLinks links={links} activePath={location.pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        {/* Main content - only this area changes between pages now */}
        <main className="col-md-9 col-lg-10 p-3 p-md-4">
          {children}
        </main>
      </div>
    </div>
  );
}
