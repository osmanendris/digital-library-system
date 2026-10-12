const TtlmLevel = require('../models/TtlmLevel');
const { textFieldError } = require('../utils/validateText');

// Public (any logged-in role) - populates the TTLM Level dropdown and the
// Browse Library level filter.
exports.list = async (req, res) => {
  const levels = await TtlmLevel.findAll();
  res.json({ levels });
};

// Admin Librarian manages the list, same as Departments/Categories.
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const e = textFieldError(name, 'Level name');
    if (e) return res.status(400).json({ message: e });
    const level = await TtlmLevel.create(name.trim());
    res.status(201).json({ level });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ message: 'That level already exists.' });
    res.status(500).json({ message: 'Could not create level.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name } = req.body;
    const level = await TtlmLevel.update(req.params.id, name?.trim());
    res.json({ level });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ message: 'That level already exists.' });
    res.status(500).json({ message: 'Could not update level.' });
  }
};

exports.remove = async (req, res) => {
  await TtlmLevel.remove(req.params.id);
  res.json({ message: 'Level deleted.' });
};
