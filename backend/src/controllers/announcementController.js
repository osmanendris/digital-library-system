const fs = require('fs');
const path = require('path');
const Announcement = require('../models/Announcement');
const { textFieldError } = require('../utils/validateText');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');

// Everyone (including logged-out visitors on the public Home page, and
// every logged-in role on their own "Announcements" dashboard page - Q3)
// sees only ACTIVE announcements.
exports.listActive = async (req, res) => {
  const announcements = await Announcement.findActive();
  res.json({ announcements });
};

// Management screen only (System Admin / Admin Librarian) - includes paused ones too.
exports.listAll = async (req, res) => {
  const announcements = await Announcement.findAll();
  res.json({ announcements });
};

exports.create = async (req, res) => {
  const { title, message, video_url } = req.body;
  const titleErr = textFieldError(title, 'Title', 3);
  if (titleErr) return res.status(400).json({ message: titleErr });
  const msgErr = textFieldError(message, 'Message', 10);
  if (msgErr) return res.status(400).json({ message: msgErr });

  const image = req.files?.image?.[0] || null;
  const video = req.files?.video?.[0] || null;

  const announcement = await Announcement.create(title, message, req.user.id, {
    image_filename: image ? image.filename : null,
    video_filename: video ? video.filename : null,
    video_url: video ? null : (video_url || null), // an uploaded file takes priority over a pasted link
  });
  res.status(201).json({ announcement });
};

exports.update = async (req, res) => {
  const { title, message, video_url, clear_image, clear_video } = req.body;
  if (title !== undefined) {
    const titleErr = textFieldError(title, 'Title', 3);
    if (titleErr) return res.status(400).json({ message: titleErr });
  }
  if (message !== undefined) {
    const msgErr = textFieldError(message, 'Message', 10);
    if (msgErr) return res.status(400).json({ message: msgErr });
  }

  const existing = await Announcement.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Announcement not found.' });

  const image = req.files?.image?.[0] || null;
  const video = req.files?.video?.[0] || null;

  // Replacing a file: delete the old one from disk so we don't leak storage.
  if (image && existing.image_filename) {
    fs.unlink(path.join(UPLOAD_DIR, existing.image_filename), () => {});
  }
  if (video && existing.video_filename) {
    fs.unlink(path.join(UPLOAD_DIR, existing.video_filename), () => {});
  }
  if (clear_image === 'true' && existing.image_filename) {
    fs.unlink(path.join(UPLOAD_DIR, existing.image_filename), () => {});
  }
  if (clear_video === 'true' && existing.video_filename) {
    fs.unlink(path.join(UPLOAD_DIR, existing.video_filename), () => {});
  }

  const announcement = await Announcement.update(req.params.id, title, message, {
    image_filename: image ? image.filename : undefined,
    video_filename: video ? video.filename : undefined,
    video_url: video ? undefined : (video_url || undefined),
    clearImage: clear_image === 'true',
    clearVideo: clear_video === 'true',
  });
  res.json({ announcement });
};

exports.setActive = async (req, res) => {
  const { is_active } = req.body;
  const announcement = await Announcement.setActive(req.params.id, is_active);
  res.json({ announcement });
};

exports.remove = async (req, res) => {
  const existing = await Announcement.findById(req.params.id);
  if (existing) {
    if (existing.image_filename) fs.unlink(path.join(UPLOAD_DIR, existing.image_filename), () => {});
    if (existing.video_filename) fs.unlink(path.join(UPLOAD_DIR, existing.video_filename), () => {});
  }
  await Announcement.remove(req.params.id);
  res.json({ message: 'Announcement deleted.' });
};
