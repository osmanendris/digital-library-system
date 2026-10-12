const Settings = require('../models/Settings');

// Public-safe subset of settings (no secrets) - any logged-in uploader role
// needs to know the currently allowed file types & max size before uploading.
exports.getPublic = async (req, res) => {
  const settings = await Settings.getAll();
  res.json({
    settings: {
      site_name: settings.site_name,
      max_file_size_mb: settings.max_file_size_mb,
      allowed_file_types: settings.allowed_file_types,
    },
  });
};
