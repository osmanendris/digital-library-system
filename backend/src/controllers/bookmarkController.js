const Bookmark = require('../models/Bookmark');

exports.add = async (req, res) => {
  const bookmark = await Bookmark.add(req.user.id, req.params.resourceId);
  res.status(201).json({ bookmark });
};

exports.remove = async (req, res) => {
  await Bookmark.remove(req.user.id, req.params.resourceId);
  res.json({ message: 'Removed from favorites.' });
};

exports.list = async (req, res) => {
  const bookmarks = await Bookmark.findByUser(req.user.id);
  res.json({ bookmarks });
};
