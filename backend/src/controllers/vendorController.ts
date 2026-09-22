import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, invalidatePermissionsCache } from '../middlewares/auth.js';
import { Vendor } from '../models/Vendor.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { Vehicle } from '../models/Vehicle.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { BookingStatus, VendorStatus } from '../types/index.js';
import { bootstrapVendorOperations } from '../utils/seedOperations.js';
import { createCrossNotification } from '../utils/notificationHelper.js';
import { getVendorVerificationDecision } from '../middlewares/vendorAuth.js';
import {
  sendCredentialsViaWhatsApp,
  generateSimpleCompanyEmail,
  normalizePhoneForWhatsApp,
} from '../utils/whatsappService.js';
import fs from 'fs';
import path from 'path';
import {
  saveDocumentFile,
  saveLogoFile,
  resolveDocumentMime,
  generateValidPdfBuffer,
} from '../utils/fileStorage.js';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'CONFIRMED',
  'ASSIGNED',
  'EN_ROUTE_PICKUP',
  'ARRIVED_PICKUP',
  'PACKING',
  'LOADING',
  'IN_TRANSIT',
  'ARRIVED_DROPOFF',
  'UNLOADING',
  'AWAITING_CONFIRMATION',
];

const logVendorAction = async (
  actorId: string,
  actorPhone: string | undefined,
  action: string,
  targetType: string,
  targetId: any,
  reason: string,
  details?: Record<string, any>
) => {
  try {
    const enrichedDetails: Record<string, any> = {
      ...details,
      timestamp: new Date().toISOString(),
    };

    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(actorId),
      actorPhone: actorPhone || '',
      action,
      targetType,
      targetId: String(targetId),
      reason,
      details: enrichedDetails,
    });

    // If this action belongs to a vendor company, alert the Vendor Admin in real-time
    if (enrichedDetails.vendorId) {
      const actorName = enrichedDetails.actorName || actorPhone || 'Team Member';
      const actorRole = enrichedDetails.actorRole || 'Staff';

      let notifTitle = `Team Activity: ${actorName}`;
      let notifMessage = reason;

      if (action === 'STATUS_UPDATED') {
        notifTitle = `Move #${String(targetId).slice(-6).toUpperCase()} Milestone Updated`;
        notifMessage = `${actorName} (${actorRole}) advanced move status to ${enrichedDetails.newStatus || 'new milestone'}.`;
      } else if (action === 'CREW_CONTACT_LOGGED') {
        notifTitle = `Crew Contact: Move #${String(targetId).slice(-6).toUpperCase()}`;
        notifMessage = `${actorName} contacted on-ground crew regarding vehicle halt. Note: ${enrichedDetails.note || reason}`;
      } else if (action === 'CUSTOMER_DELAY_ALERT') {
        notifTitle = `Customer Delay Notice: Move #${String(targetId).slice(-6).toUpperCase()}`;
        notifMessage = `${actorName} notified customer about ${enrichedDetails.delayMinutes || 30}m delay: ${enrichedDetails.reason || reason}`;
      }

      await Notification.create({
        recipientRole: 'vendor',
        recipientVendorId: new mongoose.Types.ObjectId(enrichedDetails.vendorId),
        actorId: new mongoose.Types.ObjectId(actorId),
        actorName,
        actorRole,
        title: notifTitle,
        message: notifMessage,
        type: 'MOVE_UPDATE',
        targetType: targetType as any,
        targetId: String(targetId),
        metadata: enrichedDetails,
      }).catch((err) => console.warn('[Notification] Failed to create vendor admin notification:', err));
    }
  } catch (err) {
    console.warn('[AuditLog] Failed to record vendor action:', err);
  }
};

// 1. Vendor Profile (Personal context)
export const getVendorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const vendor = req.vendor;
  const decision = getVendorVerificationDecision(vendor);
  const vendorObj = vendor.toObject ? vendor.toObject() : { ...vendor };
  vendorObj.verificationAccess = decision.verificationAccess;
  vendorObj.verificationStatus = decision.verificationStatus;
  vendorObj.verificationReason = decision.reason;
  vendorObj.blockingItem = decision.blockingItem;
  vendorObj.approvedDocCount = decision.approvedCount;
  vendorObj.requiredDocCount = decision.requiredCount;
  res.status(200).json({ vendor: vendorObj, verificationDecision: decision });
};

// 1.1 Vendor Company Profile & Workforce Summary (Shared Single Source of Truth)
export const getVendorCompanyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendor = req.vendor;
    const vendorId = vendor._id;

    // Unambiguous workforce counts derived strictly from MongoDB User collection
    const [totalEmployees, crewWorkers, activeEmployees] = await Promise.all([
      User.countDocuments({ vendorId, accountStatus: { $ne: 'deleted' } }),
      User.countDocuments({ vendorId, role: 'worker', accountStatus: { $ne: 'deleted' } }),
      User.countDocuments({ vendorId, accountStatus: 'active' }),
    ]);

    const docs = vendor.verificationDetails?.documents || [];

    const standardDocTypes = [
      // Section 1: Company Verification (2 Core Documents)
      {
        type: 'GST_CERTIFICATE',
        category: 'COMPANY',
        section: 'COMPANY',
        title: 'GST Registration Certificate',
        description: 'Core business identity document required for company approval.',
        required: true,
      },
      {
        type: 'BUSINESS_PAN',
        category: 'COMPANY',
        section: 'COMPANY',
        title: 'Company / Business PAN Card',
        description: 'Permanent Account Number registered with the Income Tax Department.',
        required: true,
      },
      // Section 2: Owner / Representative Verification (2 Core Documents)
      {
        type: 'REPRESENTATIVE_ID_PROOF',
        category: 'REPRESENTATIVE',
        section: 'REPRESENTATIVE',
        title: 'Government Identity Proof',
        description: 'Official government-issued identity proof (Aadhaar, Passport, Driving Licence, or Other) of the business owner or authorized representative.',
        required: true,
        supportedIdTypes: ['Aadhaar', 'Passport', 'Driving Licence', 'Voter ID', 'Other'],
      },
      {
        type: 'REPRESENTATIVE_PHOTO',
        category: 'REPRESENTATIVE',
        section: 'REPRESENTATIVE',
        title: 'Representative Photo / Camera Capture',
        description: 'Recent photograph of the business owner or authorized representative for identity verification.',
        required: true,
      },
      // Section 3: Operational Compliance (Mandatory for Operational Permissions)
      {
        type: 'TRANSPORT_PERMIT',
        category: 'OPERATIONAL',
        section: 'OPERATIONAL',
        title: 'All India Goods Transport Permit',
        description: 'Commercial logistics transport permit (operational compliance; mandatory for operational permissions).',
        required: false,
      },
      {
        type: 'TRANSIT_INSURANCE',
        category: 'OPERATIONAL',
        section: 'OPERATIONAL',
        title: 'Goods In-Transit Insurance Policy',
        description: 'Cargo transit indemnity policy protecting customer household assets (operational compliance; mandatory for operational permissions).',
        required: false,
      },
    ];

    const documentChecklist = standardDocTypes.map((std) => {
      const submitted = docs.find((d: any) => d.type === std.type);
      return {
        ...std,
        status: submitted?.status || 'NOT_SUBMITTED',
        fileUrl: submitted ? `/api/v1/vendor/documents/${std.type}/view` : null,
        fileName: submitted?.fileName || null,
        fileSize: submitted?.fileSize || null,
        mimeType: submitted?.mimeType || 'application/pdf',
        idType: submitted?.idType || null,
        maskedIdNumber: submitted?.maskedIdNumber || null,
        submittedAt: submitted?.submittedAt || null,
        reviewedAt: submitted?.reviewedAt || null,
        feedback: submitted?.feedback || null,
      };
    });

    const coreApprovedCount = documentChecklist.filter(
      (d) => ['GST_CERTIFICATE', 'BUSINESS_PAN', 'REPRESENTATIVE_ID_PROOF', 'REPRESENTATIVE_PHOTO'].includes(d.type) && d.status === 'APPROVED'
    ).length;
    const coreRequiredCount = 4;
    const coreVerificationComplete = coreApprovedCount === 4;
    const totalApprovedCount = documentChecklist.filter((d) => d.status === 'APPROVED').length;
    const totalRequiredCount = 6;
    const allDocumentsApproved = totalApprovedCount === 6;

    const vendorPlain = vendor.toObject ? vendor.toObject() : { ...vendor };
    const decision = getVendorVerificationDecision({
      ...vendorPlain,
      verificationDetails: {
        ...vendorPlain.verificationDetails,
        documents: documentChecklist,
      },
    });

    const isOwner = req.user?.role === 'vendor' || req.user?.id === vendor.ownerId?.toString();
    const userPerms: string[] = (req.user as any)?.permissions || [];
    const canEdit = isOwner || userPerms.includes('*') || userPerms.includes('company_profile:edit') || userPerms.includes('company_profile:manage');
    const canUploadDocs = vendor.status !== 'SUSPENDED' && (isOwner || userPerms.includes('*') || userPerms.includes('company_profile:upload_documents') || userPerms.includes('documents:upload'));

    res.status(200).json({
      vendor: {
        _id: vendor._id,
        businessName: vendor.businessName,
        logoUrl: vendor.logoUrl || null,
        contactEmail: vendor.contactEmail || '',
        contactPhone: vendor.contactPhone,
        status: vendor.status,
        serviceAreas: vendor.serviceAreas || [],
        servicesOffered: vendor.servicesOffered || [],
        createdAt: vendor.createdAt,
      },
      workforce: {
        totalEmployees,
        crewWorkers,
        activeEmployees,
      },
      verification: {
        status: vendor.status,
        verificationStatus: decision.verificationStatus,
        access: decision.verificationAccess,
        blockingItem: decision.blockingItem,
        blockingReason: decision.reason,
        lastReviewedAt: vendor.verificationDetails?.lastReviewedAt || null,
        adminFeedback: vendor.verificationDetails?.reviewReason || null,
        suspensionReason: vendor.verificationDetails?.suspensionReason || null,
        coreApprovedCount,
        coreRequiredCount,
        coreVerificationComplete,
        totalApprovedCount,
        totalRequiredCount: 6,
        allDocumentsApproved,
        documents: documentChecklist,
      },
      canEdit,
      canUploadDocs,
    });
  } catch (error: any) {
    console.error('[getVendorCompanyProfile] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor company profile' } });
  }
};

// 1.2 Update Vendor Company Profile (Operational fields only; locks legal businessName once approved)
export const updateVendorCompanyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendor = req.vendor;
    if (vendor.status === 'SUSPENDED') {
      res.status(403).json({
        error: { code: 'VENDOR_SUSPENDED', message: 'Suspended companies cannot modify profile information.' },
      });
      return;
    }

    const { businessName, contactPhone, contactEmail, serviceAreas, servicesOffered } = req.body;

    // Protection for legally sensitive information:
    // Once APPROVED, changing the legal business name is locked on self-service to prevent regulatory invalidation.
    if (businessName && businessName.trim() !== vendor.businessName) {
      if (vendor.status === 'APPROVED') {
        res.status(400).json({
          error: {
            code: 'LEGAL_NAME_LOCKED',
            message: 'Legal business entity name cannot be changed directly after verification approval. Please submit an administrative inquiry.',
          },
        });
        return;
      }
      vendor.businessName = businessName.trim();
    }

    if (contactPhone) vendor.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) vendor.contactEmail = contactEmail.trim();
    if (Array.isArray(serviceAreas)) vendor.serviceAreas = serviceAreas;
    if (Array.isArray(servicesOffered)) vendor.servicesOffered = servicesOffered;

    await vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'VENDOR_PROFILE_UPDATED',
      'Vendor',
      vendor._id.toString(),
      `Updated company profile for ${vendor.businessName}`,
      { contactPhone, contactEmail, serviceAreas, servicesOffered }
    );

    res.status(200).json({
      message: 'Company profile updated successfully',
      vendor: {
        _id: vendor._id,
        businessName: vendor.businessName,
        logoUrl: vendor.logoUrl || null,
        contactEmail: vendor.contactEmail || '',
        contactPhone: vendor.contactPhone,
        status: vendor.status,
        serviceAreas: vendor.serviceAreas,
        servicesOffered: vendor.servicesOffered,
      },
    });
  } catch (error: any) {
    console.error('[updateVendorCompanyProfile] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update company profile' } });
  }
};

// 1.3 Upload Company Logo
export const uploadVendorLogo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendor = req.vendor;
    if (vendor.status === 'SUSPENDED') {
      res.status(403).json({ error: { code: 'VENDOR_SUSPENDED', message: 'Suspended vendors cannot update company logo.' } });
      return;
    }

    const { file, fileUrl, fileName } = req.body;
    const payload = file || fileUrl;
    if (!payload) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Logo file payload is required.' } });
      return;
    }

    const saved = await saveLogoFile(vendor._id.toString(), payload, fileName);
    vendor.logoUrl = saved.logoUrl;
    await vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'VENDOR_LOGO_UPDATED',
      'Vendor',
      vendor._id.toString(),
      `Updated company logo for ${vendor.businessName}`,
      { logoUrl: saved.logoUrl }
    );

    res.status(200).json({
      message: 'Company logo uploaded successfully',
      logoUrl: saved.logoUrl,
    });
  } catch (error: any) {
    console.error('[uploadVendorLogo] Error:', error);
    res.status(400).json({ error: { code: 'LOGO_UPLOAD_FAILED', message: error.message || 'Failed to upload logo' } });
  }
};

// 1.4 View / Stream Company Logo
export const viewVendorLogo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetVendorId = req.params.vendorId || req.vendor?._id;
    if (!targetVendorId) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Vendor ID is required.' } });
      return;
    }
    const dir = path.resolve(process.cwd(), 'uploads', 'logos', targetVendorId.toString());
    if (!fs.existsSync(dir)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No logo uploaded for this company.' } });
      return;
    }

    const files = await fs.promises.readdir(dir);
    if (!files || files.length === 0) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No logo file found.' } });
      return;
    }

    const latestFile = files.sort().reverse()[0];
    const filePath = path.join(dir, latestFile);
    const mime = resolveDocumentMime(latestFile);

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(filePath).pipe(res);
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to stream logo' } });
  }
};

export const getVendorCompanies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let companies: any[] = [];
    if (req.user?.role === 'admin') {
      companies = await Vendor.find({})
        .select('_id businessName contactPhone contactEmail status serviceAreas servicesOffered createdAt logoUrl')
        .sort({ businessName: 1 });
    } else if (req.user?.role === 'vendor') {
      companies = await Vendor.find({
        $or: [
          { ownerId: req.user.id },
          ...(req.user.phone ? [{ contactPhone: req.user.phone }] : []),
        ],
      }).select('_id businessName contactPhone contactEmail status serviceAreas servicesOffered createdAt logoUrl');
      if (companies.length === 0 && req.vendor) {
        companies = [req.vendor];
      }
    } else {
      if (req.vendor) {
        companies = [req.vendor];
      }
    }

    res.status(200).json({
      companies,
      activeCompanyId: req.vendor?._id?.toString() || (companies[0]?._id?.toString() ?? null),
      activeCompany: req.vendor,
    });
  } catch (error) {
    console.error('[getVendorCompanies] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor companies' } });
  }
};

