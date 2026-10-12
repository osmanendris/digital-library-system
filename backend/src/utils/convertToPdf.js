const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
require('dotenv').config();

// ============================================================
// Q5 (round 3): the "one persistent custom profile" theory was DISPROVEN
// by real evidence - reusing the SAME profile folder for every conversion
// still failed with the identical "Could not find platform independent
// libraries <prefix>" error. The one thing PROVEN to work, on the actual
// machine having this problem, was the plain manual command:
//
//   soffice.exe --headless --convert-to pdf --outdir ... file.docx
//
// with NO `-env:UserInstallation=...` flag at all - i.e. LibreOffice's own
// DEFAULT profile (normally under %APPDATA%\LibreOffice\4\user on
// Windows). Every custom-profile variant we tried failed; the default
// profile is the only thing that has actually succeeded on this machine.
// So: stop overriding the profile entirely and just use the default one,
// exactly like the proven-working manual test. This is safe here because
// every conversion in this app already goes through a single shared queue
// below - only one soffice process from THIS APP is ever alive at a time,
// so there's no risk of two of our own conversions colliding over the
// same profile. (The only remaining edge case is if someone has
// LibreOffice open interactively on the SAME machine at the exact same
// moment a conversion runs - a rare situation, and a much smaller problem
// than "never works".)
// ============================================================

function sofficeBinaryName() {
  return process.platform === 'win32' ? 'soffice.exe' : 'soffice';
}

function resolveSofficePath() {
  if (process.env.LIBREOFFICE_PATH) {
    const candidate = path.join(process.env.LIBREOFFICE_PATH, sofficeBinaryName());
    if (fs.existsSync(candidate)) return candidate;
  }
  // Fall back to letting the OS resolve it from PATH (works on Mac/Linux,
  // and on Windows if the user added LibreOffice to PATH themselves).
  return sofficeBinaryName();
}

// soffice conversions are NOT safe to run concurrently against each other
// without colliding (even for completely unrelated files), so every call
// - on-demand preview, post-upload pre-conversion, and the startup
// cache-warming sweep - is funneled through this single in-process queue.
// Only one `soffice` process is ever alive at a time.
let queue = Promise.resolve();

// If LibreOffice is genuinely broken (not just one bad file), every single
// conversion attempt was paying the full timeout ONE FILE AT A TIME before
// giving up - this circuit breaker detects that pattern and stops actually
// spawning soffice for a cooldown window, failing fast instead. Retries a
// real conversion again automatically after the cooldown.
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function recordFailure() {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
    console.warn(`LibreOffice failed ${consecutiveFailures} times in a row - pausing conversion attempts for ${COOLDOWN_MS / 60000} minutes.`);
  }
}
function recordSuccess() {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

function runConversion(filePath) {
  if (Date.now() < circuitOpenUntil) {
    return Promise.reject(new Error(
      'LibreOffice conversion is temporarily disabled after repeated failures (will retry automatically in a few minutes).'
    ));
  }

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kptc-pdf-'));

  // "Could not find platform independent libraries <prefix>" is a Python
  // interpreter startup error - soffice bundles its OWN embedded Python,
  // but a PYTHONHOME/PYTHONPATH set on the machine (Anaconda, other Python
  // installs, etc.) can leak into the child process and point it at the
  // WRONG Python's standard library. Stripping just these two variables
  // from this one subprocess's environment prevents that, whether or not
  // it turns out to be the whole story here.
  const sanitizedEnv = { ...process.env };
  delete sanitizedEnv.PYTHONHOME;
  delete sanitizedEnv.PYTHONPATH;

  const soffice = resolveSofficePath();
  const args = [
    '--headless',
    '--norestore',
    '--nologo',
    '--nofirststartwizard',
    '--convert-to', 'pdf',
    '--outdir', outDir,
    filePath,
  ];

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanupOutDir = () => fs.rm(outDir, { recursive: true, force: true }, () => {});

    // We still give up after 20s so a broken/hung install fails fast, but
    // WITHOUT force-killing the process ourselves. On Windows, killing
    // soffice and then immediately trying to delete its temp folder can
    // race against the process still releasing its file lock, throwing
    // an error nothing catches - which crashes the whole Node server.
    // Simply stopping OUR OWN wait and letting the real process finish on
    // its own time avoids that race completely.
    const giveUpTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      recordFailure();
      cleanupOutDir();
      reject(new Error('LibreOffice conversion timed out.'));
    }, 20000);

    execFile(soffice, args, { env: sanitizedEnv }, (err) => {
      if (settled) return; // already gave up and moved on - ignore this late result either way
      settled = true;
      clearTimeout(giveUpTimer);

      if (err) {
        recordFailure();
        cleanupOutDir();
        return reject(err);
      }

      // soffice names the output after the input file's basename.
      const outName = path.basename(filePath, path.extname(filePath)) + '.pdf';
      const outPath = path.join(outDir, outName);
      fs.readFile(outPath, (readErr, buf) => {
        cleanupOutDir();
        if (readErr) {
          recordFailure();
          return reject(new Error('Conversion finished but the PDF output could not be found.'));
        }
        recordSuccess();
        resolve(buf);
      });
    });
  });
}

// filePath: absolute path to the ORIGINAL uploaded file (its real
// extension is what tells soffice which format to read). Resolves to a
// PDF Buffer. Chains onto the shared queue - this next conversion won't
// start until every earlier one has finished (or failed).
function convertToPdf(filePath) {
  const result = queue.then(() => runConversion(filePath));
  queue = result.catch(() => {}); // one failure never permanently jams the queue for everyone after it
  return result;
}

module.exports = { convertToPdf };
