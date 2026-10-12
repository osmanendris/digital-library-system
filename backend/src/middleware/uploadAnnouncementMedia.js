const multer = require('multer');
const path = require('path');
require('dotenv').config();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || 'src/uploads');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'announcement-' + unique + path.extname(file.originalname));
  },
});

const ALLOWED = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  video: ['.mp4', '.mov', '.webm'],
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ALLOWED[file.fieldname] || [];
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error(`Unsupported ${file.fieldname} type "${ext}". Allowed: ${allowed.join(', ')}`));
};

const uploadAnnouncementMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB - plenty for a notice image/short clip
});

module.exports = uploadAnnouncementMedia;