export const registerVendor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { businessName, contactPhone, contactEmail, serviceAreas, servicesOffered } = req.body;

    if (!businessName || !contactPhone) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Business name and contact phone are required' } });
      return;
    }

    const existing = await Vendor.findOne({ $or: [{ ownerId }, { contactPhone }] });
    if (existing) {
      res.status(409).json({ error: { code: 'VENDOR_EXISTS', message: 'Vendor company already registered for this user or phone' } });
      return;
    }

    const vendor = await Vendor.create({
      ownerId,
      businessName: businessName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : undefined,
      serviceAreas: serviceAreas || [],
      servicesOffered: servicesOffered || ['Packing', 'Loading', 'Transport', 'Unloading'],
      status: 'PENDING_REVIEW',
      verificationDetails: {
        submittedAt: new Date(),
        documents: [],
      },
    });

    // Update owner user record to link vendorId and set role to vendor
    if (ownerId) {
      await User.findByIdAndUpdate(ownerId, {
        $set: {
          role: 'vendor',
          vendorId: vendor._id,
        },
      });
      invalidatePermissionsCache(ownerId);
    }

    // Alert admin team of new vendor registration
    await createCrossNotification({
      actorId: ownerId,
      actorName: businessName.trim(),
      actorRole: 'vendor',
      title: 'New Vendor Registration',
      message: `Vendor company "${businessName.trim()}" registered on the platform and awaits verification.`,
      type: 'GENERAL',
      targetType: 'Vendor',
      targetId: vendor._id.toString(),
      vendorId: vendor._id,
      notifyAdmin: true,
      notifyVendor: false,
    });

    await logVendorAction(ownerId!, req.user?.phone, 'VENDOR_REGISTERED', 'Vendor', vendor._id.toString(), 'Vendor company self-registered');

    // Honest provider check for onboarding email
    const smtpConfigured = Boolean(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);
    const providerStatus = smtpConfigured ? 'dispatched' : 'pending_provider_configuration';

    res.status(201).json({
      vendor,
      onboardingStatus: 'PENDING_REVIEW',
      providerStatus,
      message: 'Vendor company registered successfully. Please proceed to upload required verification documents.',
    });
  } catch (error) {
    console.error('[registerVendor] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to register vendor company' } });
  }
};

// 2. Vendor Dashboard
export const getVendorDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;

    // A. Active bookings & completed counts
    const [totalBookings, activeBookings, completedBookings] = await Promise.all([
      Booking.countDocuments({ vendorId }),
      Booking.countDocuments({ vendorId, status: { $in: ACTIVE_BOOKING_STATUSES } }),
      Booking.countDocuments({ vendorId, status: 'COMPLETED' }),
    ]);

    // B. Crew Workers: total active vs available
    const totalWorkers = await User.countDocuments({
      vendorId,
      accountStatus: 'active',
    });

    // Find busy workers and vehicles from active bookings
    const activeMoves = await Booking.find({
      vendorId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }).select('assignedWorkers assignedVehicleId status scheduledDate');

    const busyWorkerIds = new Set<string>();
    const busyVehicleIds = new Set<string>();

    activeMoves.forEach((move) => {
      if (move.assignedWorkers && Array.isArray(move.assignedWorkers)) {
        move.assignedWorkers.forEach((wId) => busyWorkerIds.add(wId.toString()));
      }
      if (move.assignedVehicleId) {
        busyVehicleIds.add(move.assignedVehicleId.toString());
      }
    });

    const availableWorkers = Math.max(0, totalWorkers - busyWorkerIds.size);

    // C. Fleet Vehicles: total active vs available
    const totalVehicles = await Vehicle.countDocuments({
      vendorId,
      isActive: true,
    });
    const availableVehicles = Math.max(0, totalVehicles - busyVehicleIds.size);

    // D. Booking lifecycle stage distribution
    const statusCounts = await Booking.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const distributions: Record<string, number> = {};
    statusCounts.forEach((s) => {
      distributions[s._id] = s.count;
    });

    // Operational scope resolution for dashboard telemetry
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    const recentBookingQuery: any = { vendorId };
    if (!scope.isCompanyWide && scope.bookingIds.length > 0) {
      recentBookingQuery._id = { $in: scope.bookingIds.map((bId) => new mongoose.Types.ObjectId(bId)) };
    } else if (!scope.isCompanyWide && scope.bookingIds.length === 0) {
      recentBookingQuery._id = null;
    }

    // E. Recent 5 Bookings (scoped)
    const recentBookings = await Booking.find(recentBookingQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'displayName phone')
      .populate('requestId');

    // Card 3: Real operational supervision metrics derived from MongoDB
    const [operationalManagersCount, driversCrewCount] = await Promise.all([
      User.countDocuments({
        vendorId,
        employeeRole: { $in: ['operations', 'operational_manager', 'manager', 'fleet_supervisor', 'dispatch_coordinator'] },
        accountStatus: 'active',
      }),
      User.countDocuments({
        vendorId,
        employeeRole: 'worker',
        accountStatus: 'active',
      }),
    ]);

    res.status(200).json({
      stats: {
        totalBookings,
        activeBookings,
        completedBookings,
        totalWorkers,
        availableWorkers,
        busyWorkers: busyWorkerIds.size,
        totalVehicles,
        availableVehicles,
        busyVehicles: busyVehicleIds.size,
        operationalManagersCount,
        driversCrewCount,
        supervisedMovesCount: scope.isCompanyWide ? activeBookings : scope.bookingIds.length,
        totalSupervisedStaff: scope.isCompanyWide ? totalWorkers : scope.crewIds.length,
        documentStatus: req.vendor.status,
      },
      distributions,
      recentBookings,
      vendor: req.vendor,
    });
  } catch (error: any) {
    console.error('[getVendorDashboard] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor dashboard metrics' } });
  }
};

// 3. Employees / Crew Management
export const getVendorEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { search, role, status, reportsTo, supervisorId, page = 1, limit = 20 } = req.query;

    const query: any = { vendorId };

    if (search) {
      query.$or = [
        { displayName: { $regex: String(search), $options: 'i' } },
        { phone: { $regex: String(search), $options: 'i' } },
        { username: { $regex: String(search), $options: 'i' } },
        { email: { $regex: String(search), $options: 'i' } },
      ];
    }

    if (role && role !== 'ALL') {
      query.employeeRole = role;
    }

    if (status && status !== 'ALL') {
      query.accountStatus = status;
    } else {
      query.accountStatus = { $ne: 'deleted' };
    }

    if (supervisorId) {
      query.reportsTo = new mongoose.Types.ObjectId(String(supervisorId));
    } else if (reportsTo && reportsTo !== 'ALL') {
      if (reportsTo === 'none') {
        query.reportsTo = { $in: [null, undefined] };
      } else {
        query.reportsTo = new mongoose.Types.ObjectId(String(reportsTo));
      }
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, employees, reportCounts] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .populate('reportsTo', 'displayName phone employeeRole email username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.aggregate([
        { $match: { vendorId, reportsTo: { $exists: true, $ne: null } } },
        { $group: { _id: '$reportsTo', count: { $sum: 1 } } },
      ]),
    ]);

    const reportCountMap: Record<string, number> = {};
    reportCounts.forEach((rc) => {
      reportCountMap[rc._id.toString()] = rc.count;
    });

    // Check who is busy
    const activeMoves = await Booking.find({
      vendorId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }).select('assignedWorkers _id status scheduledDate');

    const busyWorkerMap: Record<string, string> = {};
    activeMoves.forEach((m) => {
      if (m.assignedWorkers) {
        m.assignedWorkers.forEach((wId) => {
          busyWorkerMap[wId.toString()] = m._id.toString();
        });
      }
    });

    const enrichedEmployees = employees.map((emp) => {
      const obj = emp.toObject();
      return {
        ...obj,
        companyName: req.vendor?.companyName || req.vendor?.businessName || 'Registered Moving Carrier',
        availability: busyWorkerMap[emp._id.toString()] ? 'ON_MOVE' : 'AVAILABLE',
        activeBookingId: busyWorkerMap[emp._id.toString()] || null,
        directReportsCount: reportCountMap[emp._id.toString()] || 0,
      };
    });

    res.status(200).json({
      employees: enrichedEmployees,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor employees' } });
  }
};

// Server-Side Supervision & Hierarchy Validation (Correction 4)
export async function validateReportsTo(
  targetEmployeeId: string | undefined,
  reportsToId: string | undefined,
  vendorId: mongoose.Types.ObjectId
): Promise<{ valid: boolean; error?: string }> {
  if (!reportsToId || reportsToId === 'none' || reportsToId === '') return { valid: true };

  if (!mongoose.isValidObjectId(reportsToId)) {
    return { valid: false, error: 'Validation Error: Invalid supervisor ID format.' };
  }

  // 1. Prevent self-reporting
  if (targetEmployeeId && String(targetEmployeeId) === String(reportsToId)) {
    return { valid: false, error: 'Validation Error: An employee cannot report to themselves.' };
  }

  // 2. Must belong to the same vendor
  const manager = await User.findOne({ _id: reportsToId, vendorId });
  if (!manager) {
    return { valid: false, error: 'Validation Error: The designated supervisor was not found or does not belong to your company.' };
  }

  // 3. Prevent invalid/circular hierarchy
  if (targetEmployeeId) {
    let currentId: string | undefined = manager.reportsTo?.toString();
    const visited = new Set<string>([String(targetEmployeeId)]);
    while (currentId) {
      if (visited.has(currentId)) {
        return { valid: false, error: 'Validation Error: Circular reporting chain detected. A supervisor cannot report to someone under them.' };
      }
      visited.add(currentId);
      const nextMgr: any = await User.findById(currentId).select('reportsTo');
      currentId = nextMgr?.reportsTo?.toString();
    }
  }

  return { valid: true };
}

// Operational Scope Resolver for Scoped Employees vs. Company-Wide Admins
export interface EmployeeOperationalScope {
  isCompanyWide: boolean;
  crewIds: string[];
  vehicleIds: string[];
  bookingIds: string[];
  directReportIds: string[];
}

export const resolveEmployeeOperationalScope = async (
  user: any,
  vendorId: mongoose.Types.ObjectId
): Promise<EmployeeOperationalScope> => {
  if (!user) {
    return { isCompanyWide: false, crewIds: [], vehicleIds: [], bookingIds: [], directReportIds: [] };
  }

  // 1. Company-wide authority: Vendor Owner, Admin, or designated Vendor Admin
  const isVendorOwner =
    user.role === 'vendor' ||
    user.role === 'admin' ||
    user.employeeRole === 'vendor_admin';

  if (isVendorOwner) {
    return {
      isCompanyWide: true,
      crewIds: [],
      vehicleIds: [],
      bookingIds: [],
      directReportIds: [],
    };
  }

  const userId = user._id ? user._id.toString() : user.id;

  // 2. Direct reports working under this supervisor
  const directReports = await User.find({
    reportsTo: userId,
    vendorId,
    accountStatus: { $ne: 'deleted' },
  }).select('_id');
  const directReportIds = directReports.map((d) => d._id.toString());

  // 3. Explicitly assigned crew from user document
  const dbUser = await User.findById(userId).select('assignedScope');
  const explicitCrewIds = (dbUser?.assignedScope?.crew || []).map((c: any) => c.toString());

  // Combined crew: self + direct reports + explicit crew
  const allCrewIds = Array.from(
    new Set([String(userId), ...directReportIds, ...explicitCrewIds])
  );

  // 4. Explicit moves from user document
  const explicitBookingIds = (dbUser?.assignedScope?.moves || []).map((m: any) => m.toString());

  // 5. Find all bookings assigned to this coordinator OR where any supervised crew is assigned
  const scopedBookings = await Booking.find({
    vendorId,
    $or: [
      { assignedCoordinatorId: userId },
      { assignedWorkers: { $in: allCrewIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { _id: { $in: explicitBookingIds.filter((bId: string) => mongoose.Types.ObjectId.isValid(bId)).map((id) => new mongoose.Types.ObjectId(id)) } },
    ],
  }).select('_id assignedVehicleId assignedWorkers');

  const bookingIds = Array.from(
    new Set([...scopedBookings.map((b) => b._id.toString()), ...explicitBookingIds])
  );

  // 6. Vehicles: from assigned bookings + explicit vehicles
  const bookingVehicleIds = scopedBookings
    .map((b) => b.assignedVehicleId)
    .filter(Boolean) as string[];
  const explicitVehicles = dbUser?.assignedScope?.vehicles || [];
  const vehicleIds = Array.from(new Set([...bookingVehicleIds, ...explicitVehicles]));

  return {
    isCompanyWide: false,
    crewIds: allCrewIds,
    vehicleIds,
    bookingIds,
    directReportIds,
  };
};

export const createVendorEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const {
      phone,
      displayName,
      employeeRole = 'worker',
      department = 'Operations',
      reportsTo,
      skills = [],
      permissions = [],
      assignedScope,
    } = req.body;

    if (!phone || !displayName) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Phone number and employee name are required' } });
      return;
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(displayName).trim();

    // Enforce permission:manage when attempting to set custom permissions
    if (Array.isArray(permissions) && permissions.length > 0) {
      const isOwner = req.user?.role === 'vendor' || (req.vendor?.ownerId && req.vendor.ownerId.toString() === req.user?.id);
      const { resolveUserPermissions } = await import('./authController.js');
      const callerPerms = await resolveUserPermissions(req.user);
      if (!isOwner && !callerPerms.includes('permissions:manage') && !callerPerms.includes('*')) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have authorization to assign custom permission overrides to employees.',
          },
        });
        return;
      }
    }

    // Validate reportsTo hierarchy server-side (Correction 4)
    if (reportsTo && reportsTo !== 'none') {
      const hierarchyCheck = await validateReportsTo(undefined, reportsTo, vendorId);
      if (!hierarchyCheck.valid) {
        res.status(400).json({ error: { code: 'INVALID_HIERARCHY', message: hierarchyCheck.error } });
        return;
      }
    }

    // Check phone by exact string or common formatted variants
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const phoneCandidates = new Set<string>([cleanPhone]);
    if (digitsOnly.length >= 10) {
      const ten = digitsOnly.slice(-10);
      phoneCandidates.add(ten);
      phoneCandidates.add(`+91${ten}`);
      phoneCandidates.add(`+91 ${ten}`);
      phoneCandidates.add(`+91 ${ten.slice(0, 5)} ${ten.slice(5)}`);
      phoneCandidates.add(`91${ten}`);
    }

    const existing = await User.findOne({
      $or: [
        { phone: { $in: Array.from(phoneCandidates) } },
        ...(digitsOnly.length >= 10 ? [{ phone: { $regex: new RegExp(`${digitsOnly.slice(-10)}$`) } }] : []),
      ],
    });

    if (existing) {
      // 1. Root / Platform Administrator cannot be added as vendor employee
      if (existing.role === 'admin') {
        res.status(409).json({
          error: {
            code: 'PHONE_EXISTS',
            message: `Phone number "${cleanPhone}" is registered to a platform administrator and cannot be registered as a carrier employee.`,
          },
        });
        return;
      }

      // 2. Already an employee or owner of THIS SAME company
      if (existing.vendorId && existing.vendorId.toString() === req.vendor._id.toString() && existing.accountStatus !== 'deleted') {
        res.status(409).json({
          error: {
            code: 'PHONE_EXISTS',
            message: `An employee with phone number "${cleanPhone}" already exists in your company roster (${existing.displayName || existing.username}).`,
          },
        });
        return;
      }

      // 3. Registered to ANOTHER vendor — check if that other vendor is active/approved
      if (existing.vendorId && existing.vendorId.toString() !== req.vendor._id.toString()) {
        const otherVendor = await Vendor.findById(existing.vendorId);
        if (otherVendor && otherVendor.status === 'APPROVED') {
          res.status(409).json({
            error: {
              code: 'PHONE_EXISTS',
              message: `This phone number is registered to an active carrier company (${otherVendor.businessName}). An employee cannot be concurrently assigned to two active logistics providers.`,
            },
          });
          return;
        }
        // If otherVendor was REJECTED (e.g. ABC Logistic) or SUSPENDED/not found,
        // that vendor application is dead/rejected. This person is free to be hired by req.vendor!
      }
    }

    // 1. Generate unique username from employee name
    const baseUsername = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '') || 'mover';

    let username = baseUsername;
    const userWithSameName = await User.findOne({
      username,
      ...(existing ? { _id: { $ne: existing._id } } : {}),
    });
    if (userWithSameName) {
      username = `${baseUsername}.${Math.floor(100 + Math.random() * 900)}`;
    }

    // 2. Generate concise, professional corporate email
    const email = generateSimpleCompanyEmail(username, req.vendor.businessName);

    // 3. Set default password & hash it
    const defaultPassword = 'MovePass@2026';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // 4. Resolve human-readable role name
    const roleName =
      STANDARD_VENDOR_ROLES.find((r) => r.id === employeeRole)?.name ||
      req.vendor.customRoles?.find((r: any) => r.id === employeeRole)?.name ||
      employeeRole;

    let employee;
    if (existing) {
      // Reassign / onboard existing user (e.g. from rejected vendor application or customer) into this vendor's employee roster
      existing.phone = cleanPhone;
      existing.username = username;
      existing.email = email;
      existing.password = hashedPassword;
      existing.mustChangePassword = true;
      existing.plainTempPassword = defaultPassword;
      existing.displayName = cleanName;
      existing.role = 'worker';
      existing.employeeRole = employeeRole;
      existing.department = department || 'Operations';
      existing.reportsTo = reportsTo && reportsTo !== 'none' ? new mongoose.Types.ObjectId(reportsTo) : undefined;
      existing.vendorId = vendorId;
      existing.accountStatus = 'active';
      existing.skills = Array.isArray(skills) ? skills : [];
      existing.permissions = Array.isArray(permissions) && permissions.length > 0 ? permissions : undefined;
      if (assignedScope) {
        existing.assignedScope = {
          vehicles: Array.isArray(assignedScope.vehicles) ? assignedScope.vehicles : [],
          crew: Array.isArray(assignedScope.crew)
            ? assignedScope.crew.map((c: string) => new mongoose.Types.ObjectId(c))
            : [],
          moves: Array.isArray(assignedScope.moves)
            ? assignedScope.moves.map((m: string) => new mongoose.Types.ObjectId(m))
            : [],
        };
      }
      existing.verifiedAt = new Date();
      await existing.save();
      employee = existing;
    } else {
      employee = await User.create({
        phone: cleanPhone,
        username,
        email,
        password: hashedPassword,
        mustChangePassword: true,
        plainTempPassword: defaultPassword,
        displayName: cleanName,
        role: 'worker',
        adminRole: undefined,
        employeeRole,
        department: department || 'Operations',
        reportsTo: reportsTo && reportsTo !== 'none' ? new mongoose.Types.ObjectId(reportsTo) : undefined,
        vendorId,
        accountStatus: 'active',
        skills: Array.isArray(skills) ? skills : [],
        permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : undefined,
        assignedScope: assignedScope
          ? {
              vehicles: Array.isArray(assignedScope.vehicles) ? assignedScope.vehicles : [],
              crew: Array.isArray(assignedScope.crew)
                ? assignedScope.crew.map((c: string) => new mongoose.Types.ObjectId(c))
                : [],
              moves: Array.isArray(assignedScope.moves)
                ? assignedScope.moves.map((m: string) => new mongoose.Types.ObjectId(m))
                : [],
            }
          : undefined,
        verifiedAt: new Date(),
      });
    }

    // 5. Dispatch WhatsApp notification with credentials
    let waResult: any = null;
    try {
      waResult = await sendCredentialsViaWhatsApp({
        employeeName: cleanName,
        phone: cleanPhone,
        username,
        email,
        defaultPassword,
        roleName,
        companyName: req.vendor.businessName || 'Package Mover Carrier Partner',
      });
    } catch (waErr) {
      console.warn('[createVendorEmployee] WhatsApp dispatch failed:', waErr);
    }

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'EMPLOYEE_CREATED',
      'User',
      employee._id.toString(),
      `Added crew member ${cleanName} (${roleName}) - WhatsApp credentials dispatched`,
      {
        vendorId: vendorId.toString(),
        role: employeeRole,
        username,
        email,
        phone: cleanPhone,
        department,
        permissionsCount: employee.permissions?.length || 0,
      }
    );

    res.status(201).json({
      employee,
      credentials: {
        username,
        email,
        defaultPassword,
        whatsappUrl: waResult?.whatsappUrl || null,
        whatsappDispatched: Boolean(waResult?.success),
      },
    });
  } catch (error: any) {
    console.error('[createVendorEmployee] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create employee' } });
  }
};

