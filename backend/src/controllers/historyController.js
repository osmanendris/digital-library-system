const History = require('../models/History');

exports.list = async (req, res) => {
  const history = await History.findByUser(req.user.id);
  res.json({ history });
};
