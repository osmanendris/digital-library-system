import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AuthenticatedLayout from './components/AuthenticatedLayout';

import Home from './pages/Home';
import About from './pages/About';
import Developers from './pages/Developers';
import { isReviewTab } from './utils/reviewTab';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Browse from './pages/Browse';
import ResourceDetail from './pages/ResourceDetail';
import ResourceReader from './pages/ResourceReader';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import Announcements from './pages/Announcements';
import History from './pages/History';
import RequestResource from './pages/RequestResource';
import StudentDashboard from './pages/StudentDashboard';

import TeacherDashboard from './pages/uploader/TeacherDashboard';
import UploadResource from './pages/uploader/UploadResource';
import MyUploads from './pages/uploader/MyUploads';

import DepartmentHeadDashboard from './pages/admin/DepartmentHeadDashboard';
import ManageTeachers from './pages/admin/ManageTeachers';
import MonitorResources from './pages/admin/MonitorResources';
import DepartmentHeadApprovalQueue from './pages/admin/DepartmentHeadApprovalQueue';

// NEW "Librarian" role (Q2) - created by the Admin Librarian
import LibrarianRoleDashboard from './pages/librarian/LibrarianRoleDashboard';
import ManageMyStudents from './pages/librarian/ManageMyStudents';
import ManageMyStaff from './pages/librarian/ManageMyStaff';

// Admin Librarian (renamed from "Librarian" - Q1)
import LibrarianDashboard from './pages/admin/LibrarianDashboard';
import ApprovalQueue from './pages/admin/ApprovalQueue';
import ManageStudents from './pages/admin/ManageStudents';
import ManageStaff from './pages/admin/ManageStaff';
import ManageLibrarianRole from './pages/admin/ManageLibrarianRole';
import ResourceRequestsAdmin from './pages/admin/ResourceRequestsAdmin';
import LibrarianAllResources from './pages/admin/LibrarianAllResources';
import ManageDepartmentHeads from './pages/admin/ManageDepartmentHeads';
import ManageDepartments from './pages/admin/ManageDepartments';
import ManageAnnouncements from './pages/admin/ManageAnnouncements';
import ManageTtlmLevels from './pages/admin/ManageTtlmLevels';
import AdminAllTeachers from './pages/admin/AdminAllTeachers';
import AdminAllStudents from './pages/admin/AdminAllStudents';
import AdminActivityLog from './pages/admin/AdminActivityLog';

// System Admin (trimmed - Q1)
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageLibrarians from './pages/admin/ManageLibrarians';
import ManageCategories from './pages/admin/ManageCategories';
import SystemSettings from './pages/admin/SystemSettings';