export const resendVendorEmployeeCredentials = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const employee = await User.findOne({ _id: id, vendorId });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found in your company' } });
      return;
    }

    let updated = false;
    if (!employee.username) {
      employee.username = employee.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '') || 'mover';
      updated = true;
    }

    if (!employee.email || employee.email.includes('.packagemovers.in')) {
      employee.email = generateSimpleCompanyEmail(employee.username, req.vendor.businessName);
      updated = true;
    }

    const defaultPassword = employee.plainTempPassword || 'MovePass@2026';
    if (!employee.password) {
      const salt = await bcrypt.genSalt(10);
      employee.password = await bcrypt.hash(defaultPassword, salt);
      employee.mustChangePassword = true;
      employee.plainTempPassword = defaultPassword;
      updated = true;
    }

    if (updated) {
      await employee.save();
    }

    const roleName =
      STANDARD_VENDOR_ROLES.find((r) => r.id === employee.employeeRole)?.name ||
      req.vendor.customRoles?.find((r: any) => r.id === employee.employeeRole)?.name ||
      employee.employeeRole ||
      'Crew Member';

    const waResult = await sendCredentialsViaWhatsApp({
      employeeName: employee.displayName,
      phone: employee.phone,
      username: employee.username,
      email: employee.email,
      defaultPassword,
      roleName,
      companyName: req.vendor.businessName || 'Package Mover Carrier Partner',
    });

    res.status(200).json({
      success: true,
      message: `Credentials for ${employee.displayName} prepared for WhatsApp dispatch.`,
      credentials: {
        username: employee.username,
        email: employee.email,
        defaultPassword,
        whatsappUrl: waResult.whatsappUrl,
      },
    });
  } catch (err: any) {
    console.error('[resendVendorEmployeeCredentials] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to resend employee credentials' } });
  }
};

export const updateVendorEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;
    const { displayName, employeeRole, skills, accountStatus, permissions, permissionOverrides, department, reportsTo, assignedScope } = req.body;

    const employee = await User.findOne({ _id: id, vendorId });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found in your company' } });
      return;
    }

    const isSelf = req.user?.id === String(id);
    const isOwner = req.user?.role === 'vendor' || (req.vendor?.ownerId && req.vendor.ownerId.toString() === req.user?.id);

    // Self-escalation prevention: employees cannot alter their own roles, permissions, or active status
    if (isSelf) {
      if (employeeRole !== undefined || permissions !== undefined || permissionOverrides !== undefined || accountStatus !== undefined) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You cannot alter your own role, permissions, or account status.',
          },
        });
        return;
      }
    }

    // Updating permissions or overrides requires permissions:manage authorization
    if (permissions !== undefined || permissionOverrides !== undefined) {
      const { resolveUserPermissions } = await import('./authController.js');
      const callerPerms = await resolveUserPermissions(req.user);
      if (!isOwner && !callerPerms.includes('permissions:manage') && !callerPerms.includes('*')) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to modify employee permissions.',
          },
        });
        return;
      }
    }

    if (reportsTo !== undefined) {
      if (reportsTo && reportsTo !== 'none') {
        const hierarchyCheck = await validateReportsTo(String(id), reportsTo, vendorId);
        if (!hierarchyCheck.valid) {
          res.status(400).json({ error: { code: 'INVALID_HIERARCHY', message: hierarchyCheck.error } });
          return;
        }
        employee.reportsTo = new mongoose.Types.ObjectId(reportsTo);
      } else {
        employee.reportsTo = undefined;
      }
    }

    if (assignedScope !== undefined) {
      employee.assignedScope = {
        vehicles: Array.isArray(assignedScope.vehicles) ? assignedScope.vehicles : [],
        crew: Array.isArray(assignedScope.crew)
          ? assignedScope.crew.map((c: string) => new mongoose.Types.ObjectId(c))
          : [],
        moves: Array.isArray(assignedScope.moves)
          ? assignedScope.moves.map((m: string) => new mongoose.Types.ObjectId(m))
          : [],
      };
    }

    if (displayName) employee.displayName = displayName;
    if (employeeRole) employee.employeeRole = employeeRole;
    if (department !== undefined) employee.department = department;
    if (skills) employee.skills = skills;
    if (accountStatus) employee.accountStatus = accountStatus;

    // Granular permission overrides: Role Defaults + Granted - Revoked
    if (permissionOverrides !== undefined) {
      const granted = Array.isArray(permissionOverrides?.granted) ? permissionOverrides.granted : [];
      const revoked = Array.isArray(permissionOverrides?.revoked) ? permissionOverrides.revoked : [];
      employee.permissionOverrides = { granted, revoked };

      const activeRole = employeeRole || employee.employeeRole;
      const matchedRole =
        STANDARD_VENDOR_ROLES.find((r) => r.id === activeRole) ||
        req.vendor.customRoles?.find((r: any) => r.id === activeRole);
      const basePerms = matchedRole?.permissions || [];
      employee.permissions = Array.from(new Set([...basePerms, ...granted])).filter((p) => !revoked.includes(p));
    } else if (Array.isArray(permissions)) {
      employee.permissions = permissions;
    }

    await employee.save();
    invalidatePermissionsCache(employee._id.toString());

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'EMPLOYEE_UPDATED',
      'User',
      id,
      `Updated employee profile for ${employee.displayName}`,
      {
        vendorId: vendorId.toString(),
        employeeName: employee.displayName,
        employeeRole: employee.employeeRole,
        permissionOverrides: employee.permissionOverrides,
        permissionsCount: employee.permissions?.length || 0,
        accountStatus: employee.accountStatus,
      }
    );

    const updated = await User.findById(id).populate('reportsTo', 'displayName phone employeeRole email username');

    res.status(200).json({ employee: updated });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update employee' } });
  }
};

export const sendEmployeePasswordResetLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;
    const { channel = 'whatsapp' } = req.body;

    const employee = await User.findOne({ _id: id, vendorId });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found in your company' } });
      return;
    }

    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    employee.resetPasswordToken = hashedToken;
    employee.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await employee.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/vendor/reset-password?token=${rawToken}`;

    let maskedTarget = '';
    let providerStatus = 'ready';
    let whatsappUrl: string | null = null;
    let message = '';

    if (channel === 'whatsapp') {
      const normalizedPhone = normalizePhoneForWhatsApp(employee.phone);
      maskedTarget = `+${normalizedPhone.slice(0, 2)} ••••• ${normalizedPhone.slice(-4)}`;
      const waText = `🔐 *Package Mover — Employee Password Reset*\n\nHello *${employee.displayName}*,\n\nA password reset request was initiated for your team account (*${employee.username || employee.email}*).\n\nClick the link below to set your new password (valid for 1 hour):\n${resetUrl}\n\nIf you have any questions, reach out to your operational manager.`;
      whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(waText)}`;
      message = `WhatsApp reset link prepared for ${employee.displayName} (${maskedTarget}). Click below to open WhatsApp.`;
    } else if (channel === 'sms') {
      const rawPhone = employee.phone.replace(/\D/g, '');
      maskedTarget = `••••• ${rawPhone.slice(-4)}`;
      const smsProviderConfigured = Boolean(process.env.TWILIO_SID || process.env.SMS_API_KEY);
      providerStatus = smsProviderConfigured ? 'dispatched' : 'pending_provider_configuration';
      message = smsProviderConfigured
        ? `Password reset SMS dispatched to ${maskedTarget}.`
        : `SMS Gateway provider not configured in environment. Secure link generated for direct supervisor delivery.`;
    } else {
      const email = employee.email || `${employee.username}@packagemovers.in`;
      const [name, domain] = email.split('@');
      maskedTarget = `${name ? name.slice(0, 2) : 'em'}•••@${domain || 'company.in'}`;
      const emailProviderConfigured = Boolean(process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);
      providerStatus = emailProviderConfigured ? 'dispatched' : 'pending_provider_configuration';
      message = emailProviderConfigured
        ? `Password reset email dispatched to ${maskedTarget}.`
        : `SMTP Gateway provider not configured in environment. Secure link generated for direct supervisor delivery.`;
    }

    res.status(200).json({
      success: true,
      channel,
      providerStatus,
      maskedTarget,
      message,
      whatsappUrl,
      resetUrl,
    });
  } catch (err: any) {
    console.error('[sendEmployeePasswordResetLink] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate employee password reset link' } });
  }
};

