const path = require('path');
const fs = require('fs');
const Resource = require('../models/Resource');
const History = require('../models/History');
const Settings = require('../models/Settings');
require('dotenv').config();

// Returns true if this resource has no role restriction, or the viewer's
// role is explicitly in its allowed_roles list.
function roleCanAccess(resource, role) {
  if (!resource.allowed_roles || resource.allowed_roles.length === 0) return true;
  return resource.allowed_roles.includes(role);
}

// Who's allowed to open a NOT-YET-APPROVED resource to review it (Q4/Q2):
//  - Admin Librarian is the final approver for everything not yet 'approved'.
//  - Department Head can review 'pending' resources uploaded by teachers in
//    THEIR OWN DEPARTMENT (matched by department name, not by who created
//    the department head account - see Q2: this must transfer automatically
//    to a newly registered head after the old one is deleted, exactly like
//    the actual Approval Queue listing already does).
//  - The uploader can always review their own submission.
async function userCanReviewResource(user, resource) {
  if (resource.uploaded_by === user.id) return true;
  if (user.role === 'admin_librarian') return true;
  if (user.role === 'department_head' && resource.status === 'pending') {
    const User = require('../models/User');
    const uploader = await User.findById(resource.uploaded_by);
    return !!uploader && uploader.role === 'teacher' && uploader.department === user.department;
  }
  return false;
}

// ---- Browse catalog - any logged-in role ----
exports.browse = async (req, res) => {
  try {
    const { category_id, q, ttlm_level_id } = req.query;
    const resources = await Resource.findApproved({ category_id, q, viewerRole: req.user.role, ttlm_level_id });
    res.json({ resources });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load catalog.' });
  }
};

// ---- Resource detail (metadata) - any logged-in role ----
exports.getById = async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: 'Resource not found.' });

  if (['student', 'staff'].includes(req.user.role) && resource.status !== 'approved') {
    return res.status(403).json({ message: 'This resource is not available.' });
  }
  const isReviewing = resource.status !== 'approved' && await userCanReviewResource(req.user, resource);
  if (!isReviewing && !roleCanAccess(resource, req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to access this resource.' });
  }
  res.json({ resource });
};

// ---- READ ONLINE (stream inline) - any logged-in role ----
// For docx/doc/ppt/pptx: attempts a server-side conversion to PDF via a
// locally installed LibreOffice first, so the document opens with EXACTLY
// the same pagination/fonts/layout as the original (a client-side HTML
// approximation cannot reliably guarantee this). The converted PDF is
// cached alongside the original so this only happens once per file.
// If LibreOffice isn't installed on the server, this silently falls back to
// serving the raw file, and the frontend's client-side viewer takes over.
// ---- READ ONLINE (stream inline) - any logged-in role, for approved
// resources; ALSO usable by a legitimate reviewer on a not-yet-approved
// resource, so the approval queue can reuse this exact same full-fidelity
// reader (PDF/epub.js/mammoth/LibreOffice-PDF) instead of just opening a
// raw file in a new tab, which is what caused eBooks (.epub) and other
// non-natively-renderable formats to auto-download during review instead
// of opening (Q4/Q2 fix) - a raw blob opened in a new browser tab can only
// ever render formats the browser itself understands (pdf/images/video);
// everything else needs the reader's client-side renderers, which this
// endpoint is the only thing that feeds.
// For docx/doc/ppt/pptx/epub-without-a-working-LibreOffice-conversion:
// served raw and rendered client-side by the reader. Where LibreOffice IS
// available, converts to PDF first for exact fidelity, cached so it only
// happens once per file.
exports.readOnline = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });

    let isReviewing = false;
    if (resource.status !== 'approved') {
      const canReview = await userCanReviewResource(req.user, resource);
      if (!canReview) {
        return res.status(403).json({ message: 'This resource is not available for reading.' });
      }
      isReviewing = true;
    }
    // The allowed_roles audience restriction only applies to actual
    // READERS of a published resource - a legitimate reviewer must always
    // be able to open a pending resource to decide on it, even if the
    // uploader restricted its eventual audience to roles that don't
    // include the reviewer's own role.
    if (!isReviewing && !roleCanAccess(resource, req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }
    const filePath = path.join(path.resolve(process.env.UPLOAD_DIR || 'src/uploads'), resource.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server.' });

    // Only counts as a real "view" once it's actually published.
    if (resource.status === 'approved') {
      await Resource.incrementView(resource.id);
      await History.log(req.user.id, resource.id, 'viewed');
    }

    const { streamForPreview } = require('../utils/streamPreview');
    return streamForPreview(res, filePath, resource.file_type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not open resource.' });
  }
};

// ---- DOWNLOAD - any logged-in role, only if marked downloadable ----
exports.download = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });
    if (resource.status !== 'approved') {
      return res.status(403).json({ message: 'This resource is not available.' });
    }
    if (!resource.downloadable) {
      return res.status(403).json({ message: 'This resource is not downloadable.' });
    }
    if (!roleCanAccess(resource, req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }
    const filePath = path.join(path.resolve(process.env.UPLOAD_DIR || 'src/uploads'), resource.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server.' });

    await Resource.incrementDownload(resource.id);
    await History.log(req.user.id, resource.id, 'downloaded');

    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Download failed.' });
  }
};

