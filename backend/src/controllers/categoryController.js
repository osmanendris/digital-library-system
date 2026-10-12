const Category = require('../models/Category');

// Public - anyone (guest included) can view categories to browse by
exports.list = async (req, res) => {
  const categories = await Category.findAll();
  res.json({ categories });
};