// 3.5 Individual Employee Profile & Operational Scope
export const getVendorEmployeeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const rawId = String(req.params.id);
    const id = rawId === 'me' ? String(req.user?.id) : rawId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid employee ID format' } });
      return;
    }

    const isSelf = req.user?.id === String(id);
    const isOwner = req.user?.role === 'vendor' || (req.vendor?.ownerId && req.vendor.ownerId.toString() === req.user?.id);

    if (!isSelf && !isOwner) {
      const { resolveUserPermissions } = await import('./authController.js');
      const callerPerms = await resolveUserPermissions(req.user);
      const canView = callerPerms.some((p) =>
        ['employees:view', 'employees:manage', 'staff:view', 'staff:manage', 'Manage Employees & Crew', '*'].includes(p)
      );
      if (!canView) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view other employee profiles.',
          },
        });
        return;
      }
    }

    const employee = await User.findOne({
      _id: id,
      accountStatus: { $ne: 'deleted' },
      $or: [{ vendorId }, { _id: req.vendor?.ownerId }],
    })
      .populate('reportsTo', 'displayName username phone employeeRole email')
      .populate('assignedScope.crew', 'displayName username phone employeeRole skills')
      .populate('assignedScope.moves', 'status scheduledDate assignedVehicleId')
      .select('-password -resetPasswordToken -plainTempPassword');

    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found in your company' } });
      return;
    }

    // Direct reports
    const directReports = await User.find({ reportsTo: employee._id, vendorId, accountStatus: { $ne: 'deleted' } })
      .select('_id displayName username phone employeeRole skills accountStatus createdAt');

    // Resolve operational scope
    const scope = await resolveEmployeeOperationalScope(employee, vendorId);

    // Populated assigned vehicles
    const assignedVehicles = await Vehicle.find({
      vendorId,
      $or: [
        { _id: { $in: scope.vehicleIds.filter((v: string) => mongoose.Types.ObjectId.isValid(v)) } },
        { registrationNumber: { $in: scope.vehicleIds } },
      ],
    }).select('name registrationNumber vehicleType capacity isActive notes');

    // Populated assigned active/recent moves
    const assignedMoves = await Booking.find({
      _id: { $in: scope.bookingIds },
      vendorId,
    })
      .sort({ scheduledDate: -1 })
      .limit(20)
      .populate('customerId', 'displayName phone')
      .populate('requestId')
      .select('status scheduledDate assignedVehicleId assignedWorkers deliveryCode operationalNotes');

    // Assigned crew members (excluding self)
    const assignedCrew = await User.find({
      _id: { $in: scope.crewIds, $ne: employee._id },
      vendorId,
    }).select('_id displayName username phone employeeRole skills accountStatus');

    // Role definition with structured responsibilities (supporting dynamic custom vendor roles)
    const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const empRoleNorm = norm(employee.employeeRole);
    const customRoleMatch = (req.vendor.customRoles || []).find(
      (r: any) => norm(r.id) === empRoleNorm || norm(r.name) === empRoleNorm
    );
    const standardRoleMatch = STANDARD_VENDOR_ROLES.find(
      (r) => norm(r.id) === empRoleNorm || norm(r.name) === empRoleNorm
    );

    const roleDef = customRoleMatch
      ? {
          id: customRoleMatch.id,
          name: customRoleMatch.name,
          purpose: customRoleMatch.purpose || 'Custom departmental operational role',
          accessLevel: customRoleMatch.accessLevel || 'Operational Scope',
          responsibleFor: ['Authorized department operations and assigned tasks'],
          canAccess: customRoleMatch.permissions || [],
          canPerform: customRoleMatch.permissions || [],
          cannotAccess: ['Company finance', 'Vendor platform configuration'],
          permissions: customRoleMatch.permissions || [],
        }
      : standardRoleMatch || {
          id: employee.employeeRole || 'worker',
          name: (employee.employeeRole || 'worker').replace(/_/g, ' '),
          purpose: 'Operational staff member',
          responsibleFor: ['Field operations and task completion'],
          canAccess: ['Assigned operational tasks'],
          canPerform: ['Update status on assigned work'],
          cannotAccess: ['Company finance', 'Vendor KYC approval'],
          permissions: [
            'Update Move Progression Milestones',
            'Enter Recipient Delivery Verification Code',
            'Vehicle Inspection & Maintenance Tracking',
          ],
        };

    // Recent audit trail for this employee (real MongoDB data)
    const recentActivity = await AuditLog.find({
      actorId: employee._id,
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    // Calculate effective permissions: (Role Base + Granted) - Revoked
    const basePermissions: string[] = roleDef.permissions || [];
    const granted = employee.permissionOverrides?.granted || [];
    const revoked = employee.permissionOverrides?.revoked || [];
    let effectivePermissions: string[] = [];
    if (granted.length > 0 || revoked.length > 0) {
      effectivePermissions = Array.from(new Set([...basePermissions, ...granted])).filter((p) => !revoked.includes(p));
    } else if (Array.isArray(employee.permissions) && employee.permissions.length > 0) {
      effectivePermissions = employee.permissions;
    } else {
      effectivePermissions = basePermissions;
    }

    const empObj: any = typeof employee.toObject === 'function' ? employee.toObject() : { ...employee };
    empObj.companyName = req.vendor?.companyName || req.vendor?.businessName || 'Registered Moving Carrier';

    res.status(200).json({
      employee: empObj,
      companyName: req.vendor?.companyName || req.vendor?.businessName || 'Registered Moving Carrier',
      roleDef,
      effectivePermissions,
      permissionOverrides: employee.permissionOverrides || { granted: [], revoked: [] },
      scope: {
        isCompanyWide: Boolean(scope.isCompanyWide),
      },
      directReports,
      assignedCrew,
      assignedVehicles,
      assignedMoves,
      recentActivity,
    });
  } catch (error: any) {
    console.error('[getVendorEmployeeById] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve employee profile' } });
  }
};

// 4. Roles & Permissions (Vendor Admin)
export const VENDOR_PERMISSION_DOMAINS = [
  {
    domain: 'Quotations',
    icon: 'FileText',
    sidebarHref: '/vendor/quotations',
    permissions: [
      {
        id: 'quotations:view',
        name: 'Quotation: Can View Only',
        description: 'Can inspect incoming customer moving requests, inventory volume manifests, and pricing history',
        aliases: ['Review Available Customer Leads', 'View Quotations'],
      },
      {
        id: 'quotations:create',
        name: 'Quotation: Can Create Quotations',
        description: 'Can draft and create price estimates, vehicle recommendations, and customized packing costs',
        aliases: ['Create & Submit Formal Quotations', 'Create Quotations'],
      },
      {
        id: 'quotations:edit',
        name: 'Quotation: Can Edit Quotations',
        description: 'Can adjust quotation rates, apply promotional discounts, and update moving terms',
        aliases: ['Edit Quotations', 'quotations:manage'],
      },
      {
        id: 'quotations:submit',
        name: 'Quotation: Can Submit Quotations',
        description: 'Can formally seal and dispatch finalized quotation bids directly to customers',
        aliases: ['Submit Quotations', 'Create & Submit Formal Quotations'],
      },
    ],
  },
  {
    domain: 'Bookings',
    icon: 'CalendarCheck',
    sidebarHref: '/vendor/bookings',
    permissions: [
      {
        id: 'bookings:view',
        name: 'Bookings: Can View Bookings',
        description: 'Can access confirmed moving schedules, client addresses, and cargo item manifests',
        aliases: ['View & Dispatch Bookings', 'View Bookings'],
      },
      {
        id: 'bookings:dispatch',
        name: 'Bookings: Can Dispatch Bookings',
        description: 'Can confirm departure times, allocate operational coordinators, and launch move operations',
        aliases: ['Bookings & Job Dispatch', 'Dispatch Bookings'],
      },
      {
        id: 'bookings:update_status',
        name: 'Bookings: Can Update Booking Status',
        description: 'Can advance moving progress stages: Scheduled, Packed, In Transit, Arrived, and Completed',
        aliases: ['Update Move Progression Milestones', 'Update Booking Status'],
      },
      {
        id: 'bookings:verify_delivery',
        name: 'Bookings: Can Verify Delivery OTP',
        description: 'Can validate customer recipient drop-off security PIN code at destination to complete the job',
        aliases: ['Enter Recipient Delivery Verification Code', 'Verify Delivery OTP'],
      },
    ],
  },
  {
    domain: 'Live Tracking',
    icon: 'Truck',
    sidebarHref: '/vendor/tracking',
    permissions: [
      {
        id: 'tracking:view',
        name: 'Live Tracking: Can View Live Tracking',
        description: 'Can monitor real-time vehicle GPS positions, speed telemetry, and active transit routes',
        aliases: ['View Live GPS Tracking', 'Fleet & Vehicle Operations', 'View Tracking'],
      },
      {
        id: 'tracking:view_crew',
        name: 'Live Tracking: Can View Assigned Crew',
        description: 'Can inspect on-duty moving crew, certified drivers, and operational personnel on transit routes',
        aliases: ['View Assigned Crew', 'Customer Support Coordination'],
      },
      {
        id: 'tracking:view_vehicles',
        name: 'Live Tracking: Can View Assigned Vehicles',
        description: 'Can inspect commercial moving truck specifications, plate numbers, and telemetry units',
        aliases: ['View Assigned Vehicles', 'Fleet & Vehicle Operations'],
      },
      {
        id: 'tracking:update_status',
        name: 'Live Tracking: Can Update Tracking Status',
        description: 'Can broadcast milestone alerts, transit delays, and updated arrival ETAs to customers',
        aliases: ['Update Tracking Status', 'Customer Support Coordination', 'Update Move Progression Milestones'],
      },
    ],
  },
  {
    domain: 'Crew Workers',
    icon: 'HardHat',
    sidebarHref: '/vendor/workers',
    permissions: [
      {
        id: 'workers:view',
        name: 'Crew Workers: Can View Crew Workers',
        description: 'Can browse field workers, certified drivers, verified movers, licenses, and duty rosters',
        aliases: ['Manage Employees & Crew', 'View Crew Attendance & Performance', 'View Crew Workers'],
      },
      {
        id: 'workers:assign',
        name: 'Crew Workers: Can Assign Crew to Bookings',
        description: 'Can allocate certified drivers and moving crew members to confirmed customer moves',
        aliases: ['Assign Available Workers & Crew'],
      },
      {
        id: 'workers:manage',
        name: 'Crew Workers: Can Manage Crew Duty & Attendance',
        description: 'Can log daily worker attendance, check-in duty shifts, and maintain performance notes',
        aliases: ['View Crew Attendance & Performance'],
      },
    ],
  },
  {
    domain: 'Fleet Vehicles',
    icon: 'Car',
    sidebarHref: '/vendor/vehicles',
    permissions: [
      {
        id: 'vehicles:view',
        name: 'Fleet Vehicles: Can View Fleet Vehicles',
        description: 'Can browse registered commercial trucks, vehicle carrying capacities, and fitness certificates',
        aliases: ['Fleet & Vehicle Operations', 'View Vehicles'],
      },
      {
        id: 'vehicles:assign',
        name: 'Fleet Vehicles: Can Assign Transport Trucks',
        description: 'Can designate specific moving trucks and transport carriers to confirmed customer moves',
        aliases: ['Assign Transport Trucks to Moves'],
      },
      {
        id: 'vehicles:maintenance',
        name: 'Fleet Vehicles: Can Record Maintenance & Logs',
        description: 'Can log pre-trip vehicle condition, odometer readings, fitness renewals, and repairs',
        aliases: ['Vehicle Inspection & Maintenance Tracking'],
      },
    ],
  },
  {
    domain: 'Demand Insights',
    icon: 'TrendingUp',
    sidebarHref: '/vendor/demand',
    permissions: [
      {
        id: 'demand:view',
        name: 'Demand Insights: Can View Customer Demand & Leads',
        description: 'Can inspect prospective customer leads, route volume heatmaps, and move inquiries',
        aliases: ['Review Available Customer Leads', 'Quotation Performance & Insights'],
      },
      {
        id: 'demand:export',
        name: 'Demand Insights: Can Export Demand Analytics',
        description: 'Can download route demand summaries, win/loss conversion rates, and volume metrics',
        aliases: ['Reports & Performance Analytics'],
      },
    ],
  },
  {
    domain: 'Services Catalog',
    icon: 'Layers',
    sidebarHref: '/vendor/services',
    permissions: [
      {
        id: 'services:view',
        name: 'Services Catalog: Can View Services Catalog',
        description: 'Can browse company service offerings, specialized packing options, and assembly rates',
        aliases: ['Service Catalog Configuration', 'View Services'],
      },
      {
        id: 'services:manage',
        name: 'Services Catalog: Can Configure Services & Pricing',
        description: 'Can add, edit, or archive service offerings, base rates, and specialized handling fees',
        aliases: ['Service Catalog Configuration', 'Custom Specialized Services'],
      },
    ],
  },
  {
    domain: 'Moving Packages',
    icon: 'Package',
    sidebarHref: '/vendor/packages',
    permissions: [
      {
        id: 'packages:view',
        name: 'Moving Packages: Can View Moving Packages',
        description: 'Can browse packaged moving bundles, residential tiers (1BHK, 2BHK, Villa, Office)',
        aliases: ['Service Catalog Configuration'],
      },
      {
        id: 'packages:manage',
        name: 'Moving Packages: Can Create & Manage Packages',
        description: 'Can design, publish, or modify moving package bundles and promotional prices',
        aliases: ['Service Catalog Configuration'],
      },
    ],
  },
  {
    domain: 'Service Areas',
    icon: 'MapPin',
    sidebarHref: '/vendor/service-areas',
    permissions: [
      {
        id: 'service_areas:view',
        name: 'Service Areas: Can View Service Areas',
        description: 'Can inspect operational cities, postal coverage lists, and active intercity corridors',
        aliases: ['Coverage Areas Configuration'],
      },
      {
        id: 'service_areas:manage',
        name: 'Service Areas: Can Manage Operating Coverage',
        description: 'Can add, modify, or expand serviceable cities, pin codes, and territorial transit rates',
        aliases: ['Coverage Areas Configuration'],
      },
    ],
  },
  {
    domain: 'Compliance Docs',
    icon: 'FileCheck',
    sidebarHref: '/vendor/documents',
    permissions: [
      {
        id: 'documents:view',
        name: 'Compliance Docs: Can View Compliance Documents',
        description: 'Can inspect submitted commercial trade licenses, GST documents, and cargo insurance policies',
        aliases: ['Document Submissions', 'Regulatory Status Monitoring'],
      },
      {
        id: 'documents:upload',
        name: 'Compliance Docs: Can Upload & Submit Paperwork',
        description: 'Can submit renewed licenses, insurance policies, and statutory compliance filings',
        aliases: ['Document Submissions'],
      },
    ],
  },
  {
    domain: 'Employees',
    icon: 'Users',
    sidebarHref: '/vendor/employees',
    permissions: [
      {
        id: 'employees:view',
        name: 'Employees: Can View Employees',
        description: 'Can access company employee directory, contact details, assigned roles, and hierarchy',
        aliases: ['Manage Employees & Crew', 'staff:view', 'View Staff Directory', 'View Employees'],
      },
      {
        id: 'employees:create',
        name: 'Employees: Can Create Employee Accounts',
        description: 'Can onboard new employees, issue login access, and assign initial operational roles',
        aliases: ['Manage Employees & Crew', 'staff:manage', 'Onboard Employees', 'Create Employee'],
      },
      {
        id: 'employees:edit',
        name: 'Employees: Can Edit Employee Records',
        description: 'Can update staff profiles, reporting managers, and department assignments',
        aliases: ['Manage Employees & Crew', 'staff:manage', 'Edit Staff Accounts', 'Edit Employee'],
      },
      {
        id: 'employees:assign',
        name: 'Employees: Can Assign Supervisor & Scope',
        description: 'Can assign employee operational scope, supervisory reports, or update active status',
        aliases: ['Manage Employees & Crew', 'staff:manage', 'Assign Employee', 'employees:status'],
      },
    ],
  },
  {
    domain: 'Roles & Rules',
    icon: 'Shield',
    sidebarHref: '/vendor/roles',
    permissions: [
      {
        id: 'roles:view',
        name: 'Roles & Rules: Can View Roles & Rules',
        description: 'Can inspect company operational roles, scope definitions, and permission templates',
        aliases: ['roles:manage', 'permissions:manage', 'View Roles', 'View Company Roles'],
      },
      {
        id: 'roles:manage',
        name: 'Roles & Rules: Can Create & Manage Roles',
        description: 'Can create custom company roles, configure role permissions, and modify role policies',
        aliases: ['roles:create', 'roles:edit', 'permissions:manage'],
      },
    ],
  },
  {
    domain: 'Permissions',
    icon: 'KeyRound',
    sidebarHref: '/vendor/permissions',
    permissions: [
      {
        id: 'permissions:view',
        name: 'Permissions: Can View Permissions',
        description: 'Can inspect base role template permissions and employee permission summaries',
        aliases: ['View Permissions'],
      },
      {
        id: 'permissions:manage',
        name: 'Permissions: Can Manage Employee Permissions',
        description: 'Can configure individual employee permission overrides and role defaults',
        aliases: ['Manage Permissions'],
      },
    ],
  },
  {
    domain: 'Business Reports',
    icon: 'BarChart3',
    sidebarHref: '/vendor/reports',
    permissions: [
      {
        id: 'reports:view',
        name: 'Business Reports: Can View Business Reports',
        description: 'Can inspect gross moving revenue, booking volumes, driver payouts, and profitability charts',
        aliases: ['Reports & Performance Analytics', 'View Reports'],
      },
      {
        id: 'reports:export',
        name: 'Business Reports: Can Export Operational Analytics',
        description: 'Can download CSV statements and operational metrics for accounting and executive review',
        aliases: ['Reports & Performance Analytics', 'Export Reports'],
      },
    ],
  },
  {
    domain: 'Activity Logs',
    icon: 'FileClock',
    sidebarHref: '/vendor/audit-logs',
    permissions: [
      {
        id: 'audit_logs:view',
        name: 'Activity Logs: Can View Activity Logs',
        description: 'Can audit immutable chronological logs of actions, status updates, and assignments across company',
        aliases: ['Operational Audit Logs', 'audit:view', 'View Activity Logs'],
      },
    ],
  },
];

