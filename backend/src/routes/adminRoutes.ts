import { Router } from 'express';
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
  getVendors,
  createVendorCompany,
  getVendorById,
  reviewVendorApplication,
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
} from '../controllers/adminController.js';

const router = Router();

// 0. Ensure MongoDB is ready before processing any admin requests (waits for handshake if reconnecting)
router.use(async (req, res, next) => {
  const dbReady = await waitForDB(6000);
  if (!dbReady) {
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB database is currently unreachable. Please ensure database service is running.',
      },
    });
  }
  next();
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

// 3. Roles & Permissions Management
router.get('/roles', getRoles);
router.get('/permissions', requirePermission('permissions:manage'), getPermissions);
router.patch('/permissions', requirePermission('permissions:manage'), updatePermission);

// 4. Vendor Management & Verification
router.get('/vendors', requirePermission('vendors:view'), getVendors);
router.post('/vendors', requirePermission('vendors:approve'), createVendorCompany);
router.get('/vendors/:id', requirePermission('vendors:view'), getVendorById);
router.patch('/vendors/:id', requirePermission('vendors:approve'), updateVendorCompany);
router.delete('/vendors/:id', requirePermission('vendors:approve'), deleteVendorCompany);
router.patch('/vendors/:id/decision', requirePermission('vendors:approve'), reviewVendorApplication);
router.patch('/vendors/:id/suspend', requirePermission('vendors:suspend'), toggleVendorSuspension);

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
router.get('/audit-logs', getAuditLogs);

export default router;
