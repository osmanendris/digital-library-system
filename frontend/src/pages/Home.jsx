import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      {/* Cover / Hero section featuring the college logo */}
      <section className="hero-section text-center">
        <div className="container">
          <img
            src="/logo.jpg"
            alt="Kombolcha Polytechnic College"
            style={{ width: 160, height: 160, borderRadius: '50%', border: '4px solid #fff', objectFit: 'cover' }}
            className="mb-4 shadow"
          />
          <h1 className="fw-bold">Kombolcha Polytechnic College</h1>
          <p className="lead mb-4">Digital Library System — knowledge, online, always accessible.</p>
          <Link to="/about" className="btn btn-light btn-lg px-4 me-2">Learn More</Link>
          <Link to="/login" className="btn btn-outline-light btn-lg px-4">Login</Link>
        </div>
      </section>

      <div className="container py-5">
        <div className="row text-center g-4">
          <div className="col-md-4">
            <i className="bi bi-search fs-1 text-primary"></i>
            <h5 className="mt-2">Search & Discover</h5>
            <p className="text-muted">Find e-books, journals, and research material by title, author, or subject.</p>
          </div>
          <div className="col-md-4">
            <i className="bi bi-laptop fs-1 text-primary"></i>
            <h5 className="mt-2">Read Online</h5>
            <p className="text-muted">Open any resource directly in your browser — no physical copies, no waiting.</p>
          </div>
          <div className="col-md-4">
            <i className="bi bi-mortarboard fs-1 text-primary"></i>
            <h5 className="mt-2">Built for Everyone</h5>
            <p className="text-muted">Students, teachers, department heads, and librarians each have a tailored workspace.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
