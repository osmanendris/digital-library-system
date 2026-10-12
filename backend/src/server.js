const app = require('./app');
require('dotenv').config();

// CRITICAL: without this, a single failed file conversion can crash the
// ENTIRE server (see the long comment above about the Windows temp-folder
// cleanup race in the libreoffice-convert library). An "unhandled
// rejection" or "uncaught exception" anywhere in the process - not just
// from LibreOffice, from ANY bug, ever - now gets logged instead of
// killing the whole app. This is standard practice for any Node server
// that shouldn't go down because of one bad request.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled promise rejection (server stays up):', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught exception (server stays up):', err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Digital Library API listening on port ${PORT}`);

  // Q2: warm up cached PDF previews for every existing docx/ppt/ebook
  // resource in the background so opening them in Browse Library is fast
  // right away, instead of the first viewer paying the LibreOffice
  // conversion cost. Runs after the server starts accepting requests and
  // never blocks startup or any request.
  const { warmAllPreviewCaches } = require('./utils/streamPreview');
  warmAllPreviewCaches();

  // Q5: once a student's expected graduation date passes, deactivate
  // their account automatically instead of relying on an Admin/Librarian
  // to notice and do it by hand. Runs once immediately on startup (so any
  // date that passed while the server was down is caught right away),
  // then every hour after that - checking daily would leave up to 24
  // hours where an overdue account is still active.
  const User = require('./models/User');
  const runGraduationCheck = () => {
    User.deactivateExpiredGraduates()
      .then((deactivated) => {
        if (deactivated.length > 0) {
          console.log(`🎓 Auto-deactivated ${deactivated.length} student(s) past their expected graduation date:`,
            deactivated.map((u) => u.full_name).join(', '));
        }
      })
      .catch((err) => console.warn('Graduation auto-deactivation check failed:', err.message));
  };
  runGraduationCheck();
  setInterval(runGraduationCheck, 60 * 60 * 1000); // every hour
});