function Footer() {
  return (
    <footer className="bg-white border-top py-3 mt-5 text-center text-muted small">
      Kombolcha Polytechnic College Digital Library &copy; {new Date().getFullYear()}
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  // A review tab (opened from the Approval Queue to preview an epub - see
  // ApprovalQueueGeneric.jsx) should show ONLY the file, not the whole
  // site's navbar/footer around it.
  const hideChrome = isReviewTab(location.search);

  return (
    <div className="d-flex flex-column min-vh-100">
      {!hideChrome && <Navbar />}
      <main className="flex-grow-1">
        <Routes>
          {/* Public - no book/resource data is ever visible here */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/*
            Every logged-in page shares ONE persistent AuthenticatedLayout
            instance (mounted once, only the inner page swaps via <Outlet/>).
            This is what keeps the sidebar's scroll position stable across
            navigation, and is also why Browse/ResourceDetail/Reader live
            here now - no guest can reach any resource without logging in.
          */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/browse" element={<Browse />} />
            <Route path="/resource/:id" element={<ResourceDetail />} />
            <Route path="/resource/:id/reader" element={<ResourceReader />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/history" element={<History />} />
            <Route path="/announcements" element={<Announcements />} />

            {/* Student + Staff (Q2: Staff get all the same features Students have) */}
            <Route path="/dashboard" element={<ProtectedRoute roles={['student', 'staff']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/request-resource" element={<ProtectedRoute roles={['student', 'staff']}><RequestResource /></ProtectedRoute>} />

            {/* Teacher (upload/my-uploads shared with faculty, librarian, admin_librarian, admin) */}
            <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/upload" element={<ProtectedRoute roles={['teacher', 'department_head', 'librarian', 'admin_librarian', 'admin']}><UploadResource /></ProtectedRoute>} />
            <Route path="/teacher/my-uploads" element={<ProtectedRoute roles={['teacher', 'department_head', 'librarian', 'admin_librarian', 'admin']}><MyUploads /></ProtectedRoute>} />

            {/* Faculty */}
            <Route path="/department-head" element={<ProtectedRoute roles={['department_head']}><DepartmentHeadDashboard /></ProtectedRoute>} />
            <Route path="/department-head/queue" element={<ProtectedRoute roles={['department_head']}><DepartmentHeadApprovalQueue /></ProtectedRoute>} />
            <Route path="/department-head/teachers" element={<ProtectedRoute roles={['department_head']}><ManageTeachers /></ProtectedRoute>} />
            <Route path="/department-head/monitor" element={<ProtectedRoute roles={['department_head']}><MonitorResources /></ProtectedRoute>} />

            {/* NEW Librarian role (Q2) - same as Faculty except "Manage Teachers"
                becomes "Manage Students" */}
            <Route path="/librarian" element={<ProtectedRoute roles={['librarian']}><LibrarianRoleDashboard /></ProtectedRoute>} />
            <Route path="/librarian/students" element={<ProtectedRoute roles={['librarian']}><ManageMyStudents /></ProtectedRoute>} />
            <Route path="/librarian/staff" element={<ProtectedRoute roles={['librarian']}><ManageMyStaff /></ProtectedRoute>} />

            {/* Admin Librarian (renamed from "Librarian" - Q1), FINAL approval on
                every resource (Q3), creates Faculty/Librarian/Staff/Student (Q2) */}
            <Route path="/admin-librarian" element={<ProtectedRoute roles={['admin_librarian']}><LibrarianDashboard /></ProtectedRoute>} />
            <Route path="/admin-librarian/queue" element={<ProtectedRoute roles={['admin_librarian']}><ApprovalQueue /></ProtectedRoute>} />
            <Route path="/admin-librarian/resources" element={<ProtectedRoute roles={['admin_librarian']}><LibrarianAllResources /></ProtectedRoute>} />
            <Route path="/admin-librarian/department-heads" element={<ProtectedRoute roles={['admin_librarian']}><ManageDepartmentHeads /></ProtectedRoute>} />
            <Route path="/admin-librarian/departments" element={<ProtectedRoute roles={['admin_librarian']}><ManageDepartments /></ProtectedRoute>} />
            <Route path="/admin-librarian/ttlm-levels" element={<ProtectedRoute roles={['admin_librarian']}><ManageTtlmLevels /></ProtectedRoute>} />
            <Route path="/admin-librarian/librarians" element={<ProtectedRoute roles={['admin_librarian']}><ManageLibrarianRole /></ProtectedRoute>} />
            <Route path="/admin-librarian/staff" element={<ProtectedRoute roles={['admin_librarian']}><ManageStaff /></ProtectedRoute>} />
            <Route path="/admin-librarian/students" element={<ProtectedRoute roles={['admin_librarian']}><ManageStudents /></ProtectedRoute>} />
            <Route path="/admin-librarian/all-teachers" element={<ProtectedRoute roles={['admin_librarian']}><AdminAllTeachers /></ProtectedRoute>} />
            <Route path="/admin-librarian/all-students" element={<ProtectedRoute roles={['admin_librarian']}><AdminAllStudents /></ProtectedRoute>} />
            <Route path="/admin-librarian/requests" element={<ProtectedRoute roles={['admin_librarian']}><ResourceRequestsAdmin /></ProtectedRoute>} />
            <Route path="/admin-librarian/activity" element={<ProtectedRoute roles={['admin_librarian']}><AdminActivityLog /></ProtectedRoute>} />
            <Route path="/admin-librarian/announcements" element={<ProtectedRoute roles={['admin_librarian']}><ManageAnnouncements /></ProtectedRoute>} />

            {/* System Admin - trimmed per Q1 */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/admin-librarians" element={<ProtectedRoute roles={['admin']}><ManageLibrarians /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><ManageCategories /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute roles={['admin']}><ManageAnnouncements /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute roles={['admin']}><SystemSettings /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<div className="container py-5 text-center"><h3>404 - Page Not Found</h3></div>} />
        </Routes>
      </main>
      {!hideChrome && <Footer />}
    </div>
  );
}