// ---- UPLOAD - Teacher, Faculty, Librarian, or Admin ----
// Full metadata is required. Visibility is always "registered" - there is no
// guest-visible tier in this system, so the concept of a "public" resource
// has been removed from the upload flow entirely.
exports.upload = async (req, res) => {
  try {
    const { title, author, subject, keywords, description, category_id, downloadable, file_type, publish_immediately, is_ttlm, ttlm_level_id } = req.body;

    // allowed_roles arrives as a JSON string (e.g. '["admin","faculty"]') since
    // it's sent through multipart/form-data. Empty/absent = no restriction.
    let allowed_roles = null;
    if (req.body.allowed_roles) {
      try {
        const parsed = JSON.parse(req.body.allowed_roles);
        const validRoles = ['admin', 'admin_librarian', 'department_head', 'teacher', 'librarian', 'staff', 'student'];
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((r) => validRoles.includes(r))) {
          allowed_roles = parsed;
        }
      } catch {
        // ignore malformed input, treat as unrestricted
      }
    }

    const missing = [];
    if (!title) missing.push('title');
    if (!author) missing.push('author');
    if (!subject) missing.push('subject');
    if (!category_id) missing.push('category');
    if (!description) missing.push('description');
    if (missing.length) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(', ')}.` });
    }

    const { textFieldError } = require('../utils/validateText');
    for (const [value, label, minLen] of [[title, 'Title', 3], [author, 'Author', 3], [subject, 'Subject', 3], [description, 'Description', 1]]) {
      const err = textFieldError(value, label, minLen);
      if (err) return res.status(400).json({ message: err });
    }
    if (keywords && /^\d+$/.test(keywords.trim())) {
      return res.status(400).json({ message: 'Keywords must be text, not just a number.' });
    }

    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'A resource file is required.' });
    }
    const file = req.files.file[0];
    const cover = req.files.cover ? req.files.cover[0] : null;

    // Make sure the actual uploaded file matches the declared file_type -
    // e.g. selecting "pdf" but uploading a .docx used to be silently
    // accepted, then fail (or force a browser download) when read online
    // later, since the reader trusts file_type to decide how to render it.
    const TYPE_EXTENSIONS = {
      pdf: ['.pdf'], epub: ['.epub'],
      ppt: ['.ppt', '.pptx'], pptx: ['.pptx'],
      doc: ['.doc'], docx: ['.docx'],
      video: ['.mp4', '.mov', '.mkv'], mp4: ['.mp4'], mov: ['.mov'],
    };
    const declaredType = (file_type || '').toLowerCase();
    const expectedExts = TYPE_EXTENSIONS[declaredType] || [`.${declaredType}`];
    const actualExt = '.' + (file.originalname.split('.').pop() || '').toLowerCase();
    if (!expectedExts.includes(actualExt)) {
      fs.unlink(file.path, () => {});
      if (cover) fs.unlink(cover.path, () => {});
      return res.status(400).json({
        message: `File Type was set to "${file_type}" but the uploaded file ends in "${actualExt}". These must match (expected: ${expectedExts.join(', ')}).`,
      });
    }

    const configuredMaxMb = parseInt(await Settings.get('max_file_size_mb')) || 100;
    if (file.size > configuredMaxMb * 1024 * 1024) {
      fs.unlink(file.path, () => {});
      if (cover) fs.unlink(cover.path, () => {});
      return res.status(400).json({ message: `File exceeds the maximum allowed size of ${configuredMaxMb}MB.` });
    }

    // Only an Admin Librarian (the FINAL approver) can skip the queue -
    // every other uploader, including the new Librarian role, always goes
    // through the approval pipeline (Q3).
    const autoApprove = req.user.role === 'admin_librarian' && (publish_immediately === 'true' || publish_immediately === true);

    // Q8: TTLM part is optional - if checked, a level must be picked.
    const wantsTtlm = is_ttlm === 'true' || is_ttlm === true;
    if (wantsTtlm && !ttlm_level_id) {
      return res.status(400).json({ message: 'Select a TTLM level, or uncheck the TTLM box.' });
    }

    const resource = await Resource.create({
      title, author, subject, keywords, description,
      category_id,
      file_path: file.filename,
      file_size: file.size,
      file_type: file_type || 'pdf',
      cover_image: cover ? cover.filename : null,
      visibility: 'registered',
      downloadable: downloadable === 'true' || downloadable === true,
      uploaded_by: req.user.id,
      autoApprove,
      approved_by: req.user.id,
      allowed_roles,
      is_ttlm: wantsTtlm,
      ttlm_level_id: wantsTtlm ? ttlm_level_id : null,
    });

    res.status(201).json({
      resource,
      message: autoApprove
        ? 'Resource published immediately.'
        : 'Resource submitted and is pending approval.',
    });

    // Fire-and-forget: convert docx/ppt to PDF now, in the background, so
    // whoever reviews/reads it later doesn't sit through the LibreOffice
    // conversion themselves (Q4).
    const { preConvertInBackground } = require('../utils/streamPreview');
    const filePath = path.join(path.resolve(process.env.UPLOAD_DIR || 'src/uploads'), file.filename);
    preConvertInBackground(filePath, file_type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed.' });
  }
};

exports.myUploads = async (req, res) => {
  const resources = await Resource.findByUploader(req.user.id);
  res.json({ resources });
};

exports.editOwnMetadata = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });
    if (resource.uploaded_by !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own uploads.' });
    }
    if (resource.status !== 'pending') {
      return res.status(403).json({ message: 'This resource has already entered the approval pipeline and can no longer be edited by you.' });
    }
    const updated = await Resource.updateMetadata(req.params.id, req.body);
    res.json({ resource: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update resource.' });
  }
};
