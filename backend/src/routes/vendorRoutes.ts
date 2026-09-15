import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { requireVendor } from '../middlewares/vendorAuth.js';
import {
  getVendorProfile,
  getVendorCompanies,
  registerVendor,
  getVendorDashboard,
  getVendorEmployees,
  createVendorEmployee,
  updateVendorEmployee,
  resendVendorEmployeeCredentials,
  getVendorRoles,
  addVendorRole,
  updateVendorRole,
  deleteVendorRole,
  getVendorPermissions,
  getVendorPackages,
  getVendorServices,
  addVendorService,
  removeVendorService,
  updateVendorServices,
  getVendorServiceAreas,
  addVendorServiceArea,
  removeVendorServiceArea,
  getVendorWorkers,
  getVendorVehicles,
  createVendorVehicle,
  updateVendorVehicle,
  deleteVendorVehicle,
  getVendorDocuments,
  submitVendorDocument,
  viewVendorDocument,
  getVendorBookings,
  getVendorBookingById,
  assignBookingResources,
  updateBookingMilestone,
  getVendorReports,
  getVendorAuditLogs,
  getVendorNotifications,
  markVendorNotificationRead,
  markAllVendorNotificationsRead,
} from '../controllers/vendorController.js';
import {
  submitQuote,
  getVendorQuotations,
  getVendorQuoteById,
  getAvailableRequestsForVendor,
} from '../controllers/quoteController.js';
import {
  getDemandAnalytics,
  getQuotePerformanceAnalytics,
} from '../controllers/vendorAnalyticsController.js';

const router = Router();

// 1. Self-Registration (authenticated user, not yet vendor)
router.post('/register', authenticate, registerVendor);

// 2. All subsequent vendor operations require active vendor authorization
router.use(authenticate, requireVendor);

// Profile & Dashboard
router.get('/profile', getVendorProfile);
router.get('/companies', getVendorCompanies);
router.get('/dashboard/stats', getVendorDashboard);

// Quotation Operations & Available Leads
router.get('/requests/available', getAvailableRequestsForVendor);
router.get('/quotations', getVendorQuotations);
router.get('/quotations/:id', getVendorQuoteById);
router.post('/quotations', submitQuote);

// Value-Add Intelligence & Real Analytics
router.get('/analytics/demand', getDemandAnalytics);
router.get('/analytics/quote-performance', getQuotePerformanceAnalytics);

// Employees / Crew
router.get('/employees', getVendorEmployees);
router.post('/employees', createVendorEmployee);
router.patch('/employees/:id', updateVendorEmployee);
router.post('/employees/:id/resend-credentials', resendVendorEmployeeCredentials);

// Roles & Permissions
router.get('/roles', getVendorRoles);
router.post('/roles', addVendorRole);
router.put('/roles/:id', updateVendorRole);
router.delete('/roles/:id', deleteVendorRole);
router.get('/permissions', getVendorPermissions);

// Marketplace Catalog & Offerings
router.get('/packages', getVendorPackages);
router.get('/services', getVendorServices);
router.post('/services', addVendorService);
router.delete('/services/:id', removeVendorService);
router.put('/services', updateVendorServices);
router.get('/service-areas', getVendorServiceAreas);
router.post('/service-areas', addVendorServiceArea);
router.delete('/service-areas/:code', removeVendorServiceArea);

// Operations: Workers & Fleet Vehicles
router.get('/workers', getVendorWorkers);
router.get('/vehicles', getVendorVehicles);
router.post('/vehicles', createVendorVehicle);
router.patch('/vehicles/:id', updateVendorVehicle);
router.delete('/vehicles/:id', deleteVendorVehicle);

// Compliance & Documents
router.get('/documents', getVendorDocuments);
router.post('/documents', submitVendorDocument);
router.get('/documents/:docType/view', viewVendorDocument);

// Operations: Bookings & Milestones
router.get('/bookings', getVendorBookings);
router.get('/bookings/:id', getVendorBookingById);
router.post('/bookings/:id/assign', assignBookingResources);
router.patch('/bookings/:id/status', updateBookingMilestone);

// System: Reports & Activity
router.get('/reports', getVendorReports);
router.get('/audit-logs', getVendorAuditLogs);

// System: Vendor Notifications Feed
router.get('/notifications', getVendorNotifications);
router.patch('/notifications/:id/read', markVendorNotificationRead);
router.post('/notifications/mark-all-read', markAllVendorNotificationsRead);

export default router;