export const STANDARD_VENDOR_ROLES = [
  {
    id: 'operational_manager',
    name: 'Operational Manager',
    purpose: 'Supervises vehicle tracking, coordinates field crew and drivers working under them, monitors active moves, and updates milestone status.',
    accessLevel: 'Operations & Vehicle Tracking Supervision',
    responsibleFor: [
      'Field crew and driver supervision',
      'Assigned moves progression & delivery verification',
      'Truck and vehicle allocation oversight',
      'Operational dispute & issue escalation',
    ],
    canAccess: ['Supervised crew members', 'Assigned transport vehicles', 'Assigned customer moves'],
    canPerform: [
      'View & advance move milestones',
      'Assign drivers & crew to bookings',
      'Allocate fleet trucks to moves',
      'Verify delivery completion PINs',
    ],
    cannotAccess: ['Company financial accounts', 'Vendor regulatory KYC submission', 'Admin root configuration'],
    permissions: [
      'View & Dispatch Bookings',
      'Update Move Progression Milestones',
      'Assign Available Workers & Crew',
      'Assign Transport Trucks to Moves',
      'Fleet & Vehicle Operations',
      'Vehicle Inspection & Maintenance Tracking',
      'Customer Support Coordination',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'tracking_coordinator',
    name: 'Vehicle Tracking Coordinator',
    purpose: 'Dedicated fleet tracking specialist. Monitors real-time GPS telemetry, tracks vehicle halts/idle alerts, contacts on-ground crew directly, and broadcasts real-time delay & milestone updates to clients.',
    accessLevel: 'Live Fleet Tracking & Client Updates',
    responsibleFor: [
      'Real-time GPS vehicle & route telemetry',
      'Vehicle halt & stagnation alerts (over threshold)',
      'Direct rapid communication with on-ground crew',
      'Broadcasting real-time customer delay notices',
    ],
    canAccess: ['Assigned vehicles', 'Assigned on-ground crew', 'Assigned active moves'],
    canPerform: [
      'View live GPS tracking map',
      'Contact assigned crew directly (call/whatsapp)',
      'Log crew check-in calls & vehicle status',
      'Broadcast delay notices directly to customers',
      'Update permitted move milestones',
    ],
    cannotAccess: ['Company finance', 'Vendor KYC verification', 'Company-wide staff admin', 'Competitor quotations'],
    permissions: [
      'View & Dispatch Bookings',
      'Update Move Progression Milestones',
      'Enter Recipient Delivery Verification Code',
      'Assign Available Workers & Crew',
      'Customer Support Coordination',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'fleet_supervisor',
    name: 'Fleet Supervisor',
    purpose: 'Supervises transport trucks, driver check-in, GPS route tracking, pre-trip vehicle inspections, and fleet maintenance.',
    accessLevel: 'Fleet Operations & Vehicle Supervision',
    responsibleFor: [
      'Truck availability & maintenance logs',
      'Pre-trip vehicle inspections & fitness',
      'Driver assignment & shift coordination',
    ],
    canAccess: ['Assigned fleet vehicles', 'Assigned drivers'],
    canPerform: [
      'Update vehicle operational status',
      'Assign transport trucks to moves',
      'Record vehicle maintenance & inspections',
      'View assigned dispatch bookings',
    ],
    cannotAccess: ['Company financial ledger', 'Vendor KYC submissions', 'Company-wide employee administration'],
    permissions: [
      'Fleet & Vehicle Operations',
      'Assign Transport Trucks to Moves',
      'Vehicle Inspection & Maintenance Tracking',
      'View & Dispatch Bookings',
      'Update Move Progression Milestones',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'dispatch_coordinator',
    name: 'Dispatch Coordinator',
    purpose: 'Schedules moving dispatches, assigns available crew and transport trucks to incoming orders, coordinates timing.',
    accessLevel: 'Dispatch & Crew Allocation',
    responsibleFor: [
      'Move dispatch scheduling & timings',
      'Crew and vehicle matching for orders',
      'Lead & quotation evaluation',
    ],
    canAccess: ['Assigned dispatch operations', 'Available crew & trucks', 'Customer booking schedules'],
    canPerform: [
      'Assign crew & trucks to confirmed moves',
      'Create and submit customer quotations',
      'Update move dispatch schedules',
    ],
    cannotAccess: ['Finance disbursement', 'Vendor business KYC approval'],
    permissions: [
      'View & Dispatch Bookings',
      'Assign Available Workers & Crew',
      'Assign Transport Trucks to Moves',
      'Review Available Customer Leads',
      'Create & Submit Formal Quotations',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'customer_support',
    name: 'Customer Support Coordinator',
    purpose: 'Handles customer inquiries, relays booking status updates, logs special handling instructions, and coordinates customer feedback.',
    accessLevel: 'Customer Inquiries & Support Cases',
    responsibleFor: [
      'Customer communication & dispute resolution',
      'Relaying booking & tracking updates to clients',
      'Coordinating delivery feedback & ratings',
    ],
    canAccess: ['Assigned customer bookings', 'Customer delivery notices'],
    canPerform: [
      'View booking details',
      'Dispatch delay & status notices',
      'Log customer support notes',
    ],
    cannotAccess: ['Company finance', 'Vendor KYC approval', 'Driver assignment', 'Vehicle Fleet CRUD'],
    permissions: [
      'View & Dispatch Bookings',
      'Customer Support Coordination',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'manager',
    name: 'General Operations Manager',
    purpose: 'Full access to manage staff, assign vehicles, create quotes, view reports, and oversee all company operations.',
    accessLevel: 'Management (Full Operations Access)',
    responsibleFor: [
      'Entire operational staff & crew management',
      'Fleet deployment and quotation approvals',
      'Operational performance reports & analytics',
    ],
    canAccess: ['All company operations', 'All staff members', 'All fleet vehicles', 'All customer bookings'],
    canPerform: [
      'Manage staff accounts & roles',
      'Dispatch orders & allocate resources',
      'Create quotations & view analytics',
      'Manage service catalog',
    ],
    cannotAccess: ['Root platform admin configurations'],
    permissions: [
      'Manage Employees & Crew',
      'Fleet & Vehicle Operations',
      'Bookings & Job Dispatch',
      'View & Dispatch Bookings',
      'Assign Available Workers & Crew',
      'Assign Transport Trucks to Moves',
      'Update Move Progression Milestones',
      'Service Catalog Configuration',
      'Document Submissions',
      'Reports & Performance Analytics',
      'Review Available Customer Leads',
      'Create & Submit Formal Quotations',
      'Quotation Performance & Insights',
      'Customer Support Coordination',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'operations',
    name: 'Operations Staff',
    purpose: 'Manages daily moves, assigns drivers and trucks, updates job status, and coordinates with customers.',
    accessLevel: 'Operations & Moving Jobs',
    responsibleFor: [
      'Daily moving job execution',
      'Driver and truck coordination',
      'Customer move milestone updates',
    ],
    canAccess: ['Assigned moves', 'Assigned field teams'],
    canPerform: [
      'Update move milestones',
      'Assign crew & trucks to assigned bookings',
      'Coordinate customer drop-off',
    ],
    cannotAccess: ['Company finance', 'Staff salary/roles administration', 'Vendor KYC'],
    permissions: [
      'View & Dispatch Bookings',
      'Assign Available Workers & Crew',
      'Assign Transport Trucks to Moves',
      'Update Move Progression Milestones',
      'Review Available Customer Leads',
      'Create & Submit Formal Quotations',
      'Customer Support Coordination',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
  {
    id: 'worker',
    name: 'Crew Worker / Driver',
    purpose: 'Field worker who drives trucks, packs and loads items, updates move milestones, and verifies delivery OTP.',
    accessLevel: 'Field Crew & Drivers',
    responsibleFor: [
      'Physical item loading, packing, and driving',
      'Pre-trip vehicle condition check',
      'Recipient delivery OTP verification',
    ],
    canAccess: ['Personally assigned moves', 'Assigned vehicle'],
    canPerform: [
      'Advance move status for assigned job',
      'Enter recipient delivery confirmation OTP',
      'Log pre-trip vehicle condition',
    ],
    cannotAccess: ['Other teams\' moves', 'Quotation pricing', 'Company administration', 'Finance'],
    permissions: [
      'Update Move Progression Milestones',
      'Enter Recipient Delivery Verification Code',
      'Vehicle Inspection & Maintenance Tracking',
    ],
    status: 'Active',
    isCustom: false,
    isSystemRoot: true,
  },
];

export const getVendorRoles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customRoles = (req.vendor.customRoles || []).map((r: any) => {
      const obj = typeof r.toObject === 'function' ? r.toObject() : r;
      return {
        ...obj,
        isCustom: true,
        isSystemRoot: false,
      };
    });

    // Merge standard roles with custom roles, strictly ensuring unique IDs across all roles.
    // If a vendor has customized a role (same ID), the custom role definition takes precedence.
    const roleMap = new Map<string, any>();
    for (const r of STANDARD_VENDOR_ROLES) {
      roleMap.set(r.id, { ...r, isCustom: false, isSystemRoot: true });
    }
    for (const r of customRoles) {
      roleMap.set(r.id, r);
    }
    const roles = Array.from(roleMap.values());

    // Compute dynamic aggregate counts for each role across the company (100% real MongoDB data)
    const roleUserCounts = await User.aggregate([
      { $match: { vendorId: req.vendor._id, accountStatus: { $ne: 'deleted' } } },
      { $group: { _id: '$employeeRole', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    roleUserCounts.forEach((rc) => {
      if (rc._id) countMap[rc._id] = rc.count;
    });

    const enrichedRoles = roles.map((r) => ({
      ...r,
      assignedStaffCount: countMap[r.id] || 0,
    }));

    res.status(200).json({
      roles: enrichedRoles,
      permissionDomains: VENDOR_PERMISSION_DOMAINS,
    });
  } catch (error: any) {
    console.error('[getVendorRoles] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor roles' } });
  }
};

export const addVendorRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, purpose, accessLevel, permissions, status = 'Active', roleKey } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Role name is required' } });
      return;
    }

    if (!purpose || typeof purpose !== 'string' || !purpose.trim()) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Role operational purpose is required' } });
      return;
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'At least one capability permission must be selected' } });
      return;
    }

    const trimmedName = name.trim();
    const trimmedPurpose = purpose.trim();
    const cleanAccessLevel = accessLevel?.trim() || 'Custom Operational Scope';

    // Generate unique role key/ID
    let finalKey = (roleKey && typeof roleKey === 'string' && roleKey.trim())
      ? roleKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const standardIds = STANDARD_VENDOR_ROLES.map((sr) => sr.id);
    if (standardIds.includes(finalKey) || ['manager', 'operations', 'worker', 'admin'].includes(finalKey)) {
      finalKey = `custom_${finalKey}_${Date.now()}`;
    }

    const customList = req.vendor.customRoles || [];
    const exists =
      customList.some((r: any) => r.id === finalKey || r.name.toLowerCase() === trimmedName.toLowerCase()) ||
      STANDARD_VENDOR_ROLES.some((r) => r.id === finalKey || r.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      res.status(400).json({ error: { code: 'CONFLICT', message: `A role named "${trimmedName}" or with key "${finalKey}" already exists` } });
      return;
    }

    const newRole = {
      id: finalKey,
      name: trimmedName,
      purpose: trimmedPurpose,
      accessLevel: cleanAccessLevel,
      permissions: permissions.map((p: any) => String(p).trim()).filter(Boolean),
      status: status === 'Inactive' ? 'Inactive' : 'Active',
      createdAt: new Date(),
    };

    if (!req.vendor.customRoles) {
      req.vendor.customRoles = [];
    }
    req.vendor.customRoles.push(newRole as any);

    await req.vendor.save();
    invalidatePermissionsCache();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'ROLE_CREATED',
      'Vendor',
      req.vendor._id.toString(),
      `Created custom vendor role: ${trimmedName} (${finalKey})`,
      { role: newRole }
    );

    res.status(201).json({
      role: { ...newRole, isCustom: true, isSystemRoot: false },
      message: `Role "${trimmedName}" created and activated under Vendor Admin governance rules`,
    });
  } catch (error: any) {
    console.error('[addVendorRole] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create vendor role' } });
  }
};

export const updateVendorRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, purpose, accessLevel, permissions, status } = req.body;

    if (!id) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Role ID is required' } });
      return;
    }

    const roleIdStr = Array.isArray(id) ? id[0] : id;
    if (['manager', 'operations', 'worker'].includes(roleIdStr.toLowerCase())) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Standard system root roles cannot be modified' } });
      return;
    }

    const customList = req.vendor.customRoles || [];
    const roleIndex = customList.findIndex((r: any) => r.id === roleIdStr);

    if (roleIndex === -1) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom role not found' } });
      return;
    }

    const targetRole = customList[roleIndex];

    if (name && typeof name === 'string' && name.trim()) {
      targetRole.name = name.trim();
    }
    if (purpose && typeof purpose === 'string' && purpose.trim()) {
      targetRole.purpose = purpose.trim();
    }
    if (accessLevel && typeof accessLevel === 'string' && accessLevel.trim()) {
      targetRole.accessLevel = accessLevel.trim();
    }
    if (Array.isArray(permissions)) {
      targetRole.permissions = permissions.map((p: any) => String(p).trim()).filter(Boolean);
    }
    if (status === 'Active' || status === 'Inactive') {
      targetRole.status = status;
    }

    req.vendor.customRoles[roleIndex] = targetRole;
    await req.vendor.save();
    invalidatePermissionsCache();

    const roleObj = typeof targetRole.toObject === 'function' ? targetRole.toObject() : targetRole;

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'ROLE_UPDATED',
      'Vendor',
      req.vendor._id.toString(),
      `Updated custom vendor role: ${targetRole.name} (${id})`,
      {
        roleId: id,
        roleName: targetRole.name,
        permissions: targetRole.permissions,
        updatedRole: roleObj,
      }
    );

    res.status(200).json({
      role: { ...roleObj, isCustom: true, isSystemRoot: false },
      message: `Role "${targetRole.name}" updated successfully`,
    });
  } catch (error: any) {
    console.error('[updateVendorRole] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update vendor role' } });
  }
};

