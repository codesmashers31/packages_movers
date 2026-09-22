import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.js';
import { requireVendor, requireApprovedVendor } from '../middlewares/vendorAuth.js';
import {
  getVendorProfile,
  getVendorCompanies,
  registerVendor,
  getVendorCompanyProfile,
  updateVendorCompanyProfile,
  uploadVendorLogo,
  viewVendorLogo,
  getVendorDashboard,
  getVendorEmployees,
  getVendorEmployeeById,
  createVendorEmployee,
  updateVendorEmployee,
  resendVendorEmployeeCredentials,
  sendEmployeePasswordResetLink,
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
  logBookingCrewContact,
  sendCustomerDelayAlert,
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
  updateVendorQuote,
  deleteVendorQuote,
} from '../controllers/quoteController.js';
import {
  getDemandAnalytics,
  getQuotePerformanceAnalytics,
} from '../controllers/vendorAnalyticsController.js';

const router = Router();

// 1. Self-Registration (authenticated user, not yet vendor)
router.post('/register', authenticate, registerVendor);

// Public / Parameterized logo stream
router.get('/logo/:vendorId', viewVendorLogo);

// 2. All subsequent vendor operations require active vendor authorization
router.use(authenticate, requireVendor);

// Profile & Companies (Accessible during onboarding)
router.get('/profile', getVendorProfile);
router.get('/companies', getVendorCompanies);

// Company Profile & Onboarding Verification (Allowed for PENDING_REVIEW / unapproved vendors)
router.get('/company-profile', requirePermission(['company_profile:view', 'documents:view', 'Regulatory Status Monitoring']), getVendorCompanyProfile);
router.patch('/company-profile', requirePermission(['company_profile:edit', 'company_profile:manage']), updateVendorCompanyProfile);
router.post('/company-profile/logo', requirePermission(['company_profile:edit', 'company_profile:manage']), uploadVendorLogo);
router.get('/logo', viewVendorLogo);

// Compliance Documents (Allowed for unapproved vendors to complete onboarding verification)
router.get('/documents', requirePermission(['company_profile:view', 'documents:view', 'Document Submissions', 'Regulatory Status Monitoring']), getVendorDocuments);
router.post('/documents', requirePermission(['company_profile:upload_documents', 'documents:upload', 'Document Submissions']), submitVendorDocument);
router.get('/documents/:docType/view', requirePermission(['company_profile:view', 'documents:view', 'Document Submissions', 'Regulatory Status Monitoring']), viewVendorDocument);

// System: Vendor Notifications Feed
router.get('/notifications', getVendorNotifications);
router.patch('/notifications/:id/read', markVendorNotificationRead);
router.post('/notifications/mark-all-read', markAllVendorNotificationsRead);

// =========================================================================
// OPERATIONAL MODULES (Strictly locked until Company Verification is APPROVED)
// =========================================================================

// Dashboard
router.get('/dashboard/stats', requireApprovedVendor, getVendorDashboard);

// Quotation Operations & Available Leads
router.get('/requests/available', requireApprovedVendor, requirePermission(['quotations:view', 'Review Available Customer Leads']), getAvailableRequestsForVendor);
router.get('/quotations', requireApprovedVendor, requirePermission(['quotations:view', 'View Quotations']), getVendorQuotations);
router.get('/quotations/:id', requireApprovedVendor, requirePermission(['quotations:view', 'View Quotations']), getVendorQuoteById);
router.post('/quotations', requireApprovedVendor, requirePermission(['quotations:create', 'Create & Submit Formal Quotations']), submitQuote);
router.patch('/quotations/:id', requireApprovedVendor, requirePermission(['quotations:edit', 'quotations:manage']), updateVendorQuote);
router.put('/quotations/:id', requireApprovedVendor, requirePermission(['quotations:edit', 'quotations:manage']), updateVendorQuote);
router.delete('/quotations/:id', requireApprovedVendor, requirePermission(['quotations:delete', 'quotations:cancel', 'quotations:manage']), deleteVendorQuote);

// Value-Add Intelligence & Real Analytics
router.get('/analytics/demand', requireApprovedVendor, requirePermission(['quotations:view', 'reports:view', 'Review Available Customer Leads']), getDemandAnalytics);
router.get('/analytics/quote-performance', requireApprovedVendor, requirePermission(['quotations:view', 'reports:view', 'Quotation Performance & Insights']), getQuotePerformanceAnalytics);

// Employees / Crew
router.get('/employees', requireApprovedVendor, requirePermission(['employees:view', 'employees:manage', 'Manage Employees & Crew']), getVendorEmployees);
router.get('/employees/:id', (req: any, res, next) => {
  if (req.user && (req.params.id === req.user.id || req.params.id === 'me')) {
    return next();
  }
  return requireApprovedVendor(req, res, next);
}, getVendorEmployeeById);
router.post('/employees', requireApprovedVendor, requirePermission(['employees:create', 'employees:manage', 'Manage Employees & Crew']), createVendorEmployee);
router.patch('/employees/:id', requireApprovedVendor, requirePermission(['employees:edit', 'employees:manage', 'Manage Employees & Crew']), updateVendorEmployee);
router.post('/employees/:id/resend-credentials', requireApprovedVendor, requirePermission(['employees:create', 'employees:manage', 'Manage Employees & Crew']), resendVendorEmployeeCredentials);
router.post('/employees/:id/send-reset-link', requireApprovedVendor, requirePermission(['employees:edit', 'employees:manage', 'Manage Employees & Crew']), sendEmployeePasswordResetLink);

