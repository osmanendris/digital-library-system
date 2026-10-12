export default function About() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">
          <h2 className="fw-bold mb-4">About the Digital Library</h2>
          <p>
            The Kombolcha Polytechnic College Digital Library is a fully online resource platform for
            students, teachers, department heads, and library staff. There is no physical inventory —
            every book, lecture note, past exam, presentation, and reference material lives here
            digitally, accessible the moment you log in. Nothing is visible to anyone before logging in
            — there are no public book listings, previews, or metadata shown to guests. You must have an
            account to see or interact with any resource.

          </p>

          <h5 className="fw-bold mt-4">The Roles</h5>
          <p>The system is built around several roles, each with a clearly defined scope of responsibility:</p>
          <ul>
            <li>
              <strong>Admin</strong> — the system owner, at the top of the hierarchy. Manages the Admin
              Librarian account and top-level system configuration.
            </li>
            <li>
              <strong>Admin Librarian</strong> — creates and manages Department Head, Librarian, Staff, and
              Student accounts, manages Categories, Departments, and TTLM Levels, and gives final approval
              on every resource in the system.
            </li>
            <li>
              <strong>Department Head</strong> — creates Teacher accounts for their own department only,
              monitors (read-only) what their teachers upload, gives stage-1 approval on those uploads, and
              can upload resources themselves. Each department has exactly one Department Head.
            </li>
            <li>
              <strong>Teacher</strong> — uploads lecture notes, past exams, presentations, and other
              course material. Every upload requires full metadata (title, author, subject, category,
              description) and goes into a pending queue for review.
            </li>
            <li>
              <strong>Librarian</strong> — registers Student and Staff accounts, uploads resources, and
              handles resource requests. Every account a Librarian creates is manageable by any other
              Librarian or the Admin Librarian, not just the one who created it.
            </li>
            <li>
              <strong>Staff</strong> and <strong>Student</strong> — browse, search, and read resources
              online, download what's permitted, bookmark favorites, track their reading history, and can
              submit a resource request for anything not yet in the collection.
            </li>
          </ul>

          <h5 className="fw-bold mt-4">How a Resource Gets Published</h5>
          <ol>
            <li>A Teacher, Department Head, Librarian, or Admin Librarian uploads a file with complete metadata.</li>
            <li>Teacher uploads first go to their Department Head for stage-1 approval, then to the Admin
              Librarian for final approval. Every other role's uploads go straight to the Admin Librarian
              (who can also mark their own uploads "Quick Approve" to publish immediately).</li>
            <li>The reviewer approves it (making it visible to everyone it's allowed for) or rejects it
              with a reason sent back to the uploader.</li>
            <li>Once approved, everyone with access can find it in Browse, read it online, and download it
              if the uploader allowed downloads.</li>
          </ol>

          <h5 className="fw-bold mt-4">Reading Resources Online</h5>
          <p>
            Every file type opens directly in the browser rather than forcing a download: PDFs use a
            built-in viewer, videos play natively, Word documents and PowerPoint presentations render in
            the page (with an exact-fidelity mode available if the server has LibreOffice installed), and
            EPUB books use a dedicated e-reader view. A Full Screen option is available for any of these.
            Downloading a file only happens if the uploader explicitly marked it downloadable, and only
            when you click the Download button yourself — never automatically.
          </p>

          <h5 className="fw-bold mt-4">Finding TTLM Material</h5>
          <p>
            In Browse Library, picking a Category first reveals a Level filter to narrow within it — for
            example, choosing "Computer Science" then "Level 1" shows only TTLM resources uploaded under
            that category and level. On upload, a resource is tagged this way by checking the "TTLM" box
            (only enabled once a Category is chosen) and selecting a Level from the dropdown.
          </p>

          <h5 className="fw-bold mt-4">Accountability</h5>
          <p>
            Every account is created by the role above it in the hierarchy (Admin Librarian creates
            Department Head/Librarian/Staff/Student, Department Head creates Teachers, Librarian also
            creates Staff/Students), and every account carries a unique ID number in addition to their name
            and email. Editing or deleting any account, and editing or deleting any resource, requires the
            acting person to re-enter their own password as a confirmation step — this protects against
            someone else using an accidentally-left-open session to make changes they weren't meant to
            authorize. If someone forgets their password, they reset it themselves via a one-time code
            emailed to them — no administrator can reset it on their behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
