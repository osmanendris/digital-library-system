import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const roleHome = {
  admin: '/admin',
  admin_librarian: '/admin-librarian',
  department_head: '/department-head',
  teacher: '/teacher',
  librarian: '/librarian',
  staff: '/dashboard',
  student: '/dashboard',
};

const roleLabel = {
  admin: 'System Admin',
  admin_librarian: 'Admin Librarian',
  department_head: 'Department Head',
  teacher: 'Teacher',
  librarian: 'Librarian',
  staff: 'Staff',
  student: 'Student',
};

// NOTE: mobile menu + profile dropdown are controlled with plain React state,
// not Bootstrap's data-bs-toggle/data-bs-collapse JS. This keeps navigation
// working reliably even if the Bootstrap JS bundle fails to load/execute.
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [siteName, setSiteName] = useState('Digital Library');

  // Site Name is configurable by Admin (System Settings) - previously this
  // was hardcoded here and never reflected a saved change. Now pulled live
  // from the public settings endpoint, and also applied to the browser tab title.
  useEffect(() => {
    api.get('/settings').then((res) => {
      const name = res.data.settings?.site_name;
      if (name) {
        setSiteName(name);
        document.title = name;
      }
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center fw-bold" to="/" onClick={closeMenu}>
          <img src="/logo.jpg" alt="Kombolcha Polytechnic College logo" />
          <span className="d-none d-md-inline">{siteName}</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`navbar-collapse ${menuOpen ? '' : 'collapse'}`}>
          <ul className="navbar-nav me-auto ms-lg-3">
            <li className="nav-item"><Link className="nav-link" to="/" onClick={closeMenu}>Home</Link></li>
            {!user && (
              <>
                <li className="nav-item"><Link className="nav-link" to="/about" onClick={closeMenu}>About</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/developers" onClick={closeMenu}>Developers</Link></li>
              </>
            )}
            {user && (
              <li className="nav-item">
                <Link className="nav-link" to={roleHome[user.role] || '/dashboard'} onClick={closeMenu}>My Dashboard</Link>
              </li>
            )}
          </ul>
          <ul className="navbar-nav align-items-lg-center">
            {!user ? (
              <li className="nav-item">
                <Link className="btn btn-brand btn-sm px-3" to="/login" onClick={closeMenu}>Login</Link>
              </li>
            ) : (
              <>
                <li className="nav-item me-lg-2">
                  <span className="badge bg-light text-dark border badge-role">{roleLabel[user.role] || user.role}</span>
                </li>
                <li className="nav-item position-relative">
                  <button
                    className="nav-link btn btn-link text-decoration-none"
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                  >
                    <i className="bi bi-person-circle me-1"></i>{user.full_name}
                  </button>
                  {profileOpen && (
                    <>
                      <div
                        className="position-fixed top-0 start-0 w-100 h-100"
                        style={{ zIndex: 1030 }}
                        onClick={() => setProfileOpen(false)}
                      />
                      <ul
                        className="dropdown-menu d-block shadow-sm"
                        style={{ position: 'absolute', right: 0, left: 'auto', zIndex: 1031 }}
                      >
                        <li><Link className="dropdown-item" to="/profile" onClick={() => { setProfileOpen(false); closeMenu(); }}>Profile Settings</Link></li>
                        <li><hr className="dropdown-divider" /></li>
                        <li><button className="dropdown-item text-danger" onClick={handleLogout}>Logout</button></li>
                      </ul>
                    </>
                  )}
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