// Roles & Permissions
router.get('/roles', requireApprovedVendor, requirePermission(['roles:view', 'roles:manage', 'Manage Employees & Crew']), getVendorRoles);
router.post('/roles', requireApprovedVendor, requirePermission(['roles:manage', 'permissions:manage']), addVendorRole);
router.put('/roles/:id', requireApprovedVendor, requirePermission(['roles:manage', 'permissions:manage']), updateVendorRole);
router.patch('/roles/:id', requireApprovedVendor, requirePermission(['roles:manage', 'permissions:manage']), updateVendorRole);
router.delete('/roles/:id', requireApprovedVendor, requirePermission(['roles:manage', 'permissions:manage']), deleteVendorRole);
router.get('/permissions', requireApprovedVendor, requirePermission(['permissions:manage']), getVendorPermissions);

// Marketplace Catalog & Offerings
router.get('/packages', requireApprovedVendor, requirePermission(['packages:view', 'packages:manage', 'Service Catalog Configuration']), getVendorPackages);
router.get('/services', requireApprovedVendor, requirePermission(['services:view', 'services:manage', 'Service Catalog Configuration']), getVendorServices);
router.post('/services', requireApprovedVendor, requirePermission(['services:manage', 'Service Catalog Configuration']), addVendorService);
router.delete('/services/:id', requireApprovedVendor, requirePermission(['services:manage', 'Service Catalog Configuration']), removeVendorService);
router.put('/services', requireApprovedVendor, requirePermission(['services:manage', 'Service Catalog Configuration']), updateVendorServices);
router.get('/service-areas', requireApprovedVendor, requirePermission(['service_areas:view', 'service_areas:manage', 'Coverage Areas Configuration']), getVendorServiceAreas);
router.post('/service-areas', requireApprovedVendor, requirePermission(['service_areas:manage', 'Coverage Areas Configuration']), addVendorServiceArea);
router.delete('/service-areas/:code', requireApprovedVendor, requirePermission(['service_areas:manage', 'Coverage Areas Configuration']), removeVendorServiceArea);

// Operations: Workers & Fleet Vehicles
router.get('/workers', requireApprovedVendor, requirePermission(['workers:view', 'workers:assign', 'workers:manage', 'Assign Available Workers & Crew', 'View Crew Attendance & Performance']), getVendorWorkers);
router.get('/vehicles', requireApprovedVendor, requirePermission(['vehicles:view', 'Fleet & Vehicle Operations']), getVendorVehicles);
router.post('/vehicles', requireApprovedVendor, requirePermission(['vehicles:create', 'vehicles:manage', 'Fleet & Vehicle Operations']), createVendorVehicle);
router.patch('/vehicles/:id', requireApprovedVendor, requirePermission(['vehicles:edit', 'vehicles:manage', 'Fleet & Vehicle Operations']), updateVendorVehicle);
router.delete('/vehicles/:id', requireApprovedVendor, requirePermission(['vehicles:delete', 'vehicles:manage', 'Fleet & Vehicle Operations']), deleteVendorVehicle);

// Operations: Bookings & Milestones
router.get('/bookings', requireApprovedVendor, requirePermission(['bookings:view', 'View & Dispatch Bookings', 'tracking:view', 'View Live GPS Tracking']), getVendorBookings);
router.get('/bookings/:id', requireApprovedVendor, requirePermission(['bookings:view', 'View & Dispatch Bookings', 'tracking:view', 'View Live GPS Tracking']), getVendorBookingById);
router.post('/bookings/:id/assign', requireApprovedVendor, requirePermission(['bookings:dispatch', 'workers:assign', 'vehicles:assign', 'Assign Available Workers & Crew']), assignBookingResources);
router.patch('/bookings/:id/status', requireApprovedVendor, requirePermission(['bookings:update_status', 'Update Move Progression Milestones']), updateBookingMilestone);
router.post('/bookings/:id/crew-contact', requireApprovedVendor, requirePermission(['tracking:contact_crew', 'bookings:view', 'Customer Support Coordination']), logBookingCrewContact);
router.post('/bookings/:id/customer-delay-alert', requireApprovedVendor, requirePermission(['tracking:update_status', 'bookings:view', 'Customer Support Coordination']), sendCustomerDelayAlert);

// System: Reports & Activity
router.get('/reports', requireApprovedVendor, requirePermission(['reports:view', 'Reports & Performance Analytics']), getVendorReports);
router.get('/audit-logs', requireApprovedVendor, requirePermission(['audit_logs:view', 'audit:view', 'Operational Audit Logs']), getVendorAuditLogs);

export default router;
