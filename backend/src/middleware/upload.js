const multer = require('multer');
const path = require('path');
const Settings = require('../models/Settings');
require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'src/uploads');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// Cover images are always allowed regardless of the configured resource file types.
const ALWAYS_ALLOWED = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// IMPORTANT: reads the allowed file types from the `settings` table on every
// upload (Admin configures this in System Settings), instead of a hardcoded
// list. This is what makes newly-added types like docx actually work at
// upload time without a code change/restart.
const fileFilter = async (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (ALWAYS_ALLOWED.includes('.' + ext)) return cb(null, true);

    const allowedRaw = await Settings.get('allowed_file_types'); // e.g. "pdf,epub,ppt,pptx,docx,mp4,mov"
    const allowedList = (allowedRaw || 'pdf,epub,mp4')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    if (allowedList.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type ".${ext}". Allowed types: ${allowedList.join(', ')}`));
    }
  } catch (err) {
    cb(err);
  }
};

// Multer's own size limit must be a static number set at startup, so we set
// a generous hard ceiling here (500MB) and enforce the *configured* max size
// from Settings separately inside the upload controller, where we can read
// the live value and return a clean error instead of a raw stream abort.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

module.exports = upload;
