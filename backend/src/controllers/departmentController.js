const Department = require('../models/Department');
const { textFieldError } = require('../utils/validateText');
const { verifyCurrentUserPassword } = require('../utils/verifyPassword');

// Public (any logged-in role) - populates the Department dropdown.
exports.list = async (req, res) => {
  const departments = await Department.findAll();
  res.json({ departments });
};

// Admin Librarian manages the list.
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    const e = textFieldError(name, 'Department name', 2);
    if (e) return res.status(400).json({ message: e });
    const department = await Department.create(name.trim());
    res.status(201).json({ department });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ message: 'That department already exists.' });
    res.status(500).json({ message: 'Could not create department.' });
  }
};

// Q3: editing an existing department requires the controller's OWN
// password, matching every other edit action on an existing record.
exports.update = async (req, res) => {
  try {
    const { name, confirm_password } = req.body;
    if (name !== undefined) {
      const e = textFieldError(name, 'Department name', 2);
      if (e) return res.status(400).json({ message: e });
    }
    const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
    if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
    const department = await Department.update(req.params.id, name?.trim());
    res.json({ department });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(409).json({ message: 'That department already exists.' });
    res.status(500).json({ message: 'Could not update department.' });
  }
};

// Q3: deleting a department requires the controller's OWN password.
exports.remove = async (req, res) => {
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await Department.remove(req.params.id);
  res.json({ message: 'Department deleted.' });
};