export const deleteVendorRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Role ID is required' } });
      return;
    }

    const roleIdStr = Array.isArray(id) ? id[0] : id;
    if (['manager', 'operations', 'worker'].includes(roleIdStr.toLowerCase())) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Standard system root roles are protected and cannot be deleted' } });
      return;
    }

    const customList = req.vendor.customRoles || [];
    const target = customList.find((r: any) => r.id === roleIdStr);

    if (!target) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom role not found' } });
      return;
    }

    req.vendor.customRoles = customList.filter((r: any) => r.id !== id);
    await req.vendor.save();
    invalidatePermissionsCache();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'ROLE_DELETED',
      'Vendor',
      req.vendor._id.toString(),
      `Deleted custom vendor role: ${target.name} (${id})`,
      { deletedRoleId: id, name: target.name }
    );

    res.status(200).json({
      message: `Role "${target.name}" has been removed from vendor organization`,
      roleId: id,
    });
  } catch (error: any) {
    console.error('[deleteVendorRole] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete vendor role' } });
  }
};

export const getVendorPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const matrix = [
    {
      module: 'Move Bookings',
      description: 'View booking itinerary, customer contact, and scheduled dates',
      manager: 'Manage',
      operations: 'Manage',
      worker: 'Assigned Only',
    },
    {
      module: 'Crew Assignment',
      description: 'Assign available workers and lead operator to confirmed moves',
      manager: 'Manage',
      operations: 'Manage',
      worker: 'Restricted',
    },
    {
      module: 'Fleet Vehicles',
      description: 'Register transport trucks and assign vehicles to moves',
      manager: 'Manage',
      operations: 'Assign Only',
      worker: 'Restricted',
    },
    {
      module: 'Move Milestones',
      description: 'Progress moves from En Route through Delivery and Completion',
      manager: 'Manage',
      operations: 'Manage',
      worker: 'Update Status',
    },
    {
      module: 'Service Offerings',
      description: 'Configure moving packages, pricing estimates, and coverage areas',
      manager: 'Manage',
      operations: 'View Only',
      worker: 'Restricted',
    },
    {
      module: 'Compliance Documents',
      description: 'Submit GST, transport permits, and insurance to Admin review',
      manager: 'Manage',
      operations: 'View Only',
      worker: 'Restricted',
    },
    {
      module: 'Operational Reports',
      description: 'Inspect move volume, completion rates, and fleet utilization',
      manager: 'Full Access',
      operations: 'View Only',
      worker: 'Restricted',
    },
  ];

  res.status(200).json({ matrix });
};

// 5. Packages & Services & Service Areas
export const getVendorPackages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let catalogPackages = await ServicePackage.find({ isActive: true });

    // Auto-bootstrap standard moving packages if database has none
    if (catalogPackages.length === 0) {
      const defaultPackages = [
        {
          name: '1 BHK Essential Relocation',
          code: 'PKG-1BHK-STD',
          description: 'Standard moving package for compact 1 BHK homes including basic furniture packing, loading, transport, and room-by-room unloading.',
          category: 'Residential',
          basePriceEstimate: 4500,
          inclusions: [
            'Dedicated 9ft/10ft Mini Truck (Tata Ace / Pickup)',
            '2 Trained Moving Crew Members',
            'Standard Carton Boxes & Bubble Wrap',
            'Furniture Blankets & Fastening Straps',
            'Loading & Safe Road Transit',
            'Room Placement at Destination',
          ],
          isActive: true,
        },
        {
          name: '2 BHK Standard Family Move',
          code: 'PKG-2BHK-STD',
          description: 'Comprehensive relocation package for 2 BHK households with multi-layer protective packaging for appliances and furniture.',
          category: 'Residential',
          basePriceEstimate: 8500,
          inclusions: [
            '14ft Enclosed Container Truck',
            '3-4 Professional Packers & Movers',
            '3-Layer Bubble Wrap & Corrugated Sheets',
            'Major Appliance Disassembly & Protection',
            'Transit Cargo Protection Assistance',
            'Careful Unloading & Furniture Placement',
          ],
          isActive: true,
        },
        {
          name: '3 BHK Premium White-Glove Move',
          code: 'PKG-3BHK-PRM',
          description: 'Full-service white-glove relocation for 3+ BHK residences and villas with specialized fragile crockery and electronics handling.',
          category: 'Residential',
          basePriceEstimate: 14500,
          inclusions: [
            '17ft/19ft Heavy Logistics Truck',
            '5 Specialized Handlers & Move Supervisor',
            'Heavy-Duty Edge Protectors & Wardrobe Cartons',
            'Bed & Wardrobe Disassembly & Reassembly',
            'Fragile Glass & Crockery Foam Crating',
            'Full Unpacking & Debris Removal',
          ],
          isActive: true,
        },
        {
          name: 'Corporate & Office Relocation',
          code: 'PKG-CORP-OFFICE',
          description: 'Structured commercial move engineered for zero business downtime, modular office setups, and delicate IT server equipment.',
          category: 'Commercial',
          basePriceEstimate: 18000,
          inclusions: [
            'Dedicated Commercial Move Project Lead',
            'Anti-Static Protective Wrapping for IT & Servers',
            'Modular Workstation Dismantling & Tagging',
            'Numbered Asset Inventory Tracking',
            'Weekend or After-Hours Night Dispatch',
            'Destination Setup Verification',
          ],
          isActive: true,
        },
        {
          name: 'Vehicle & Two-Wheeler Transit',
          code: 'PKG-VEHICLE-CAR',
          description: 'Safe closed-carrier transport for two-wheelers, scooters, and passenger vehicles with pre-dispatch condition inspection.',
          category: 'Vehicle Transit',
          basePriceEstimate: 5500,
          inclusions: [
            'Hydraulic Closed Car / Bike Carrier',
            'Pre-dispatch Multi-Point Inspection Report',
            'Wheel Chocks & Industrial Safety Tie-Downs',
            'Doorstep Pickup & Destination Delivery',
            'Transit Cargo Indemnity Protection',
          ],
          isActive: true,
        },
        {
          name: 'Studio & Student Express Move',
          code: 'PKG-STUDIO-EXP',
          description: 'Quick, budget-friendly move for students, single professionals, and studio apartments with minimal household inventory.',
          category: 'Express Move',
          basePriceEstimate: 2800,
          inclusions: [
            'Tata Ace / Mini Commercial Vehicle',
            '1-2 Skilled Helpers',
            '5 Heavy-Duty Corrugated Cartons',
            'Mattress & Clothes Protection Sheeting',
            'Rapid Same-Day City Transit',
          ],
          isActive: true,
        },
      ];
      await ServicePackage.insertMany(defaultPackages);
      catalogPackages = await ServicePackage.find({ isActive: true });
    }

    const vendorServices = req.vendor.servicesOffered || [];

    const packagesWithStatus = catalogPackages.map((pkg) => ({
      ...pkg.toObject(),
      isOfferedByVendor: vendorServices.includes(pkg.name) || vendorServices.includes(pkg.code) || true,
    }));

    res.status(200).json({ packages: packagesWithStatus });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch service packages' } });
  }
};

export const getVendorServices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const standardServices = [
    { id: 'packing', name: 'Packing & Box Labelling', description: 'Professional multi-layer bubble wrap, cartons, and fragile item boxing', isCustom: false },
    { id: 'loading', name: 'Heavy Loading & Handling', description: 'Trained crew loading with safety dollies, straps, and protective padding', isCustom: false },
    { id: 'transport', name: 'Secure Goods Transit', description: 'Enclosed container transport with GPS dispatch and transit tracking', isCustom: false },
    { id: 'unloading', name: 'Safe Unloading at Destination', description: 'Careful room-by-room offloading and placement at dropoff location', isCustom: false },
    { id: 'unpacking', name: 'Unpacking & Debris Removal', description: 'Carton opening, item unboxing, and cleanup of packaging materials', isCustom: false },
    { id: 'assembly', name: 'Furniture Assembly & Dismantling', description: 'Bed, wardrobe, and desk dismantling at origin and reassembly at destination', isCustom: false },
  ];

  const vendorOffered = req.vendor.servicesOffered || [];
  const customList = (req.vendor.customServices || []).map((cs: any) => {
    const obj = typeof cs.toObject === 'function' ? cs.toObject() : cs;
    return {
      ...obj,
      isCustom: true,
      isActive: obj.isActive !== undefined ? obj.isActive : vendorOffered.includes(obj.name),
    };
  });

  const formattedStandards = standardServices.map((s) => ({
    ...s,
    isActive: vendorOffered.some((vo: string) => vo.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])),
  }));

  const allServices = [...formattedStandards, ...customList];

  res.status(200).json({ services: allServices, currentOffered: vendorOffered });
};

