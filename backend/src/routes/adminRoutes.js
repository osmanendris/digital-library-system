const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('admin'));

// Admin Librarian accounts (Q1: renamed from "Librarian", the ONLY account
// type the System Admin creates directly)
router.post('/admin-librarians', admin.createAdminLibrarian);
router.get('/admin-librarians', admin.listAdminLibrarians);
router.patch('/admin-librarians/:id', admin.updateAdminLibrarian);
router.patch('/admin-librarians/:id/reset-password', admin.resetAdminLibrarianPassword);
router.delete('/admin-librarians/:id', admin.deleteAdminLibrarian);

// Activate/deactivate any account
router.patch('/users/:id/active', admin.setAccountActive);
router.get('/users', admin.listAllUsers);

// Global analytics
router.get('/analytics', admin.globalAnalytics);

// Categories
router.post('/categories', admin.createCategory);
router.patch('/categories/:id', admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);
router.get('/category-requests', admin.listCategoryRequests);
router.patch('/category-requests/:id', admin.reviewCategoryRequest);

// System settings
router.get('/settings', admin.getSettings);
router.put('/settings', admin.updateSettings);

module.exports = router;
