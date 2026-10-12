const path = require('path');
const fs = require('fs');

// Formats browsers (or the app's own client-side renderers) can already
// handle WITHOUT LibreOffice - anything NOT in this list gets converted to
// PDF via LibreOffice before being served. epub is included here even
// though browsers can't render it natively: the app has its own working
// in-browser epub reader (epub.js) that reads the RAW file directly, so
// LibreOffice was never actually needed for it. Routing epub through
// LibreOffice anyway was pure downside - epub import is one of
// LibreOffice's weaker areas and it reliably failed, wasting 20 seconds
// per attempt AND tripping the circuit breaker, which then also blocked
// completely unrelated (and otherwise working) docx/ppt conversions
// queued right after it.
const NATIVE_INLINE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'epub'];

function cachedPdfPathFor(filePath) {
  return `${filePath}.preview.pdf`;
}

// Streams `filePath` to `res` for INLINE viewing in the browser. Formats
// browsers can't render on their own (docx, ppt, epub, etc.) are converted
// to PDF via LibreOffice first and cached next to the original so
// conversion only happens once (Q4/Q2 - "Review" file auto-downloading
// instead of opening).
async function streamForPreview(res, filePath, fileType) {
  const type = (fileType || path.extname(filePath).slice(1) || '').toLowerCase();

  if (!NATIVE_INLINE_TYPES.includes(type)) {
    const cachedPdfPath = cachedPdfPathFor(filePath);
    try {
      if (!fs.existsSync(cachedPdfPath)) {
        const { convertToPdf } = require('./convertToPdf');
        const pdfBuffer = await convertToPdf(filePath);
        fs.writeFileSync(cachedPdfPath, pdfBuffer);
      }
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('X-Preview-Format', 'pdf');
      res.setHeader('Access-Control-Expose-Headers', 'X-Preview-Format');
      return res.sendFile(cachedPdfPath);
    } catch (convErr) {
      console.warn('LibreOffice conversion unavailable, falling back to raw file preview:', convErr.message);
      // fall through to serve the raw file below
    }
  }

  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(filePath);
}

// Fire-and-forget: converts a convertible file to PDF and caches it right
// after upload, so the FIRST time anyone reviews/reads it (in the approval
// queue or after approval) the PDF is already sitting there instead of
// making that person wait for LibreOffice to run (Q4 - "loading time is
// long"). Safe to call for any file type; no-ops for non-convertible ones.
function preConvertInBackground(filePath, fileType) {
  const type = (fileType || path.extname(filePath).slice(1) || '').toLowerCase();
  if (NATIVE_INLINE_TYPES.includes(type)) return; // renders fine as-is, nothing to convert
  const cachedPdfPath = cachedPdfPathFor(filePath);
  if (fs.existsSync(cachedPdfPath)) return;
  const { convertToPdf } = require('./convertToPdf');
  convertToPdf(filePath)
    .then((pdfBuffer) => fs.promises.writeFile(cachedPdfPath, pdfBuffer))
    .catch((err) => console.warn('Background pre-conversion skipped:', err.message));
}

// Q2: "loading time is slow" when opening docx/ppt/ebooks in Browse Library.
// preConvertInBackground() only fires for resources uploaded AFTER this
// caching feature existed. Anything uploaded earlier (or uploaded before
// LibreOffice was installed on the server, which the fallback silently
// swallows) still has no cached .preview.pdf sitting next to it, so the
// FIRST person to open it pays the full LibreOffice conversion cost inline,
// which is what shows up as "slow" / "doesn't open automatically" on click.
// This sweeps every resource on server startup and warms any missing cache
// in the background (small concurrency limit so it doesn't hammer the CPU
// on a big library), so by the time anyone actually clicks "Open" the PDF
// is very likely already sitting on disk and opens immediately.
async function warmAllPreviewCaches() {
  try {
    const Resource = require('../models/Resource');
    const resources = await Resource.findAllForAdmin();
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');
    // NOTE: convertToPdf() itself now serializes every actual LibreOffice
    // process through a shared queue (see convertToPdf.js), so running a
    // couple of these workers "in parallel" just overlaps cheap file I/O
    // while the queue keeps the expensive/conflict-prone soffice conversions
    // one-at-a-time - this no longer races with an upload's own
    // preConvertInBackground() call or a live on-demand conversion.
    const CONCURRENCY = 2;
    let idx = 0;

    async function worker() {
      while (idx < resources.length) {
        const r = resources[idx++];
        const type = (r.file_type || '').toLowerCase();
        if (NATIVE_INLINE_TYPES.includes(type)) continue;
        const filePath = path.join(uploadDir, r.file_path);
        const cachedPdfPath = cachedPdfPathFor(filePath);
        if (fs.existsSync(cachedPdfPath) || !fs.existsSync(filePath)) continue;
        try {
          const { convertToPdf } = require('./convertToPdf');
          const pdfBuffer = await convertToPdf(filePath);
          fs.writeFileSync(cachedPdfPath, pdfBuffer);
        } catch (err) {
          console.warn(`Preview cache warm skipped for resource ${r.id}:`, err.message);
        }
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, () => worker());
    await Promise.all(workers);
    console.log('📄 Preview cache warm-up complete.');
  } catch (err) {
    console.warn('Preview cache warm-up failed to run:', err.message);
  }
}

module.exports = { streamForPreview, preConvertInBackground, warmAllPreviewCaches };