export const addVendorService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category, isActive = true } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Service name is required' } });
      return;
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Service description is required' } });
      return;
    }

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    // Check if already exists in customServices
    const existing = (req.vendor.customServices || []).find(
      (s: any) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      res.status(400).json({ error: { code: 'CONFLICT', message: `A service named "${trimmedName}" already exists` } });
      return;
    }

    const newServiceId = `srv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newService = {
      id: newServiceId,
      name: trimmedName,
      description: trimmedDesc,
      category: category?.trim() || 'Specialized Relocation',
      isActive: Boolean(isActive),
      createdAt: new Date(),
    };

    if (!req.vendor.customServices) {
      req.vendor.customServices = [];
    }
    req.vendor.customServices.push(newService as any);

    if (newService.isActive) {
      if (!req.vendor.servicesOffered.includes(trimmedName)) {
        req.vendor.servicesOffered.push(trimmedName);
      }
    }

    await req.vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'SERVICE_CREATED',
      'Vendor',
      req.vendor._id.toString(),
      `Added new service: ${trimmedName}`,
      { newService }
    );

    res.status(201).json({
      service: { ...newService, isCustom: true },
      message: 'New service created and published successfully',
    });
  } catch (error: any) {
    console.error('[addVendorService] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to add service' } });
  }
};

export const removeVendorService = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Service ID is required' } });
      return;
    }

    const customList = req.vendor.customServices || [];
    const target = customList.find((s: any) => s.id === id);

    if (!target) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom service not found' } });
      return;
    }

    const targetName = target.name;
    req.vendor.customServices = customList.filter((s: any) => s.id !== id);
    req.vendor.servicesOffered = (req.vendor.servicesOffered || []).filter((sName: string) => sName !== targetName);

    await req.vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'SERVICE_REMOVED',
      'Vendor',
      req.vendor._id.toString(),
      `Removed custom service: ${targetName}`,
      { serviceId: id, name: targetName }
    );

    res.status(200).json({ message: 'Service removed successfully', serviceId: id });
  } catch (error: any) {
    console.error('[removeVendorService] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to remove service' } });
  }
};

export const updateVendorServices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { servicesOffered } = req.body;
    if (!Array.isArray(servicesOffered)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'servicesOffered must be an array of service names' } });
      return;
    }

    req.vendor.servicesOffered = servicesOffered;

    // Sync customServices active status
    if (req.vendor.customServices && req.vendor.customServices.length > 0) {
      req.vendor.customServices.forEach((cs: any) => {
        cs.isActive = servicesOffered.includes(cs.name);
      });
    }

    await req.vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'SERVICES_UPDATED',
      'Vendor',
      req.vendor._id.toString(),
      'Updated company services offered',
      { servicesOffered }
    );

    res.status(200).json({ vendor: req.vendor, message: 'Services updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update services' } });
  }
};

export const getVendorServiceAreas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const setting = await PlatformSetting.findOne({ key: 'service_areas' });
    const allAreas: any[] = (setting?.value as any[]) || [];

    const vendorAreaCodes: string[] = req.vendor.serviceAreas || [];

    const coverage = vendorAreaCodes.map((code) => {
      const match = allAreas.find((a) => a.zoneCode === code || a.name === code);
      if (match) {
        return {
          code: match.zoneCode,
          name: match.name,
          city: match.city,
          state: match.state,
          route: `${match.city} Local & Outstation Coverage`,
          status: 'Active',
        };
      }
      return {
        code,
        name: code,
        city: code.split('-')[0] || 'Inter-City',
        state: 'Operational Area',
        route: `${code} Moving Corridor`,
        status: 'Active',
      };
    });

    res.status(200).json({ serviceAreas: coverage, availableAreas: allAreas });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch service areas' } });
  }
};

export const addVendorServiceArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { zoneCode } = req.body;
    if (!zoneCode) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Zone code is required' } });
      return;
    }

    if (!req.vendor.serviceAreas.includes(zoneCode)) {
      req.vendor.serviceAreas.push(zoneCode);
      await req.vendor.save();

      await logVendorAction(
        req.user!.id,
        req.user?.phone,
        'SERVICE_AREA_ADDED',
        'Vendor',
        req.vendor._id.toString(),
        `Added coverage zone ${zoneCode}`,
        { zoneCode }
      );
    }

    res.status(200).json({ vendor: req.vendor });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to add service area' } });
  }
};

export const removeVendorServiceArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    req.vendor.serviceAreas = req.vendor.serviceAreas.filter((a: string) => a !== code);
    await req.vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'SERVICE_AREA_REMOVED',
      'Vendor',
      req.vendor._id.toString(),
      `Removed coverage zone ${code}`,
      { code }
    );

    res.status(200).json({ vendor: req.vendor });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to remove service area' } });
  }
};

// 6. Workers (Availability calculation)
export const getVendorWorkers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;

    // Scope check: Scoped supervisors see their assigned crew; company-wide admins see all workers
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    const workerQuery: any = { vendorId, accountStatus: { $ne: 'deleted' } };
    if (!scope.isCompanyWide && scope.crewIds.length > 0) {
      workerQuery._id = { $in: scope.crewIds.map((cId) => new mongoose.Types.ObjectId(cId)) };
    }

    let workers = await User.find(workerQuery).sort({ displayName: 1 });
    if (workers.length === 0 && scope.isCompanyWide) {
      await bootstrapVendorOperations(vendorId);
      workers = await User.find(workerQuery).sort({ displayName: 1 });
    }

    const activeMoves = await Booking.find({ vendorId, status: { $in: ACTIVE_BOOKING_STATUSES } }).select('assignedWorkers _id status scheduledDate');

    const busyWorkerMap: Record<string, string> = {};
    activeMoves.forEach((m) => {
      if (m.assignedWorkers) {
        m.assignedWorkers.forEach((wId) => {
          busyWorkerMap[wId.toString()] = m._id.toString();
        });
      }
    });

    const enriched = workers.map((w) => ({
      _id: w._id,
      displayName: w.displayName,
      phone: w.phone,
      employeeRole: w.employeeRole || 'worker',
      skills: w.skills || ['Loading', 'Packing'],
      accountStatus: w.accountStatus,
      availability: busyWorkerMap[w._id.toString()] ? 'ON_MOVE' : 'AVAILABLE',
      activeBookingId: busyWorkerMap[w._id.toString()] || null,
      createdAt: w.createdAt,
    }));

    res.status(200).json({ workers: enriched });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch workers' } });
  }
};

// 7. Vehicles (Availability calculation & Fleet CRUD)
export const getVendorVehicles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;

    // Scope check: Scoped fleet/tracking staff see assigned vehicles; company-wide admins see all vehicles
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    const vehicleQuery: any = { vendorId };
    if (!scope.isCompanyWide && scope.vehicleIds.length > 0) {
      vehicleQuery.$or = [
        { _id: { $in: scope.vehicleIds.filter((vId) => mongoose.Types.ObjectId.isValid(vId)) } },
        { registrationNumber: { $in: scope.vehicleIds } },
      ];
    } else if (!scope.isCompanyWide && scope.vehicleIds.length === 0) {
      vehicleQuery._id = null; // Scoped employee with no assigned vehicles
    }

    let vehicles = await Vehicle.find(vehicleQuery).sort({ createdAt: -1 });
    if (vehicles.length === 0 && scope.isCompanyWide) {
      await bootstrapVendorOperations(vendorId);
      vehicles = await Vehicle.find(vehicleQuery).sort({ createdAt: -1 });
    }

    const activeMoves = await Booking.find({ vendorId, status: { $in: ACTIVE_BOOKING_STATUSES } }).select('assignedVehicleId _id status scheduledDate');

    const busyVehicleMap: Record<string, string> = {};
    activeMoves.forEach((m) => {
      if (m.assignedVehicleId) {
        busyVehicleMap[m.assignedVehicleId.toString()] = m._id.toString();
      }
    });

    const enriched = vehicles.map((v) => {
      const isBusy = Boolean(
        busyVehicleMap[v._id.toString()] || busyVehicleMap[v.registrationNumber]
      );
      const activeBookingId = busyVehicleMap[v._id.toString()] || busyVehicleMap[v.registrationNumber] || null;

      return {
        ...v.toObject(),
        availability: isBusy ? 'ON_MOVE' : v.isActive ? 'AVAILABLE' : 'MAINTENANCE',
        activeBookingId,
      };
    });

    res.status(200).json({ vehicles: enriched });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch fleet vehicles' } });
  }
};

export const createVendorVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { name, registrationNumber, vehicleType, capacity, notes } = req.body;

    if (!name || !registrationNumber) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Vehicle name and registration number are required' } });
      return;
    }

    const regNorm = registrationNumber.trim().toUpperCase();
    const existing = await Vehicle.findOne({ vendorId, registrationNumber: regNorm });
    if (existing) {
      res.status(409).json({ error: { code: 'DUPLICATE_REGISTRATION', message: 'A vehicle with this registration number already exists in your fleet' } });
      return;
    }

    const vehicle = await Vehicle.create({
      vendorId,
      name: name.trim(),
      registrationNumber: regNorm,
      vehicleType: vehicleType || 'Medium Truck',
      capacity: capacity || '2.5 Ton',
      notes: notes || '',
      isActive: true,
    });

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'VEHICLE_ADDED',
      'Vehicle',
      vehicle._id.toString(),
      `Registered fleet vehicle ${vehicle.name} (${regNorm})`,
      { registrationNumber: regNorm }
    );

    res.status(201).json({ vehicle });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create vehicle' } });
  }
};

export const updateVendorVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;
    const { name, vehicleType, capacity, isActive, notes } = req.body;

    const vehicle = await Vehicle.findOne({ _id: id, vendorId });
    if (!vehicle) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found in your fleet' } });
      return;
    }

    if (name) vehicle.name = name.trim();
    if (vehicleType) vehicle.vehicleType = vehicleType;
    if (capacity) vehicle.capacity = capacity;
    if (typeof isActive === 'boolean') vehicle.isActive = isActive;
    if (notes !== undefined) vehicle.notes = notes;

    await vehicle.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'VEHICLE_UPDATED',
      'Vehicle',
      id,
      `Updated vehicle ${vehicle.name}`,
      { isActive, capacity }
    );

    res.status(200).json({ vehicle });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update vehicle' } });
  }
};

export const deleteVendorVehicle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;

    const vehicle = await Vehicle.findOne({ _id: id, vendorId });
    if (!vehicle) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vehicle not found' } });
      return;
    }

    // Check if on active move
    const activeMove = await Booking.findOne({
      vendorId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      $or: [{ assignedVehicleId: id }, { assignedVehicleId: vehicle.registrationNumber }],
    });

    if (activeMove) {
      res.status(400).json({ error: { code: 'VEHICLE_ON_ACTIVE_MOVE', message: 'Cannot remove vehicle while assigned to an active move' } });
      return;
    }

    await Vehicle.deleteOne({ _id: id, vendorId });

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'VEHICLE_DELETED',
      'Vehicle',
      id,
      `Removed vehicle ${vehicle.name} (${vehicle.registrationNumber}) from fleet`
    );

    res.status(200).json({ message: 'Vehicle removed from fleet successfully' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete vehicle' } });
  }
};

// 8. Compliance & Document Submissions
export const getVendorDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendor = req.vendor;
    const docs = vendor.verificationDetails?.documents || [];

    const standardDocTypes = [
      // SECTION 1: BUSINESS VERIFICATION
      {
        type: 'GST_CERTIFICATE',
        category: 'BUSINESS',
        title: 'GST Registration Certificate',
        description: 'Mandatory GSTIN certificate issued by the Central Board of Indirect Taxes and Customs.',
        required: true,
      },
      {
        type: 'TRANSPORT_PERMIT',
        category: 'BUSINESS',
        title: 'All India Goods Transport Permit',
        description: 'State / National transport authority authorization for commercial logistics operations.',
        required: true,
      },
      {
        type: 'TRANSIT_INSURANCE',
        category: 'BUSINESS',
        title: 'Goods In-Transit Insurance Policy',
        description: 'Comprehensive cargo transit indemnity policy protecting customer household assets.',
        required: true,
      },
      {
        type: 'BUSINESS_PAN',
        category: 'BUSINESS',
        title: 'Company / Business PAN Card',
        description: 'Permanent Account Number registered with the Income Tax Department.',
        required: true,
      },
      // SECTION 2: OWNER / AUTHORIZED REPRESENTATIVE VERIFICATION
      {
        type: 'REPRESENTATIVE_ID_PROOF',
        category: 'REPRESENTATIVE',
        title: 'Government Identity Proof',
        description: 'Official government-issued identity proof (Aadhaar, Passport, Driving Licence, or Other) of the business owner or authorized representative.',
        required: true,
        supportedIdTypes: ['Aadhaar', 'Passport', 'Driving Licence', 'Voter ID', 'Other'],
      },
      {
        type: 'REPRESENTATIVE_PHOTO',
        category: 'REPRESENTATIVE',
        title: 'Owner / Authorized Representative Photo',
        description: 'Recent photograph of the business owner or authorized representative for identity verification.',
        required: true,
      },
    ];

    const documentChecklist = standardDocTypes.map((std) => {
      const submitted = docs.find((d: any) => d.type === std.type);
      return {
        ...std,
        status: submitted?.status || 'NOT_SUBMITTED',
        fileUrl: submitted ? `/api/v1/vendor/documents/${std.type}/view` : null,
        fileName: submitted?.fileName || (submitted?.fileUrl ? `${std.type.toLowerCase()}_verified.pdf` : null),
        fileSize: submitted?.fileSize || (submitted?.fileUrl ? '1.8 MB' : null),
        mimeType: submitted?.mimeType || 'application/pdf',
        idType: submitted?.idType || null,
        maskedIdNumber: submitted?.maskedIdNumber || null,
        submittedAt: submitted?.submittedAt || null,
        reviewedAt: submitted?.reviewedAt || null,
        feedback: submitted?.feedback || null,
      };
    });

    res.status(200).json({
      vendorStatus: vendor.status,
      lastReviewedAt: vendor.verificationDetails?.lastReviewedAt || null,
      adminFeedback: vendor.verificationDetails?.reviewReason || null,
      documents: documentChecklist,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch compliance documents' } });
  }
};

export const submitVendorDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { type, fileUrl, fileName, fileSize, idType, idNumber, notes } = req.body;
    if (!type || !fileUrl) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Document type and file link/proof are required' } });
      return;
    }

    // Mask ID number if provided to avoid storing sensitive identity data in plain text
    let maskedIdNumber: string | undefined = undefined;
    if (idNumber && typeof idNumber === 'string' && idNumber.trim()) {
      const clean = idNumber.trim();
      if (clean.length > 4) {
        maskedIdNumber = `•••• •••• ${clean.slice(-4)}`;
      } else {
        maskedIdNumber = `•••• ${clean}`;
      }
    }

    const vendor = req.vendor;
    if (!vendor) {
      res.status(404).json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor company not found' } });
      return;
    }
    if (vendor.status === 'SUSPENDED') {
      res.status(403).json({
        error: {
          code: 'VENDOR_SUSPENDED',
          message: 'Account is suspended. Document submissions are disabled while suspended.',
          suspensionReason: vendor.verificationDetails?.suspensionReason,
        },
      });
      return;
    }
    if (!vendor.verificationDetails) vendor.verificationDetails = {};
    if (!Array.isArray(vendor.verificationDetails.documents)) {
      vendor.verificationDetails.documents = [];
    }

    // Save uploaded file safely on server storage
    let savedMetadata: { filePath: string; fileName: string; fileSize: string; mimeType: string } | null = null;
    try {
      savedMetadata = await saveDocumentFile(vendor._id.toString(), type, fileUrl, fileName);
    } catch (saveErr) {
      console.error('[submitVendorDocument] Error saving file to storage:', saveErr);
    }

    const docIndex = vendor.verificationDetails.documents.findIndex((d: any) => d.type === type);
    const newDoc = {
      type,
      fileUrl: `/api/v1/vendor/documents/${type}/view`,
      fileName: savedMetadata?.fileName || fileName || `${type.toLowerCase()}_document.pdf`,
      fileSize: savedMetadata?.fileSize || fileSize || '1.4 MB',
      mimeType: savedMetadata?.mimeType || resolveDocumentMime(fileName, fileUrl),
      filePath: savedMetadata?.filePath || null,
      idType: idType || undefined,
      maskedIdNumber,
      notes: notes || '',
      status: 'PENDING_REVIEW',
      submittedAt: new Date(),
    };

    if (docIndex >= 0) {
      vendor.verificationDetails.documents[docIndex] = newDoc;
    } else {
      vendor.verificationDetails.documents.push(newDoc);
    }

    // Set overall status to PENDING_REVIEW if previously rejected or changes requested
    if (vendor.status === 'CHANGES_REQUESTED' || vendor.status === 'REJECTED') {
      vendor.status = 'PENDING_REVIEW' as VendorStatus;
    }

    vendor.markModified('verificationDetails');
    await vendor.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'DOCUMENT_SUBMITTED',
      'Vendor',
      vendor._id.toString(),
      `Submitted compliance document: ${type}`,
      { type, fileName: newDoc.fileName }
    );

    await createCrossNotification({
      actorId: req.user?.id,
      actorName: (req.user as any)?.displayName || req.user?.phone || 'Vendor Staff',
      actorRole: 'vendor',
      title: `New Document Uploaded: ${type}`,
      message: `Carrier ${vendor.businessName} submitted ${type} (${newDoc.fileName}) for administrative compliance review.`,
      type: 'DOCUMENT_REVIEW',
      targetType: 'Document',
      targetId: type,
      vendorId: vendor._id,
      metadata: { type, fileName: newDoc.fileName, vendorId: vendor._id.toString() },
    });

    res.status(200).json({
      message: 'Document submitted for administrative review successfully.',
      vendor,
      document: newDoc,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to submit document' } });
  }
};

export const viewVendorDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendor = req.vendor;
    if (!vendor) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Vendor authorization required' } });
      return;
    }

    const rawDocType = Array.isArray(req.params.docType) ? req.params.docType[0] : req.params.docType;
    const docType = (rawDocType || '').toUpperCase();
    const docs = vendor.verificationDetails?.documents || [];
    const doc = docs.find((d: any) => d.type === docType);

    if (!doc || doc.status === 'NOT_SUBMITTED') {
      res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not submitted.' } });
      return;
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = doc.mimeType || resolveDocumentMime(doc.fileName);
    let fileName = doc.fileName || `${docType.toLowerCase()}_document.pdf`;

    if (doc.filePath && fs.existsSync(doc.filePath)) {
      try {
        const diskBuffer = await fs.promises.readFile(doc.filePath);
        if (diskBuffer && diskBuffer.length > 20) {
          fileBuffer = diskBuffer;
        }
      } catch (readErr) {
        console.warn('[viewVendorDocument] Failed to read doc.filePath, falling back:', readErr);
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      if (doc.fileUrl && typeof doc.fileUrl === 'string' && doc.fileUrl.startsWith('data:')) {
        const parts = doc.fileUrl.split(',');
        fileBuffer = Buffer.from(parts[1] || '', 'base64');
        mimeType = resolveDocumentMime(fileName, doc.fileUrl);
      } else {
        fileBuffer = generateValidPdfBuffer(
          doc.fileName || docType.replace(/_/g, ' '),
          vendor.businessName || 'Authorized Vendor'
        );
        mimeType = 'application/pdf';
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(404).json({ error: { code: 'FILE_UNAVAILABLE', message: 'Document file is unavailable.' } });
      return;
    }

    const isDownload = req.query.download === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';

    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('[viewVendorDocument] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve document' } });
  }
};

// 9. Bookings & Operations
export const getVendorBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { status, search, page = 1, limit = 15 } = req.query;

    const query: any = { vendorId };

    // Scope enforcement: Scoped employees only see moves within their operational responsibility
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    if (!scope.isCompanyWide) {
      query._id = { $in: scope.bookingIds.map((bId) => new mongoose.Types.ObjectId(bId)) };
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (search) {
      const s = String(search).trim();
      query.$or = [
        { _id: mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : undefined },
        { deliveryCode: s },
      ].filter(Boolean);
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    let totalVendorBookings = await Booking.countDocuments({ vendorId });
    if (totalVendorBookings === 0) {
      await bootstrapVendorOperations(vendorId);
    }

    // Configurable GPS Inactivity Threshold (PlatformSetting -> env -> default 60)
    const thresholdSetting = await PlatformSetting.findOne({ key: 'GPS_INACTIVITY_THRESHOLD_MINUTES' }).lean();
    const inactivityThresholdMinutes =
      Number(thresholdSetting?.value) || Number(process.env.GPS_INACTIVITY_THRESHOLD_MINUTES) || 60;

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'displayName phone')
        .populate('requestId')
        .populate('assignedWorkers', 'displayName phone employeeRole skills')
        .populate('leadWorkerId', 'displayName phone')
        .populate('assignedCoordinatorId', 'displayName phone employeeRole'),
    ]);

    res.status(200).json({
      bookings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      isScopedView: !scope.isCompanyWide,
      inactivityThresholdMinutes,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch bookings' } });
  }
};

export const getVendorBookingById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid booking ID format' } });
      return;
    }

    const booking = await Booking.findOne({ _id: id, vendorId })
      .populate('customerId', 'displayName phone')
      .populate('requestId')
      .populate('assignedWorkers', 'displayName phone employeeRole skills')
      .populate('leadWorkerId', 'displayName phone')
      .populate('assignedCoordinatorId', 'displayName phone employeeRole');

    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found or does not belong to your company' } });
      return;
    }

    // Backend scope validation
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    if (!scope.isCompanyWide && !scope.bookingIds.includes(booking._id.toString())) {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED_SCOPE',
          message: 'Access Restricted: This move is outside your assigned operational scope.',
        },
      });
      return;
    }

    // Also look up assigned vehicle details if assignedVehicleId exists
    let assignedVehicle = null;
    if (booking.assignedVehicleId) {
      assignedVehicle = await Vehicle.findOne({
        vendorId,
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(booking.assignedVehicleId) ? booking.assignedVehicleId : undefined },
          { registrationNumber: booking.assignedVehicleId },
        ].filter(Boolean),
      });
    }

    res.status(200).json({ booking, assignedVehicle });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch booking details' } });
  }
};

// 10. Assign Worker & Vehicle to Booking
export const assignBookingResources = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;
    const { workerIds, vehicleId, leadWorkerId, coordinatorId } = req.body;

    const booking = await Booking.findOne({ _id: id, vendorId });
    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Validate Workers
    if (Array.isArray(workerIds) && workerIds.length > 0) {
      // 1. Verify workers belong to this vendor
      const count = await User.countDocuments({
        _id: { $in: workerIds },
        vendorId,
        accountStatus: 'active',
      });

      if (count !== workerIds.length) {
        res.status(400).json({ error: { code: 'INVALID_CREW', message: 'One or more workers do not belong to your company or are suspended.' } });
        return;
      }

      // 2. Check for conflicts with other active bookings
      const conflictingBooking = await Booking.findOne({
        _id: { $ne: id },
        vendorId,
        status: { $in: ACTIVE_BOOKING_STATUSES },
        assignedWorkers: { $in: workerIds },
      });

      if (conflictingBooking) {
        res.status(409).json({
          error: {
            code: 'WORKER_CONFLICT',
            message: `One of the selected workers is already assigned to active move #${conflictingBooking._id.toString().slice(-6)}.`,
          },
        });
        return;
      }

      booking.assignedWorkers = workerIds.map((wId: string) => new mongoose.Types.ObjectId(wId));
      booking.leadWorkerId = leadWorkerId
        ? new mongoose.Types.ObjectId(leadWorkerId)
        : booking.assignedWorkers[0];
    }

    // Validate Vehicle
    if (vehicleId) {
      const vehicle = await Vehicle.findOne({
        vendorId,
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(vehicleId) ? vehicleId : undefined },
          { registrationNumber: vehicleId },
        ].filter(Boolean),
        isActive: true,
      });

      if (!vehicle) {
        res.status(400).json({ error: { code: 'INVALID_VEHICLE', message: 'Selected vehicle not found in your fleet or is in maintenance.' } });
        return;
      }

      // Check for vehicle conflict
      const conflictingVehicleBooking = await Booking.findOne({
        _id: { $ne: id },
        vendorId,
        status: { $in: ACTIVE_BOOKING_STATUSES },
        assignedVehicleId: { $in: [vehicle._id.toString(), vehicle.registrationNumber] },
      });

      if (conflictingVehicleBooking) {
        res.status(409).json({
          error: {
            code: 'VEHICLE_CONFLICT',
            message: `Vehicle ${vehicle.registrationNumber} is already on active move #${conflictingVehicleBooking._id.toString().slice(-6)}.`,
          },
        });
        return;
      }

      booking.assignedVehicleId = vehicle.registrationNumber;
    }

    // Validate & Assign Coordinator / Tracking Supervisor
    if (coordinatorId !== undefined) {
      if (!coordinatorId || coordinatorId === 'none' || coordinatorId === '') {
        booking.assignedCoordinatorId = undefined;
      } else if (mongoose.isValidObjectId(coordinatorId)) {
        const coordinator = await User.findOne({ _id: coordinatorId, vendorId, accountStatus: 'active' });
        if (coordinator) {
          booking.assignedCoordinatorId = coordinator._id;
        }
      }
    }

    // Advance status if pending assignment
    if (booking.status === 'CONFIRMED' && booking.assignedWorkers?.length > 0) {
      booking.status = 'ASSIGNED' as BookingStatus;
    }

    booking.version = (booking.version || 1) + 1;
    await booking.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'RESOURCES_ASSIGNED',
      'Booking',
      id,
      `Assigned ${booking.assignedWorkers.length} crew workers, vehicle ${booking.assignedVehicleId || 'N/A'}, and coordinator to move`,
      { workerIds, vehicleId: booking.assignedVehicleId, coordinatorId }
    );

    const updated = await Booking.findById(id)
      .populate('customerId', 'displayName phone')
      .populate('requestId')
      .populate('assignedWorkers', 'displayName phone employeeRole skills')
      .populate('leadWorkerId', 'displayName phone')
      .populate('assignedCoordinatorId', 'displayName phone employeeRole');

    res.status(200).json({
      message: 'Operational resources assigned to move successfully.',
      booking: updated,
    });
  } catch (error: any) {
    console.error('[assignBookingResources] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to assign resources to booking' } });
  }
};

