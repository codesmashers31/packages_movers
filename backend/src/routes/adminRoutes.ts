import { Router } from 'express';
import mongoose from 'mongoose';
import { waitForDB } from '../config/db.js';
import { authenticate, requireRoles, requirePermission } from '../middlewares/auth.js';
import {
  getDashboardStats,
  getUsers,
  createUser,
  getUserById,
  updateUser,
  getRoles,
  getPermissions,
  updatePermission,
  getAdminEmployees,
  getAdminEmployeeById,
  createAdminEmployee,
  updateAdminEmployee,
  resendAdminEmployeeCredentials,
  deleteAdminEmployee,
  getAdminRoles,
  createAdminRole,
  updateAdminRole,
  deleteAdminRole,
  getVendors,
  createVendorCompany,
  getVendorById,
  reviewVendorApplication,
  reviewVendorDocument,
  viewAdminVendorDocument,
  getAdminDocuments,
  toggleVendorSuspension,
  updateVendorCompany,
  deleteVendorCompany,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getAdminBookings,
  updateBookingStatus,
  getServiceAreas,
  createServiceArea,
  updateServiceArea,
  deleteServiceArea,
  getSettings,
  updateSettings,
  getAuditLogs,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '../controllers/adminController.js';

const router = Router();

// 0. Ensure MongoDB is ready before processing any admin requests (waits for handshake if reconnecting)
router.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  waitForDB(4000).then((dbReady) => {
    if (!dbReady) {
      return res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'MongoDB database is currently unreachable. Please ensure database service is running.',
        },
      });
    }
    next();
  }).catch(() => {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB database is currently unreachable.',
      },
    });
  });
});

// Base administrative authentication gate
router.use(authenticate, requireRoles('admin'));

// 1. Dashboard
router.get('/dashboard/stats', getDashboardStats);

// 2. User Management
router.get('/users', requirePermission('users:view'), getUsers);
router.post('/users', requirePermission('users:create'), createUser);
router.get('/users/:id', requirePermission('users:view'), getUserById);
router.patch('/users/:id', requirePermission('users:edit'), updateUser);

// 3. Platform Administrative Staff Management
router.get('/employees', requirePermission(['staff:view', 'staff:manage']), getAdminEmployees);
router.get('/employees/:id', getAdminEmployeeById);
router.post('/employees', requirePermission('staff:manage'), createAdminEmployee);
router.patch('/employees/:id', requirePermission('staff:manage'), updateAdminEmployee);
router.post('/employees/:id/resend-credentials', requirePermission('staff:manage'), resendAdminEmployeeCredentials);
router.delete('/employees/:id', requirePermission('staff:manage'), deleteAdminEmployee);

// 4. Roles & Permissions Management
router.get('/roles', requirePermission(['roles:view', 'permissions:manage', 'staff:view']), getRoles);
router.get('/admin-roles', requirePermission(['roles:view', 'permissions:manage', 'staff:view']), getAdminRoles);
router.post('/roles', requirePermission('permissions:manage'), createAdminRole);
router.put('/roles/:id', requirePermission('permissions:manage'), updateAdminRole);
router.delete('/roles/:id', requirePermission('permissions:manage'), deleteAdminRole);
router.get('/permissions', requirePermission('permissions:manage'), getPermissions);
router.patch('/permissions', requirePermission('permissions:manage'), updatePermission);

// 4. Vendor Management & Verification
router.get('/vendors', requirePermission('vendors:view'), getVendors);
router.post('/vendors', requirePermission('vendors:approve'), createVendorCompany);
router.get('/vendors/:id', requirePermission('vendors:view'), getVendorById);
router.patch('/vendors/:id', requirePermission(['vendors:approve', 'vendors:view']), updateVendorCompany);
router.delete('/vendors/:id', requirePermission('vendors:approve'), deleteVendorCompany);

// Decision / Review endpoints (supports PATCH and POST, /decision and /review)
router.patch('/vendors/:id/decision', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorApplication);
router.post('/vendors/:id/decision', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorApplication);
router.patch('/vendors/:id/review', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorApplication);
router.post('/vendors/:id/review', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorApplication);

// Document review endpoints (supports PATCH and POST, with or without /review suffix)
router.patch('/vendors/:id/documents/:docType', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorDocument);
router.post('/vendors/:id/documents/:docType', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorDocument);
router.patch('/vendors/:id/documents/:docType/review', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorDocument);
router.post('/vendors/:id/documents/:docType/review', requirePermission(['vendors:approve', 'documents:verify']), reviewVendorDocument);

router.get('/vendors/:vendorId/documents/:docType/view', requirePermission('vendors:view'), viewAdminVendorDocument);
router.patch('/vendors/:id/suspend', requirePermission('vendors:suspend'), toggleVendorSuspension);
router.post('/vendors/:id/suspend', requirePermission('vendors:suspend'), toggleVendorSuspension);
router.get('/documents', requirePermission('vendors:view'), getAdminDocuments);

// 5. Service Packages Catalog
router.get('/packages', requirePermission('packages:manage'), getPackages);
router.post('/packages', requirePermission('packages:manage'), createPackage);
router.patch('/packages/:id', requirePermission('packages:manage'), updatePackage);
router.delete('/packages/:id', requirePermission('packages:manage'), deletePackage);

// 6. Move Supervision & Operations
router.get('/bookings', requirePermission('bookings:view'), getAdminBookings);
router.patch('/bookings/:id/status', requirePermission('bookings:manage'), updateBookingStatus);

// 7. Service Coverage Areas
router.get('/service-areas', requirePermission('service_areas:manage'), getServiceAreas);
router.post('/service-areas', requirePermission('service_areas:manage'), createServiceArea);
router.patch('/service-areas/:id', requirePermission('service_areas:manage'), updateServiceArea);
router.delete('/service-areas/:id', requirePermission('service_areas:manage'), deleteServiceArea);

// 8. System Configuration & Settings
router.get('/settings', requirePermission('settings:manage'), getSettings);
router.put('/settings', requirePermission('settings:manage'), updateSettings);

// 9. Audit Trail
router.get('/audit-logs', requirePermission(['audit:view', 'audit_logs:view']), getAuditLogs);

// 10. Platform Admin Notifications Feed
router.get('/notifications', getAdminNotifications);
router.patch('/notifications/:id/read', markAdminNotificationRead);
router.post('/notifications/mark-all-read', markAllAdminNotificationsRead);

export default router;
