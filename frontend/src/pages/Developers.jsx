const TEAM = [
  { name: 'Osman Yimam', school: 'Woldia University' },
  { name: 'Mohammed Hassen', school: 'Woldia University' },
  { name: 'Faiza Ahmed', school: 'Woldia University' },
  { name: 'Mekiya Muleta', school: 'Woldia University' },
  { name: 'Etsegenet Tsegaw', school: 'Woldia University' },
  { name: 'Elleny Meselew', school: 'Woldia University' },
  { name: 'Yeabsra', school: 'Kombolcha Polytechnic College' },
  { name: 'Arsemawit Tesfaye', school: 'Asosa University' },
  { name: 'Loza', school: 'Addis Ababa University' },
  { name: 'Kalkidan', school: 'Gondar University' },
];

export default function Developers() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <h2 className="fw-bold mb-2">Developers</h2>
          <p className="text-muted mb-4">
            This Digital Library System was built by a team of university students as a collaborative project.
          </p>

          <div className="row g-3 mb-5">
            {TEAM.map((dev) => (
              <div className="col-md-6" key={dev.name}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: 48, height: 48, flexShrink: 0 }}
                    >
                      {dev.name.trim().charAt(0)}
                    </div>
                    <div>
                      <div className="fw-semibold">{dev.name}</div>
                      <div className="text-muted small">{dev.school}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h5 className="fw-bold mb-3">Contact</h5>
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li className="mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-envelope-fill text-primary"></i>
                  <a href="mailto:osmanendris27@gmail.com">osmanendris27@gmail.com</a>
                </li>
                <li className="mb-3 d-flex align-items-center gap-2">
                  <i className="bi bi-telephone-fill text-primary"></i>
                  <a href="tel:+251992462804">0992462804</a>
                </li>
                <li className="d-flex align-items-center gap-2">
                  <i className="bi bi-linkedin text-primary"></i>
                  <a href="https://www.linkedin.com/search/results/all/?keywords=Osman%20Yimam" target="_blank" rel="noopener noreferrer">
                    Osman Yimam
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