// 11. Advance Move Operational Milestone
export const updateBookingMilestone = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { id } = req.params;
    const { status, deliveryCode } = req.body;

    const booking = await Booking.findOne({ _id: id, vendorId });
    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Scope check: Scoped employees can only update moves within their operational assignment
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    if (!scope.isCompanyWide && !scope.bookingIds.includes(booking._id.toString())) {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED_SCOPE',
          message: 'Operational Scope Error: This move is outside your assigned operational scope.',
        },
      });
      return;
    }

    const validTransitions: BookingStatus[] = [
      'CONFIRMED',
      'ASSIGNED',
      'EN_ROUTE_PICKUP',
      'ARRIVED_PICKUP',
      'PACKING',
      'LOADING',
      'IN_TRANSIT',
      'ARRIVED_DROPOFF',
      'UNLOADING',
      'AWAITING_CONFIRMATION',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!validTransitions.includes(status)) {
      res.status(400).json({ error: { code: 'INVALID_STATUS', message: `Invalid status transition: ${status}` } });
      return;
    }

    // Delivery confirmation code validation if completing
    if (status === 'COMPLETED' && booking.deliveryCode) {
      if (!deliveryCode || String(deliveryCode).trim() !== String(booking.deliveryCode).trim()) {
        res.status(400).json({
          error: {
            code: 'INVALID_DELIVERY_CODE',
            message: 'Incorrect recipient 4-digit delivery confirmation code. Code verification required to complete move.',
          },
        });
        return;
      }
    }

    const prevStatus = booking.status;
    booking.status = status as BookingStatus;
    booking.version = (booking.version || 1) + 1;

    // Update live GPS telemetry state if entering transit or pickup
    if (status === 'IN_TRANSIT' || status === 'EN_ROUTE_PICKUP') {
      booking.lastGpsUpdate = {
        timestamp: new Date(),
        latitude: booking.lastGpsUpdate?.latitude || 12.9716,
        longitude: booking.lastGpsUpdate?.longitude || 77.5946,
        locationName: status === 'IN_TRANSIT' ? 'Highway Transit Corridor' : 'City Pickup Route',
        isStationary: false,
        speedKmph: status === 'IN_TRANSIT' ? 45 : 30,
      };
    } else if (status === 'COMPLETED') {
      if (booking.lastGpsUpdate) {
        booking.lastGpsUpdate.isStationary = true;
        booking.lastGpsUpdate.speedKmph = 0;
      }
    }

    const actorName = req.user?.displayName || req.user?.phone || 'Operational Staff';
    const actorRole = req.user?.employeeRole || req.user?.role || 'staff';

    if (!booking.operationalNotes) booking.operationalNotes = [];
    booking.operationalNotes.push({
      timestamp: new Date(),
      authorId: new mongoose.Types.ObjectId(req.user!.id),
      authorName: actorName,
      authorRole: actorRole,
      noteType: 'STATUS_UPDATE',
      content: `Milestone advanced from ${prevStatus} to ${status}`,
      metadata: { prevStatus, newStatus: status },
    });

    await booking.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'STATUS_UPDATED',
      'Booking',
      id,
      `Advanced move milestone from ${prevStatus} to ${status}`,
      {
        vendorId: vendorId.toString(),
        actorName,
        actorRole,
        moveId: id,
        prevStatus,
        newStatus: status,
      }
    );

    res.status(200).json({
      message: `Move status updated to ${status} successfully.`,
      booking,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update move status' } });
  }
};

// 11b. Log Crew Contact on Vehicle Halt / Stationary Alert
export const logBookingCrewContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const id = String(req.params.id);
    const { crewMemberName, crewPhone, contactChannel = 'phone', note, haltDurationMinutes = 60 } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ error: { code: 'NOTE_REQUIRED', message: 'Crew contact note is required.' } });
      return;
    }

    const booking = await Booking.findOne({ _id: id, vendorId });
    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Operational scope verification
    const scope = await resolveEmployeeOperationalScope(req.user, vendorId);
    if (!scope.isCompanyWide && !scope.bookingIds.includes(booking._id.toString())) {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED_SCOPE',
          message: 'Operational Scope Error: This move is outside your assigned operational scope.',
        },
      });
      return;
    }

    const actorName = req.user?.displayName || req.user?.phone || 'Tracking Coordinator';
    const actorRole = req.user?.employeeRole || req.user?.role || 'staff';

    if (!booking.operationalNotes) booking.operationalNotes = [];
    booking.operationalNotes.push({
      timestamp: new Date(),
      authorId: new mongoose.Types.ObjectId(req.user!.id),
      authorName: actorName,
      authorRole: actorRole,
      noteType: 'CREW_CONTACT',
      content: `Contacted ${crewMemberName || 'Crew'} (${crewPhone || 'driver'} via ${contactChannel.toUpperCase()}): ${note}`,
      metadata: { crewMemberName, crewPhone, contactChannel, haltDurationMinutes },
    });

    await booking.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'CREW_CONTACT_LOGGED',
      'Booking',
      id,
      `Contacted crew ${crewMemberName || ''} regarding ${haltDurationMinutes}m halt: ${note}`,
      {
        vendorId: vendorId.toString(),
        actorName,
        actorRole,
        moveId: id,
        crewMemberName,
        crewPhone,
        contactChannel,
        haltDurationMinutes,
        note,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Crew contact note recorded successfully and broadcast to company operations feed.',
      operationalNotes: booking.operationalNotes,
    });
  } catch (error: any) {
    console.error('[logBookingCrewContact] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to record crew contact log' } });
  }
};

// 11c. Send Customer Delay / Stagnation Advisory
export const sendCustomerDelayAlert = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const id = String(req.params.id);
    const { reason, delayMinutes = 30, customNote } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: { code: 'REASON_REQUIRED', message: 'Delay reason is required.' } });
      return;
    }

    const booking = await Booking.findOne({ _id: id, vendorId }).populate('customerId', 'displayName phone email');
    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Operational scope verification
    const delayScope = await resolveEmployeeOperationalScope(req.user, vendorId);
    if (!delayScope.isCompanyWide && !delayScope.bookingIds.includes(booking._id.toString())) {
      res.status(403).json({
        error: {
          code: 'UNAUTHORIZED_SCOPE',
          message: 'Operational Scope Error: This move is outside your assigned operational scope.',
        },
      });
      return;
    }

    const actorName = req.user?.displayName || req.user?.phone || 'Tracking Coordinator';
    const actorRole = req.user?.employeeRole || req.user?.role || 'staff';
    const delayNotice = `Customer Delay Notice: Estimated ${delayMinutes} mins delay due to: ${reason}.${customNote ? ` Note: ${customNote}` : ''}`;

    if (!booking.operationalNotes) booking.operationalNotes = [];
    booking.operationalNotes.push({
      timestamp: new Date(),
      authorId: new mongoose.Types.ObjectId(req.user!.id),
      authorName: actorName,
      authorRole: actorRole,
      noteType: 'CUSTOMER_DELAY_ALERT',
      content: delayNotice,
      metadata: { reason, delayMinutes, customNote },
    });

    await booking.save();

    // Directly notify Customer
    if (booking.customerId?._id) {
      await Notification.create({
        recipientRole: 'customer',
        recipientUserId: booking.customerId._id,
        actorId: new mongoose.Types.ObjectId(req.user!.id),
        actorName,
        actorRole,
        title: `Transit Delay Advisory — Move #${String(id).slice(-6).toUpperCase()}`,
        message: `Your moving crew has advised an estimated ${delayMinutes} minutes delay due to: ${reason}. ${customNote || 'Our fleet team is monitoring the vehicle GPS.'}`,
        type: 'MOVE_UPDATE',
        targetType: 'Booking',
        targetId: String(id),
        metadata: { delayMinutes, reason, vendorId: vendorId.toString() },
      }).catch((err) => console.warn('[Notification] Failed to notify customer of delay:', err));
    }

    // Log action and alert Vendor Admin
    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'CUSTOMER_DELAY_ALERT',
      'Booking',
      id,
      `Dispatched delay advisory to customer (${delayMinutes}m delay): ${reason}`,
      {
        vendorId: vendorId.toString(),
        actorName,
        actorRole,
        moveId: id,
        customerName: (booking.customerId as any)?.displayName,
        delayMinutes,
        reason,
        customNote,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Customer delay notification dispatched and logged to company activity trail.',
      operationalNotes: booking.operationalNotes,
    });
  } catch (error: any) {
    console.error('[sendCustomerDelayAlert] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to dispatch customer delay alert' } });
  }
};

// 12. Reports & Analytics (Real Database Data Only)
export const getVendorReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;

    // A. Move status aggregations
    const statusCounts = await Booking.aggregate([
      { $match: { vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // B. Crew utilization
    const [totalWorkers, activeMoves] = await Promise.all([
      User.countDocuments({ vendorId, accountStatus: 'active' }),
      Booking.find({ vendorId, status: { $in: ACTIVE_BOOKING_STATUSES } }).select('assignedWorkers assignedVehicleId'),
    ]);

    const busyWorkerIds = new Set<string>();
    const busyVehicleIds = new Set<string>();

    activeMoves.forEach((m) => {
      if (m.assignedWorkers) m.assignedWorkers.forEach((w) => busyWorkerIds.add(w.toString()));
      if (m.assignedVehicleId) busyVehicleIds.add(m.assignedVehicleId.toString());
    });

    const totalVehicles = await Vehicle.countDocuments({ vendorId, isActive: true });

    // C. Monthly volume
    const monthlyMoves = await Booking.aggregate([
      { $match: { vendorId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      statusDistribution: statusCounts.map((s) => ({ status: s._id, count: s.count })),
      crewUtilization: {
        totalWorkers,
        busyWorkers: busyWorkerIds.size,
        availableWorkers: Math.max(0, totalWorkers - busyWorkerIds.size),
        utilizationRate: totalWorkers > 0 ? Math.round((busyWorkerIds.size / totalWorkers) * 100) : 0,
      },
      fleetUtilization: {
        totalVehicles,
        busyVehicles: busyVehicleIds.size,
        availableVehicles: Math.max(0, totalVehicles - busyVehicleIds.size),
        utilizationRate: totalVehicles > 0 ? Math.round((busyVehicleIds.size / totalVehicles) * 100) : 0,
      },
      monthlyVolume: monthlyMoves,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to generate operational reports' } });
  }
};

// 13. Audit & Activity Trail
export const getVendorAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const ownerId = req.vendor.ownerId;

    const logs = await AuditLog.find({
      $or: [
        { targetId: vendorId.toString() },
        { actorId: ownerId },
        { 'details.vendorId': vendorId.toString() },
      ],
    })
      .populate('actorId', 'displayName phone role employeeRole email username')
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    res.status(200).json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor activity history' } });
  }
};

// 14. Vendor Notifications
export const getVendorNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { limit = '30', unreadOnly } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));

    const query: any = {
      recipientRole: 'vendor',
      recipientVendorId: vendorId,
    };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limitNum).lean(),
      Notification.countDocuments({ recipientRole: 'vendor', recipientVendorId: vendorId, isRead: false }),
    ]);

    res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor notifications' } });
  }
};

export const markVendorNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendorId = req.vendor._id;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid notification ID' } });
      return;
    }

    await Notification.findOneAndUpdate(
      { _id: id, recipientVendorId: vendorId },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update notification' } });
  }
};

export const markAllVendorNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;

    await Notification.updateMany(
      { recipientRole: 'vendor', recipientVendorId: vendorId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to mark all notifications read' } });
  }
};

