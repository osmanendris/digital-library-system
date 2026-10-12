const jwt = require('jsonwebtoken');
require('dotenv').config();

// Attaches req.user if a valid token is present. Does NOT block guests.
// Used on routes guests can also access (e.g. browsing catalog) where logged-in
// users simply get to see more.
function attachUserIfPresent(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { id, role, email, full_name, department }
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

// Blocks guests entirely - must be logged in.
// IMPORTANT: this decodes the JWT itself and does NOT depend on
// attachUserIfPresent having run earlier in the chain, so it works
// correctly whether it's the first middleware on the route or not.
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

module.exports = { attachUserIfPresent, requireAuth };
