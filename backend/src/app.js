const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const ttlmLevelRoutes = require('./routes/ttlmLevelRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminLibrarianRoutes = require('./routes/adminLibrarianRoutes');
const departmentHeadRoutes = require('./routes/departmentHeadRoutes');
const librarianRoutes = require('./routes/librarianRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const historyRoutes = require('./routes/historyRoutes');
const requestRoutes = require('./routes/requestRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const settingsPublicRoutes = require('./routes/settingsPublicRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically only for cover images (actual resource files
// are served through controllers so we can enforce role checks + track view/download counts)
app.use('/uploads/covers', express.static(require('path').join(__dirname, 'uploads')));
// Q3: announcement images/videos are public (shown to logged-out visitors
// on the Home page too), so they're served statically like cover images -
// same underlying folder, just a clearer URL prefix for this use case.
app.use('/uploads/media', express.static(require('path').join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Digital Library API running' }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/ttlm-levels', ttlmLevelRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-librarian', adminLibrarianRoutes);
app.use('/api/department-head', departmentHeadRoutes);
app.use('/api/librarian', librarianRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/settings', settingsPublicRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

module.exports = app;
