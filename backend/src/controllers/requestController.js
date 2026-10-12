const ResourceRequest = require('../models/ResourceRequest');
const { textFieldError } = require('../utils/validateText');

// Student/Staff suggests a resource
exports.create = async (req, res) => {
  const { title, author, subject, reason } = req.body;
  for (const [value, label, minLen] of [
    [title, 'Title', 3],
    [author, 'Author', 3],
    [subject, 'Subject', 3],
    [reason, 'Reason', 10],
  ]) {
    const err = textFieldError(value, label, minLen);
    if (err) return res.status(400).json({ message: err });
  }
  const request = await ResourceRequest.create(req.user.id, title, author, subject, reason);
  res.status(201).json({ request, message: 'Your request has been sent to the Librarian.' });
};

exports.myRequests = async (req, res) => {
  const requests = await ResourceRequest.findByUser(req.user.id);
  res.json({ requests });
};

// Librarian handles all requests
exports.allRequests = async (req, res) => {
  const requests = await ResourceRequest.findAll();
  res.json({ requests });
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const request = await ResourceRequest.updateStatus(req.params.id, status);
  res.json({ request });
};
