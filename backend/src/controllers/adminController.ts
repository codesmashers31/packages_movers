import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { AuthenticatedRequest, DEFAULT_ROLE_PERMISSIONS, invalidatePermissionsCache } from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { Booking } from '../models/Booking.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { AuditLog } from '../models/AuditLog.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { Notification } from '../models/Notification.js';
import { UserRole, VendorStatus, BookingStatus } from '../types/index.js';
import { isDBConnected } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { resolveDocumentMime, generateValidPdfBuffer } from '../utils/fileStorage.js';
import { bootstrapVendorOperations } from '../utils/seedOperations.js';
import { sendCredentialsViaWhatsApp } from '../utils/whatsappService.js';
import { createCrossNotification } from '../utils/notificationHelper.js';
import { getVendorVerificationDecision } from '../middlewares/vendorAuth.js';

// Standardized DB connection guard
const ensureDB = (res: Response): boolean => {
  if (!isDBConnected()) {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB database is currently unreachable. Please ensure database service is running.',
      },
    });
    return false;
  }
  return true;
};

// Helper to record audit log directly in MongoDB
const logAdminAction = async (
  actorId: string | undefined,
  actorPhone: string | undefined,
  action: string,
  targetType: string,
  targetId?: string | string[],
  reason?: string,
  details?: Record<string, any>
) => {
  try {
    if (isDBConnected() && actorId && mongoose.isValidObjectId(actorId)) {
      const cleanTargetId = Array.isArray(targetId) ? targetId[0] : (targetId || '');
      await AuditLog.create({
        actorId: new mongoose.Types.ObjectId(actorId),
        actorPhone: actorPhone || '',
        action,
        targetType,
        targetId: cleanTargetId,
        reason: reason || '',
        details: details || {},
      });
    }
  } catch (err) {
    console.error('[AuditLog] Failed to record admin audit entry:', err);
  }
};

// ----------------------------------------------------
// HIGH-PERFORMANCE IN-MEMORY CACHE FOR ADMIN DATA
// ----------------------------------------------------
let cachedDashboardStats: { data: any; expiresAt: number } | null = null;
let cachedAdminDocuments: { data: { documents: any[]; stats: any }; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds

export const invalidateAdminCaches = () => {
  cachedDashboardStats = null;
  cachedAdminDocuments = null;
};

// Initial default operational data when database settings collection is empty
export const DEFAULT_SERVICE_AREAS = [
  { id: 'sa_blr_cen', name: 'Bangalore Central', code: 'BLR-CEN', city: 'Bengaluru', state: 'Karnataka', active: true },
  { id: 'sa_blr_sth', name: 'Bangalore South', code: 'BLR-STH', city: 'Bengaluru', state: 'Karnataka', active: true },
  { id: 'sa_blr_nth', name: 'Bangalore North', code: 'BLR-NTH', city: 'Bengaluru', state: 'Karnataka', active: true },
  { id: 'sa_mum_sth', name: 'South Mumbai', code: 'MUM-STH', city: 'Mumbai', state: 'Maharashtra', active: true },
  { id: 'sa_del_cen', name: 'Central Delhi', code: 'DEL-CEN', city: 'New Delhi', state: 'Delhi', active: true },
  { id: 'sa_hyd_hth', name: 'Hitec City / Madhapur', code: 'HYD-HTC', city: 'Hyderabad', state: 'Telangana', active: true },
];

export const DEFAULT_SYSTEM_SETTINGS = {
  platformName: 'Package Mover',
  supportPhone: '+91 80 4000 1234',
  supportEmail: 'support@packagemovers.in',
  operatingHours: '06:00 - 22:00 IST',
  minAdvanceNoticeHours: 4,
  maintenanceMode: false,
};

export const PERMISSIONS_METADATA = [
  {
    id: 'users:view',
    name: 'View Users',
    module: 'User Administration',
    description: 'Search, browse, and view customer, vendor, and worker user profiles.',
  },
  {
    id: 'users:create',
    name: 'Create User',
    module: 'User Administration',
    description: 'Manually register and onboard new platform users.',
  },
  {
    id: 'users:edit',
    name: 'Edit User Profile',
    module: 'User Administration',
    description: 'Update user display name, role assignment, and language preferences.',
  },
  {
    id: 'users:suspend',
    name: 'Suspend / Activate User',
    module: 'User Administration',
    description: 'Change user account status between active and suspended.',
  },
  {
    id: 'vendors:view',
    name: 'View Vendors',
    module: 'Vendor Oversight',
    description: 'Browse vendor companies, contact details, fleet coverage, and verification status.',
  },
  {
    id: 'vendors:approve',
    name: 'Approve / Reject Vendor',
    module: 'Vendor Oversight',
    description: 'Review pending onboarding applications, request documentation changes, or reject.',
  },
  {
    id: 'vendors:suspend',
    name: 'Suspend / Reactivate Vendor',
    module: 'Vendor Oversight',
    description: 'Intervene and suspend non-compliant vendors or reactivate approved vendors.',
  },
  {
    id: 'documents:view',
    name: 'View Carrier Documents',
    module: 'Compliance & Verification',
    description: 'Inspect uploaded carrier commercial licenses, GST, insurance, and vehicle RC docs.',
  },
  {
    id: 'documents:verify',
    name: 'Verify Carrier Documents',
    module: 'Compliance & Verification',
    description: 'Formally approve or reject submitted carrier compliance documents.',
  },
  {
    id: 'bookings:view',
    name: 'View Bookings',
    module: 'Move Supervision',
    description: 'Monitor active, scheduled, completed, and terminated moving operations.',
  },
  {
    id: 'bookings:manage',
    name: 'Manage Moves & Dispatches',
    module: 'Move Supervision',
    description: 'Intervene in live moves, update status, inspect delivery codes, and assign drivers.',
  },
  {
    id: 'disputes:view',
    name: 'View Disputes',
    module: 'Customer Arbitration',
    description: 'Inspect reported customer claims, damaged goods tickets, and payment disputes.',
  },
  {
    id: 'disputes:manage',
    name: 'Manage & Settle Disputes',
    module: 'Customer Arbitration',
    description: 'Arbitrate customer disputes, award refunds, and issue carrier violation warnings.',
  },
  {
    id: 'staff:view',
    name: 'View Platform Staff',
    module: 'Staff & Governance',
    description: 'Browse internal administrative employees, role assignments, and active statuses.',
  },
  {
    id: 'staff:manage',
    name: 'Manage Platform Staff',
    module: 'Staff & Governance',
    description: 'Onboard new administrative staff, issue login credentials, and assign roles.',
  },
  {
    id: 'packages:manage',
    name: 'Manage Service Packages',
    module: 'Service Catalog',
    description: 'Create, update, and manage pricing estimates and service inclusions.',
  },
  {
    id: 'service_areas:manage',
    name: 'Manage Service Areas',
    module: 'Geographic Coverage',
    description: 'Define operational cities, postal codes, and activate/deactivate coverage zones.',
  },
  {
    id: 'reports:view',
    name: 'View Analytics & Reports',
    module: 'Business Intelligence',
    description: 'Access executive telemetry, moving demand corridors, and vendor performance graphs.',
  },
  {
    id: 'audit:view',
    name: 'View Audit Logs',
    module: 'Security & Audit',
    description: 'Inspect immutable administrative audit trails and security event logs.',
  },
  {
    id: 'settings:manage',
    name: 'Manage System Settings',
    module: 'System & Security',
    description: 'Configure platform metadata, support channels, operating hours, and maintenance mode.',
  },
  {
    id: 'permissions:manage',
    name: 'Manage Role Permissions',
    module: 'System & Security',
    description: 'Grant and revoke operational capabilities across system roles.',
  },
];

export interface StandardAdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  permissions: string[];
  isSystem?: boolean;
}

export const STANDARD_ADMIN_ROLES: StandardAdminRole[] = [
  {
    id: 'super_admin',
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    description: 'Full, unrestricted administrative governance across all platform modules, audit logs, financials, and staff management.',
    department: 'Executive Governance',
    permissions: ['*'],
    isSystem: true,
  },
  {
    id: 'operations_manager',
    code: 'OPS_MGR',
    name: 'Operations Manager',
    description: 'Oversees ongoing moves, live driver tracking, dispute interventions, and carrier fulfillments.',
    department: 'Operations',
    permissions: [
      'bookings:view',
      'bookings:manage',
      'vendors:view',
      'vendors:approve',
      'vendors:suspend',
      'documents:view',
      'documents:verify',
      'disputes:view',
      'disputes:manage',
      'reports:view',
      'audit:view',
    ],
    isSystem: true,
  },
  {
    id: 'compliance_officer',
    code: 'COMPLIANCE_OFFICER',
    name: 'Compliance & Verification Officer',
    description: 'Verifies carrier licenses, commercial GST certificates, fleet insurance, and approves onboarding carriers.',
    department: 'Regulatory Compliance',
    permissions: [
      'vendors:view',
      'vendors:approve',
      'vendors:suspend',
      'documents:view',
      'documents:verify',
      'audit:view',
    ],
    isSystem: true,
  },
  {
    id: 'dispute_mediator',
    code: 'DISPUTE_MEDIATOR',
    name: 'Dispute & Claims Arbitrator',
    description: 'Handles damaged goods investigations, price escalation claims, and customer-carrier arbitration.',
    department: 'Customer Support',
    permissions: [
      'disputes:view',
      'disputes:manage',
      'bookings:view',
      'users:view',
    ],
    isSystem: true,
  },
  {
    id: 'catalog_pricing_manager',
    code: 'CATALOG_MGR',
    name: 'Catalog & Service Areas Manager',
    description: 'Configures relocation pricing packages, vehicle types, service tiers, and geographical service zones.',
    department: 'Commercial Strategy',
    permissions: [
      'packages:manage',
      'service_areas:manage',
      'settings:manage',
    ],
    isSystem: true,
  },
  {
    id: 'platform_hr_manager',
    code: 'HR_MGR',
    name: 'Platform Staff & HR Manager',
    description: 'Manages platform internal administrative employees, role delegations, and staff onboarding.',
    department: 'Human Resources',
    permissions: [
      'staff:view',
      'staff:manage',
      'permissions:manage',
      'audit:view',
    ],
    isSystem: true,
  },
];

// ----------------------------------------------------
// 1. DASHBOARD STATS
// ----------------------------------------------------
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  // Serve from in-memory cache if fresh
  if (cachedDashboardStats && cachedDashboardStats.expiresAt > Date.now()) {
    res.status(200).json(cachedDashboardStats.data);
    return;
  }

  try {
    const activeStatuses: BookingStatus[] = [
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

    const [
      totalPackages,
      serviceAreasDoc,
      recentBookings,
      recentAuditLogs,
      bookingStatusAgg,
      userRoleAgg,
      vendorStatusAgg,
    ] = await Promise.all([
      ServicePackage.countDocuments({ isActive: true }),
      PlatformSetting.findOne({ key: 'service_areas' }).lean(),
      Booking.find()
        .populate('customerId', 'displayName phone')
        .populate('vendorId', 'businessName contactPhone')
        .populate('requestId', 'pickupAddress destinationAddress preferredDate')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Vendor.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const bookingStatusDistribution = (bookingStatusAgg || []).reduce((acc: any, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const userRoleDistribution = (userRoleAgg || []).reduce((acc: any, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const vendorStatusDistribution = (vendorStatusAgg || []).reduce((acc: any, curr: any) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const totalUsers = Object.values(userRoleDistribution).reduce((sum: number, c: any) => sum + Number(c || 0), 0);
    const totalVendors = Object.values(vendorStatusDistribution).reduce((sum: number, c: any) => sum + Number(c || 0), 0);
    const pendingVendors = vendorStatusDistribution['PENDING_REVIEW'] || 0;
    const approvedVendors = vendorStatusDistribution['APPROVED'] || 0;
    const totalBookings = Object.values(bookingStatusDistribution).reduce((sum: number, c: any) => sum + Number(c || 0), 0);
    const activeBookings = activeStatuses.reduce((sum, st) => sum + (bookingStatusDistribution[st] || 0), 0);
    const completedBookings = bookingStatusDistribution['COMPLETED'] || 0;
    const terminatedBookings = bookingStatusDistribution['TERMINATED'] || 0;

    const serviceAreasCount = Array.isArray(serviceAreasDoc?.value)
      ? serviceAreasDoc.value.filter((a: any) => a.active).length
      : DEFAULT_SERVICE_AREAS.filter((a) => a.active).length;

    const responsePayload = {
      stats: {
        totalUsers,
        totalVendors,
        pendingVendorRequests: pendingVendors,
        approvedVendors,
        totalBookings,
        activeBookings,
        completedBookings,
        pendingDisputes: terminatedBookings,
        totalPackages,
        serviceAreasCount,
      },
      distributions: {
        bookingStatus: bookingStatusDistribution,
        userRoles: userRoleDistribution,
        vendorStatus: vendorStatusDistribution,
      },
      recentBookings,
      recentActivity: recentAuditLogs,
    };

    // Store in cache for 15 seconds
    cachedDashboardStats = {
      data: responsePayload,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[getDashboardStats] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch dashboard statistics' } });
  }
};

// ----------------------------------------------------
// 2. USER MANAGEMENT
// ----------------------------------------------------
export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { search, role, status, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '10' } = req.query;

    const query: any = { role: { $in: ['operations_manager', 'operations_executive'] } };
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.accountStatus = status;

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      query.$or = [
        { phone: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const validSortFields = ['displayName', 'phone', 'role', 'accountStatus', 'createdAt'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortDirection: 1 | -1 = sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(query).sort({ [sortField]: sortDirection }).skip(skip).limit(limitNum),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[getUsers] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch users' } });
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { phone, displayName, role = 'customer', accountStatus = 'active', language = 'en' } = req.body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Phone number is required' } });
      return;
    }

    const trimmedPhone = phone.trim();
    const existing = await User.findOne({ phone: trimmedPhone });
    if (existing) {
      res.status(409).json({ error: { code: 'USER_EXISTS', message: 'A user with this phone number already exists' } });
      return;
    }

    const user = await User.create({
      phone: trimmedPhone,
      displayName: displayName ? displayName.trim() : '',
      role: role as UserRole,
      accountStatus: accountStatus || 'active',
      language: language || 'en',
      verifiedAt: new Date(),
    });

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'CREATE_USER',
      'User',
      user._id.toString(),
      `Created user with role ${role}`,
      { phone: trimmedPhone, role, accountStatus }
    );

    res.status(201).json({ user });
  } catch (error) {
    console.error('[createUser] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create user' } });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid user ID' } });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('[getUserById] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch user' } });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid user ID' } });
      return;
    }

    const { displayName, role, accountStatus, language } = req.body;
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (role !== undefined) updateData.role = role;
    if (accountStatus !== undefined) updateData.accountStatus = accountStatus;
    if (language !== undefined) updateData.language = language;

    const user = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!user) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'UPDATE_USER',
      'User',
      id,
      `Updated user profile: ${Object.keys(updateData).join(', ')}`,
      updateData
    );

    res.status(200).json({ user });
  } catch (error) {
    console.error('[updateUser] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update user' } });
  }
};

// ----------------------------------------------------
// 3. ROLES & PERMISSIONS MANAGEMENT
// ----------------------------------------------------
export const getRoles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const roleCounts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const countMap: Record<string, number> = {};
    roleCounts.forEach((r: any) => {
      countMap[r._id] = r.count;
    });

    let setting = await PlatformSetting.findOne({ key: 'role_permissions' });
    const permsMap = (setting?.value as Record<string, string[]>) || DEFAULT_ROLE_PERMISSIONS;

    const roles = [
      {
        id: 'admin',
        code: 'ADMIN',
        name: 'Administrator',
        description: 'Full supervisory authority over users, vendors, moves, pricing packages, and system parameters.',
        scope: 'Platform Operations & Governance',
        permissions: permsMap['admin'] || [],
        userCount: countMap['admin'] || 0,
      },
      {
        id: 'customer',
        code: 'CUSTOMER',
        name: 'Customer',
        description: 'Relocation client requesting moving quotes, comparing bids, confirming moves, and rating services.',
        scope: 'Move Requests & Confirmation',
        permissions: permsMap['customer'] || [],
        userCount: countMap['customer'] || 0,
      },
      {
        id: 'operations_manager',
        code: 'OPERATIONS_MANAGER',
        name: 'Operations Manager',
        description: 'Oversees day-to-day operations, vendor management, employee coordination, and workflows.',
        scope: 'Operations Management',
        permissions: permsMap['operations_manager'] || [],
        userCount: countMap['operations_manager'] || 0,
      },
      {
        id: 'operations_executive',
        code: 'OPERATIONS_EXECUTIVE',
        name: 'Operations Executive',
        description: 'Handles operational tasks, vendor data, request processing, and administrative support.',
        scope: 'Operational Execution',
        permissions: permsMap['operations_executive'] || [],
        userCount: countMap['operations_executive'] || 0,
      },
    ];

    res.status(200).json({ roles });
  } catch (error) {
    console.error('[getRoles] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch roles' } });
  }
};

export const getPermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    let setting = await PlatformSetting.findOne({ key: 'role_permissions' });
    if (!setting) {
      setting = await PlatformSetting.create({
        key: 'role_permissions',
        category: 'security',
        description: 'Dynamic role to permission mappings',
        value: DEFAULT_ROLE_PERMISSIONS,
      });
    }

    res.status(200).json({
      permissionsList: PERMISSIONS_METADATA,
      rolePermissions: setting.value || DEFAULT_ROLE_PERMISSIONS,
    });
  } catch (error) {
    console.error('[getPermissions] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch permissions' } });
  }
};

export const updatePermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { role, permissionKey, granted } = req.body;

    const validRoles = ['admin', 'customer', 'operations_manager', 'operations_executive'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid role: ${role}` } });
      return;
    }

    const validPerm = PERMISSIONS_METADATA.find((p) => p.id === permissionKey);
    if (!validPerm) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid permission key: ${permissionKey}` } });
      return;
    }

    // Safety: prevent admin lockout from permissions management
    if (role === 'admin' && permissionKey === 'permissions:manage' && !granted) {
      res.status(400).json({
        error: { code: 'LOCKOUT_PREVENTION', message: 'Cannot revoke permission management from Administrator role.' },
      });
      return;
    }

    let setting = await PlatformSetting.findOne({ key: 'role_permissions' });
    const matrix: Record<string, string[]> = setting?.value
      ? JSON.parse(JSON.stringify(setting.value))
      : JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS));

    if (!Array.isArray(matrix[role])) {
      matrix[role] = [];
    }

    if (granted) {
      if (!matrix[role].includes(permissionKey)) {
        matrix[role].push(permissionKey);
      }
    } else {
      matrix[role] = matrix[role].filter((p) => p !== permissionKey);
    }

    const updatedSetting = await PlatformSetting.findOneAndUpdate(
      { key: 'role_permissions' },
      {
        $set: {
          value: matrix,
          updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    invalidatePermissionsCache();

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'UPDATE_PERMISSIONS',
      'PlatformSetting',
      'role_permissions',
      `${granted ? 'Granted' : 'Revoked'} '${permissionKey}' for role '${role}'`,
      { role, permissionKey, granted }
    );

    res.status(200).json({
      message: 'Permission matrix updated successfully',
      rolePermissions: updatedSetting.value,
    });
  } catch (error) {
    console.error('[updatePermission] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update permissions' } });
  }
};

// ----------------------------------------------------
// 3B. ADMIN STAFF & RBAC GOVERNANCE
// ----------------------------------------------------

export const getAdminEmployees = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const employees = await User.find({ role: 'admin' })
      .select('-password')
      .sort({ createdAt: -1 });

    const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    const customRoles: any[] = Array.isArray(customSetting?.value) ? customSetting!.value : [];

    const enrichedEmployees = employees.map((emp) => {
      const empObj: any = emp.toObject();
      const roleId = emp.adminRole || 'super_admin';
      const roleInfo =
        STANDARD_ADMIN_ROLES.find((r) => r.id === roleId) ||
        customRoles.find((r) => r.id === roleId) || {
          id: roleId,
          name: roleId === 'super_admin' ? 'Super Administrator' : roleId,
          department: emp.adminDepartment || 'General Administration',
          permissions: roleId === 'super_admin' ? ['*'] : [],
        };

      empObj.roleName = roleInfo.name;
      empObj.companyName = 'Package Movers Platform Administration';
      empObj.department = emp.adminDepartment || (roleInfo as any).department || 'General Administration';
      empObj.resolvedPermissions =
        Array.isArray(emp.permissions) && emp.permissions.length > 0
          ? emp.permissions
          : roleInfo.permissions || [];

      return empObj;
    });

    res.status(200).json({ employees: enrichedEmployees });
  } catch (error) {
    console.error('[getAdminEmployees] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch platform staff' } });
  }
};

export const createAdminEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { displayName, phone, email: customEmail, adminRole = 'operations_manager', adminDepartment, permissions = [] } = req.body;

    const isSuperAdmin = req.user?.phone === '+919876543210' || (req.user as any)?.adminRole === 'super_admin';
    if (adminRole === 'super_admin' && !isSuperAdmin) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only a Super Administrator can onboard new super_admin accounts.' } });
      return;
    }

    if (!displayName || !phone) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Employee full name and phone number are required.' },
      });
      return;
    }

    const cleanName = String(displayName).trim();
    const cleanPhone = String(phone).trim();

    // Check phone uniqueness
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const phoneCandidates = new Set<string>([cleanPhone]);
    if (digitsOnly.length >= 10) {
      const ten = digitsOnly.slice(-10);
      phoneCandidates.add(ten);
      phoneCandidates.add(`+91${ten}`);
      phoneCandidates.add(`+91 ${ten}`);
      phoneCandidates.add(`91${ten}`);
    }

    const existing = await User.findOne({
      $or: [
        { phone: { $in: Array.from(phoneCandidates) } },
        ...(digitsOnly.length >= 10 ? [{ phone: { $regex: new RegExp(`${digitsOnly.slice(-10)}$`) } }] : []),
      ],
    });

    if (existing) {
      const existingName = existing.displayName ? ` (${existing.displayName})` : '';
      res.status(409).json({
        error: {
          code: 'PHONE_EXISTS',
          message: `A user account with phone number "${cleanPhone}" already exists${existingName}. Please use a different phone number.`,
        },
      });
      return;
    }

    // 1. Generate unique username
    const baseUsername = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '') || 'staff';

    let username = baseUsername;
    const userWithSameName = await User.findOne({ username });
    if (userWithSameName) {
      username = `${baseUsername}.${Math.floor(100 + Math.random() * 900)}`;
    }

    // 2. Email
    const email = customEmail && customEmail.includes('@')
      ? customEmail.toLowerCase().trim()
      : `${username}@packagemovers.in`;

    // 3. Password
    const defaultPassword = 'AdminPass@2026';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // 4. Resolve human-readable role name
    const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    const customRoles: any[] = Array.isArray(customSetting?.value) ? customSetting!.value : [];
    const matchedRole =
      STANDARD_ADMIN_ROLES.find((r) => r.id === adminRole) ||
      customRoles.find((r) => r.id === adminRole);
    const roleName = matchedRole?.name || adminRole;
    const department = adminDepartment || (matchedRole as any)?.department || 'General Administration';

    const employee = await User.create({
      phone: cleanPhone,
      username,
      email,
      password: hashedPassword,
      mustChangePassword: true,
      plainTempPassword: defaultPassword,
      displayName: cleanName,
      role: 'admin',
      adminRole,
      adminDepartment: department,
      permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : undefined,
      accountStatus: 'active',
      verifiedAt: new Date(),
    });

    // 5. Dispatch WhatsApp notification
    let waResult: any = null;
    try {
      waResult = await sendCredentialsViaWhatsApp({
        employeeName: cleanName,
        phone: cleanPhone,
        username,
        email,
        defaultPassword,
        roleName,
        companyName: 'Package Mover Administrative Headquarters',
        portalUrl: 'http://localhost:3000/admin/login',
      });
    } catch (waErr) {
      console.warn('[createAdminEmployee] WhatsApp dispatch failed:', waErr);
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'ADMIN_EMPLOYEE_CREATED',
      'User',
      employee._id.toString(),
      `Onboarded admin staff ${cleanName} (${roleName}) - WhatsApp credentials dispatched`,
      { adminRole, username, email }
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
    console.error('[createAdminEmployee] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to onboard admin employee' } });
  }
};

export const getAdminEmployeeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid employee ID format' } });
      return;
    }

    const isSelf = req.user?.id === String(id);
    const isSuperAdmin = req.user?.phone === '+919876543210' || (req.user as any)?.adminRole === 'super_admin';

    if (!isSelf && !isSuperAdmin) {
      const { resolveUserPermissions } = await import('./authController.js');
      const caller = await User.findById(req.user?.id);
      const callerPerms = caller ? await resolveUserPermissions(caller) : [];
      const canView = callerPerms.some((p) =>
        ['staff:view', 'staff:manage', 'permissions:manage', '*'].includes(p)
      );
      if (!canView) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view other staff profiles.',
          },
        });
        return;
      }
    }

    const employee = await User.findOne({ _id: id, role: 'admin' })
      .populate('reportsTo', 'displayName phone adminRole username email')
      .select('-password -plainTempPassword -resetPasswordToken');

    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin employee not found' } });
      return;
    }

    const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    const customRoles: any[] = Array.isArray(customSetting?.value) ? customSetting!.value : [];

    const roleId = employee.adminRole || 'super_admin';
    const roleInfo =
      STANDARD_ADMIN_ROLES.find((r) => r.id === roleId) ||
      customRoles.find((r) => r.id === roleId) || {
        id: roleId,
        name: roleId === 'super_admin' ? 'Super Administrator' : roleId,
        department: employee.adminDepartment || 'General Administration',
        permissions: roleId === 'super_admin' ? ['*'] : [],
      };

    const directReports = await User.find({
      reportsTo: employee._id,
      accountStatus: { $ne: 'deleted' },
    }).select('_id displayName username phone adminRole adminDepartment accountStatus createdAt');

    // Real MongoDB AuditLog records involving this admin
    const recentActivity = await AuditLog.find({
      $or: [
        { actorId: employee._id },
        { targetId: employee._id.toString() },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const empObj: any = employee.toObject();
    empObj.roleName = roleInfo.name;
    empObj.department = employee.adminDepartment || (roleInfo as any).department || 'General Administration';

    // Effective permissions: (Role Defaults + Granted) - Revoked
    let effectivePermissions: string[] = [];
    if (roleId === 'super_admin' || employee.phone === '+919876543210') {
      effectivePermissions = ['*'];
    } else {
      const basePerms = roleInfo.permissions || [];
      const granted = employee.permissionOverrides?.granted || [];
      const revoked = employee.permissionOverrides?.revoked || [];
      if (granted.length > 0 || revoked.length > 0) {
        effectivePermissions = Array.from(new Set([...basePerms, ...granted])).filter((p) => !revoked.includes(p));
      } else if (Array.isArray(employee.permissions) && employee.permissions.length > 0) {
        effectivePermissions = employee.permissions;
      } else {
        effectivePermissions = basePerms;
      }
    }

    empObj.companyName = 'Package Movers Platform Administration';

    res.status(200).json({
      employee: empObj,
      companyName: 'Package Movers Platform Administration',
      roleInfo,
      effectivePermissions,
      permissionOverrides: employee.permissionOverrides || { granted: [], revoked: [] },
      directReports,
      recentActivity,
    });
  } catch (error: any) {
    console.error('[getAdminEmployeeById] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin employee profile' } });
  }
};

export const updateAdminEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;
    const { displayName, adminRole, adminDepartment, department, reportsTo, permissions, permissionOverrides, accountStatus } = req.body;

    const employee = await User.findOne({ _id: id, role: 'admin' });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin employee not found' } });
      return;
    }

    const isSelf = req.user?.id === String(id);
    const isSuperAdmin = req.user?.phone === '+919876543210' || (req.user as any)?.adminRole === 'super_admin';

    // Prevent self-privilege escalation
    if (isSelf && !isSuperAdmin) {
      if (adminRole !== undefined || permissions !== undefined || permissionOverrides !== undefined || accountStatus !== undefined) {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You cannot alter your own admin role, permissions, or account status.' },
        });
        return;
      }
    }

    // Only super_admin can assign super_admin
    if (adminRole === 'super_admin' && !isSuperAdmin) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only a Super Administrator can assign the super_admin role.' },
      });
      return;
    }

    // Updating roles, permissions, or overrides requires permissions:manage or staff:manage
    if ((permissions !== undefined || permissionOverrides !== undefined || adminRole !== undefined) && !isSuperAdmin) {
      const { resolveUserPermissions } = await import('./authController.js');
      const caller = await User.findById(req.user?.id);
      const callerPerms = caller ? await resolveUserPermissions(caller) : [];
      if (!callerPerms.includes('permissions:manage') && !callerPerms.includes('staff:manage') && !callerPerms.includes('*')) {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'You do not have permission to modify staff roles or permissions.' },
        });
        return;
      }
    }

    // Protect root admin from suspension or demotion
    if (employee.phone === '+919876543210' && (accountStatus === 'suspended' || (adminRole && adminRole !== 'super_admin'))) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'The platform root Super Administrator cannot be suspended or demoted.' },
      });
      return;
    }

    // ReportsTo validation
    if (reportsTo !== undefined) {
      if (reportsTo && reportsTo !== 'none') {
        if (String(id) === String(reportsTo)) {
          res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'An admin cannot report to themselves.' } });
          return;
        }
        const manager = await User.findOne({ _id: reportsTo, role: 'admin' });
        if (!manager) {
          res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Designated manager not found or is not an administrator.' } });
          return;
        }
        employee.reportsTo = new mongoose.Types.ObjectId(reportsTo);
      } else {
        employee.reportsTo = undefined;
      }
    }

    if (displayName) employee.displayName = displayName.trim();
    if (adminRole) employee.adminRole = adminRole;
    if (adminDepartment) employee.adminDepartment = adminDepartment.trim();
    if (department) employee.department = department.trim();
    if (accountStatus) employee.accountStatus = accountStatus;

    // Granular permission overrides
    if (permissionOverrides !== undefined) {
      const granted = Array.isArray(permissionOverrides?.granted) ? permissionOverrides.granted : [];
      const revoked = Array.isArray(permissionOverrides?.revoked) ? permissionOverrides.revoked : [];
      employee.permissionOverrides = { granted, revoked };

      const activeRoleId = adminRole || employee.adminRole || 'super_admin';
      const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
      const customRoles: any[] = Array.isArray(customSetting?.value) ? customSetting!.value : [];
      const matchedRole =
        STANDARD_ADMIN_ROLES.find((r) => r.id === activeRoleId) ||
        customRoles.find((r) => r.id === activeRoleId);
      const basePerms = matchedRole?.permissions || [];
      employee.permissions = Array.from(new Set([...basePerms, ...granted])).filter((p) => !revoked.includes(p));
    } else if (Array.isArray(permissions)) {
      employee.permissions = permissions;
    }

    await employee.save();
    invalidatePermissionsCache(Array.isArray(id) ? id[0] : id);

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'ADMIN_EMPLOYEE_UPDATED',
      'User',
      id,
      `Updated admin staff profile for ${employee.displayName}`,
      { adminRole, accountStatus, adminDepartment }
    );

    const updatedEmp = await User.findById(id)
      .populate('reportsTo', 'displayName phone adminRole username email')
      .select('-password -plainTempPassword');

    res.status(200).json({ employee: updatedEmp });
  } catch (error: any) {
    console.error('[updateAdminEmployee] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update admin employee' } });
  }
};

export const resendAdminEmployeeCredentials = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;

    const employee = await User.findOne({ _id: id, role: 'admin' });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin employee not found' } });
      return;
    }

    let updated = false;
    if (!employee.username) {
      employee.username = employee.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '') || 'staff';
      updated = true;
    }

    if (!employee.email) {
      employee.email = `${employee.username}@packagemovers.in`;
      updated = true;
    }

    const defaultPassword = employee.plainTempPassword || 'AdminPass@2026';
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
      STANDARD_ADMIN_ROLES.find((r) => r.id === employee.adminRole)?.name ||
      employee.adminRole ||
      'Staff Member';

    const waResult = await sendCredentialsViaWhatsApp({
      employeeName: employee.displayName,
      phone: employee.phone,
      username: employee.username,
      email: employee.email,
      defaultPassword,
      roleName,
      companyName: 'Package Mover Administrative Headquarters',
      portalUrl: 'http://localhost:3000/admin/login',
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
    console.error('[resendAdminEmployeeCredentials] Error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to resend credentials' } });
  }
};

export const deleteAdminEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;

    const employee = await User.findOne({ _id: id, role: 'admin' });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Admin employee not found' } });
      return;
    }

    // Protect root admin and self-deletion
    if (employee.phone === '+919876543210') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Root Super Administrator account cannot be deleted.' } });
      return;
    }
    if (req.user?.id === id) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You cannot delete your own administrative account.' } });
      return;
    }

    await User.findByIdAndDelete(id);

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'ADMIN_EMPLOYEE_DELETED',
      'User',
      id,
      `Removed admin staff member: ${employee.displayName} (${employee.phone})`
    );

    res.status(200).json({ success: true, message: `Staff member ${employee.displayName} has been removed.` });
  } catch (error) {
    console.error('[deleteAdminEmployee] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to remove admin employee' } });
  }
};

export const getAdminRoles = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const adminUsers = await User.find({ role: 'admin' });
    const countMap: Record<string, number> = {};
    for (const u of adminUsers) {
      const r = u.adminRole || 'super_admin';
      countMap[r] = (countMap[r] || 0) + 1;
    }

    const customSetting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    const customRoles: any[] = Array.isArray(customSetting?.value) ? customSetting!.value : [];

    const roleMap = new Map<string, any>();
    for (const r of STANDARD_ADMIN_ROLES) {
      roleMap.set(r.id, {
        ...r,
        userCount: countMap[r.id] || 0,
      });
    }
    for (const r of customRoles) {
      roleMap.set(r.id, {
        ...r,
        isSystem: false,
        userCount: countMap[r.id] || 0,
      });
    }
    const allRoles = Array.from(roleMap.values());

    res.status(200).json({ roles: allRoles, permissionsList: PERMISSIONS_METADATA });
  } catch (error) {
    console.error('[getAdminRoles] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin roles' } });
  }
};

export const createAdminRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { name, description, department, permissions } = req.body;

    if (!name || !description || !Array.isArray(permissions) || permissions.length === 0) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Role name, description, and at least one permission are required.' },
      });
      return;
    }

    const roleId = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    if (STANDARD_ADMIN_ROLES.some((r) => r.id === roleId)) {
      res.status(409).json({ error: { code: 'ROLE_EXISTS', message: 'A standard system role with this identifier already exists.' } });
      return;
    }

    let setting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    if (!setting) {
      setting = await PlatformSetting.create({
        key: 'custom_admin_roles',
        category: 'security',
        description: 'Custom platform administrative roles',
        value: [],
      });
    }

    const customRoles: any[] = Array.isArray(setting.value) ? setting.value : [];
    if (customRoles.some((r) => r.id === roleId)) {
      res.status(409).json({ error: { code: 'ROLE_EXISTS', message: 'A custom role with this identifier already exists.' } });
      return;
    }

    const newRole = {
      id: roleId,
      code: roleId.toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      department: department?.trim() || 'General Operations',
      permissions: permissions.map((p: any) => String(p).trim()).filter(Boolean),
      isSystem: false,
      createdAt: new Date(),
    };

    customRoles.push(newRole);
    setting.value = customRoles;
    setting.markModified('value');
    await setting.save();
    invalidatePermissionsCache();

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'ADMIN_ROLE_CREATED',
      'PlatformSetting',
      roleId,
      `Created custom admin role: ${newRole.name}`,
      newRole
    );

    res.status(201).json({ role: newRole });
  } catch (error) {
    console.error('[createAdminRole] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create admin role' } });
  }
};

export const updateAdminRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;
    const { name, description, department, permissions } = req.body;

    if (STANDARD_ADMIN_ROLES.some((r) => r.id === id)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Standard system roles cannot be directly modified.' } });
      return;
    }

    const setting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    if (!setting || !Array.isArray(setting.value)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom role not found' } });
      return;
    }

    const customRoles: any[] = setting.value;
    const roleIndex = customRoles.findIndex((r) => r.id === id);
    if (roleIndex === -1) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom role not found' } });
      return;
    }

    if (name) customRoles[roleIndex].name = name.trim();
    if (description) customRoles[roleIndex].description = description.trim();
    if (department) customRoles[roleIndex].department = department.trim();
    if (Array.isArray(permissions) && permissions.length > 0) {
      customRoles[roleIndex].permissions = permissions.map((p: any) => String(p).trim()).filter(Boolean);
    }

    setting.markModified('value');
    await setting.save();
    invalidatePermissionsCache();

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'ADMIN_ROLE_UPDATED',
      'PlatformSetting',
      id,
      `Updated custom admin role: ${customRoles[roleIndex].name} (${id})`,
      customRoles[roleIndex]
    );

    res.status(200).json({ role: customRoles[roleIndex] });
  } catch (error) {
    console.error('[updateAdminRole] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update admin role' } });
  }
};

export const deleteAdminRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;

    if (STANDARD_ADMIN_ROLES.some((r) => r.id === id)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Standard system roles cannot be deleted.' } });
      return;
    }

    const setting = await PlatformSetting.findOne({ key: 'custom_admin_roles' });
    if (!setting || !Array.isArray(setting.value)) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom role not found' } });
      return;
    }

    const customRoles: any[] = setting.value;
    const target = customRoles.find((r) => r.id === id);
    const filtered = customRoles.filter((r) => r.id !== id);
    if (filtered.length === customRoles.length) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Custom role not found' } });
      return;
    }

    setting.value = filtered;
    setting.markModified('value');
    await setting.save();

    // Reassign any users with this role to operations_manager
    await User.updateMany({ role: 'admin', adminRole: id }, { $set: { adminRole: 'operations_manager' } });
    invalidatePermissionsCache();

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'ADMIN_ROLE_DELETED',
      'PlatformSetting',
      id,
      `Deleted custom admin role: ${target?.name || id}`,
      { deletedRoleId: id, previousRole: target }
    );

    res.status(200).json({ success: true, message: `Role ${id} deleted successfully.` });
  } catch (error) {
    console.error('[deleteAdminRole] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete admin role' } });
  }
};

// ----------------------------------------------------
// 4. VENDOR MANAGEMENT
// ----------------------------------------------------
export const getVendors = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { search, status, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '10' } = req.query;

    const query: any = {};
    if (status && status !== 'all') query.status = status;

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      query.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { contactPhone: { $regex: q, $options: 'i' } },
        { contactEmail: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const validSortFields = ['businessName', 'contactPhone', 'status', 'createdAt'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortDirection: 1 | -1 = sortOrder === 'asc' ? 1 : -1;

    const tStart = Date.now();
    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate('ownerId', 'displayName phone')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Vendor.countDocuments(query),
    ]);
    const tFind = Date.now();

    const vendorIds = vendors.map((v: any) => v._id);
    const employeeCounts = await User.aggregate([
      { $match: { vendorId: { $in: vendorIds }, accountStatus: { $ne: 'deleted' } } },
      { $group: { _id: '$vendorId', count: { $sum: 1 } } },
    ]);
    const tAgg = Date.now();
    const empCountMap: Record<string, number> = {};
    employeeCounts.forEach((ec: any) => {
      empCountMap[ec._id.toString()] = ec.count;
    });

    const vendorsWithDocUrls = vendors.map((v: any) => {
      const vObj: any = { ...v };
      vObj.employeeCount = empCountMap[v._id.toString()] || 0;
      vObj.customRolesCount = v.customRoles?.length || 0;
      vObj.customServicesCount = v.customServices?.length || 0;
      if (vObj.verificationDetails?.documents && Array.isArray(vObj.verificationDetails.documents)) {
        vObj.verificationDetails.documents = vObj.verificationDetails.documents.map((d: any) => ({
          ...d,
          fileUrl: `/api/v1/admin/vendors/${v._id.toString()}/documents/${d.type}/view`,
        }));
      }
      return vObj;
    });
    res.status(200).json({
      vendors: vendorsWithDocUrls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[getVendors] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendors' } });
  }
};

export const createVendorCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { businessName, contactPhone, contactEmail, serviceAreas, servicesOffered } = req.body;

    if (!businessName || !contactPhone) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Business name and contact phone are required' } });
      return;
    }

    // Generate secure 32-byte cryptographic invitation token
    const rawInvitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTokenHash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
    const invitationExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day token expiry

    // Ensure owner user account exists and has vendor role
    let owner = await User.findOne({ phone: contactPhone.trim() });
    if (!owner) {
      owner = await User.create({
        phone: contactPhone.trim(),
        email: contactEmail ? contactEmail.trim().toLowerCase() : undefined,
        displayName: businessName.trim(),
        role: 'vendor',
        accountStatus: 'active',
        mustChangePassword: true,
        invitationTokenHash,
        invitationExpires,
        verifiedAt: new Date(),
      });
    } else {
      owner.role = 'vendor';
      if (contactEmail) owner.email = contactEmail.trim().toLowerCase();
      owner.mustChangePassword = true;
      owner.invitationTokenHash = invitationTokenHash;
      owner.invitationExpires = invitationExpires;
      await owner.save();
    }

    const vendor = await Vendor.create({
      ownerId: owner._id,
      businessName: businessName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : undefined,
      status: 'PENDING_REVIEW', // Vendor onboarding starts in PENDING_REVIEW
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : [],
      servicesOffered: Array.isArray(servicesOffered) ? servicesOffered : [],
      verificationDetails: {
        createdViaAdminInvitation: true,
        invitedAt: new Date(),
        documents: [],
      },
    });

    // Update owner's vendorId
    owner.vendorId = vendor._id;
    await owner.save();

    // Bootstrap starter services and operations for newly created vendor
    try {
      await bootstrapVendorOperations(vendor._id);
    } catch (bootErr) {
      console.warn('[createVendorCompany] Starter operations bootstrap warning:', bootErr);
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'CREATE_VENDOR',
      'Vendor',
      vendor._id.toString(),
      `Created vendor company ${businessName} with invitation token (PENDING_REVIEW)`,
      { businessName, contactPhone, vendorId: vendor._id.toString() }
    );

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const invitationUrl = `${baseUrl}/auth/accept-invitation?token=${rawInvitationToken}`;

    res.status(201).json({
      message: 'Vendor company created successfully with invitation credentials.',
      vendor,
      invitationUrl,
      invitationToken: rawInvitationToken,
      deliveryStatus: {
        email: 'pending_provider_configuration',
        sms: 'pending_provider_configuration',
        message: 'No external email/SMS provider configured. Please provide the invitation URL directly to the vendor owner.',
      },
    });
  } catch (error) {
    console.error('[createVendorCompany] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create vendor' } });
  }
};

export const getVendorById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const vendor = await Vendor.findById(id).populate('ownerId', 'displayName phone email');
    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    const vendorObj: any = vendor.toObject ? vendor.toObject() : vendor;
    const vendorId = vendor._id;

    // Derived workforce counts directly from MongoDB User collection
    const [totalEmployees, crewWorkers, activeEmployees] = await Promise.all([
      User.countDocuments({ vendorId, accountStatus: { $ne: 'deleted' } }),
      User.countDocuments({ vendorId, role: 'worker', accountStatus: { $ne: 'deleted' } }),
      User.countDocuments({ vendorId, accountStatus: 'active' }),
    ]);

    vendorObj.employeeCount = totalEmployees;
    vendorObj.workforce = {
      totalEmployees,
      crewWorkers,
      activeEmployees,
    };
    vendorObj.customRolesCount = vendor.customRoles?.length || 0;
    vendorObj.customServicesCount = vendor.customServices?.length || 0;

    const docs = vendorObj.verificationDetails?.documents || [];

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
      // Section 3: Operational Compliance (Optional / Service-Specific)
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
        fileUrl: submitted ? `/api/v1/admin/vendors/${vendorId.toString()}/documents/${std.type}/view` : null,
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

    // Evaluate central verification access decision across all 6 blocking documents
    const verificationDecision = getVendorVerificationDecision({
      ...vendorObj,
      verificationDetails: {
        ...vendorObj.verificationDetails,
        documents: documentChecklist,
      },
    });

    vendorObj.coreApprovedCount = coreApprovedCount;
    vendorObj.coreRequiredCount = coreRequiredCount;
    vendorObj.coreVerificationComplete = coreVerificationComplete;
    vendorObj.totalApprovedCount = totalApprovedCount;
    vendorObj.totalRequiredCount = totalRequiredCount;
    vendorObj.allDocumentsApproved = allDocumentsApproved;
    vendorObj.verificationDecision = verificationDecision;
    vendorObj.verificationAccess = verificationDecision.verificationAccess;
    vendorObj.verificationStatus = verificationDecision.verificationStatus;
    vendorObj.documents = documentChecklist;
    if (vendorObj.verificationDetails) {
      vendorObj.verificationDetails.documents = documentChecklist;
      vendorObj.verificationDetails.coreApprovedCount = coreApprovedCount;
      vendorObj.verificationDetails.coreRequiredCount = coreRequiredCount;
      vendorObj.verificationDetails.coreVerificationComplete = coreVerificationComplete;
      vendorObj.verificationDetails.totalApprovedCount = totalApprovedCount;
      vendorObj.verificationDetails.totalRequiredCount = totalRequiredCount;
      vendorObj.verificationDetails.allDocumentsApproved = allDocumentsApproved;
      vendorObj.verificationDetails.verificationDecision = verificationDecision;
    }

    res.status(200).json({ vendor: vendorObj, verificationDecision });
  } catch (error) {
    console.error('[getVendorById] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch vendor' } });
  }
};

export const reviewVendorApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { decision, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const validDecisions = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];
    if (!validDecisions.includes(decision)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid decision: ${decision}` } });
      return;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      {
        $set: {
          status: decision as VendorStatus,
          'verificationDetails.lastReviewedAt': new Date(),
          'verificationDetails.reviewReason': reason || '',
        },
      },
      { new: true }
    );

    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    invalidateAdminCaches();

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      `VENDOR_${decision}`,
      'Vendor',
      id,
      reason || `Vendor application marked as ${decision}`,
      { decision, reason }
    );

    // If whole application is approved, also mark all existing documents as APPROVED
    if (decision === 'APPROVED' && Array.isArray(vendor.verificationDetails?.documents)) {
      vendor.verificationDetails.documents.forEach((d: any) => {
        d.status = 'APPROVED';
        d.reviewedAt = new Date();
      });
      vendor.markModified('verificationDetails');
      await vendor.save();
    }

    await createCrossNotification({
      actorId: req.user?.id,
      actorName: (req.user as any)?.displayName || req.user?.phone || 'Admin Staff',
      actorRole: 'admin',
      title: `Carrier Application: ${decision}`,
      message: `${(req.user as any)?.displayName || 'Admin staff'} marked carrier application for ${vendor.businessName} as ${decision}.${reason ? ` Notes: "${reason}"` : ''}`,
      type: 'APPLICATION_DECISION',
      targetType: 'Vendor',
      targetId: id,
      vendorId: vendor._id,
      metadata: { decision, reason, vendorId: id },
    });

    // Invalidate admin caches immediately so subsequent queries get fresh database state
    invalidateAdminCaches();

    res.status(200).json({ vendor });
  } catch (error) {
    console.error('[reviewVendorApplication] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to review vendor application' } });
  }
};

export const STANDARD_COMPLIANCE_META: Record<string, { title: string; category: string; section: string; required: boolean; description: string }> = {
  GST_CERTIFICATE: {
    title: 'GST Registration Certificate',
    category: 'COMPANY',
    section: 'COMPANY',
    required: true,
    description: 'Core business identity document required for company approval.',
  },
  BUSINESS_PAN: {
    title: 'Company / Business PAN Card',
    category: 'COMPANY',
    section: 'COMPANY',
    required: true,
    description: 'Permanent Account Number registered with the Income Tax Department.',
  },
  REPRESENTATIVE_ID_PROOF: {
    title: 'Government Identity Proof',
    category: 'REPRESENTATIVE',
    section: 'REPRESENTATIVE',
    required: true,
    description: 'Official government-issued identity proof (Aadhaar, Passport, Driving Licence) of owner / representative.',
  },
  REPRESENTATIVE_PHOTO: {
    title: 'Representative Photo / Camera Capture',
    category: 'REPRESENTATIVE',
    section: 'REPRESENTATIVE',
    required: true,
    description: 'Recent photograph of the business owner or authorized representative for identity verification.',
  },
  TRANSPORT_PERMIT: {
    title: 'All India Goods Transport Permit',
    category: 'OPERATIONAL',
    section: 'OPERATIONAL',
    required: false,
    description: 'Commercial logistics transport permit (operational compliance; mandatory for operational permissions).',
  },
  TRANSIT_INSURANCE: {
    title: 'Goods In-Transit Insurance Policy',
    category: 'OPERATIONAL',
    section: 'OPERATIONAL',
    required: false,
    description: 'Cargo and goods transit indemnity insurance (operational compliance; mandatory for operational permissions).',
  },
};

export const CORE_VERIFICATION_DOCS = [
  'GST_CERTIFICATE',
  'BUSINESS_PAN',
  'REPRESENTATIVE_ID_PROOF',
  'REPRESENTATIVE_PHOTO',
];

export const OPERATIONAL_COMPLIANCE_DOCS = [
  'TRANSPORT_PERMIT',
  'TRANSIT_INSURANCE',
];

export const REQUIRED_COMPLIANCE_DOCS = [
  'GST_CERTIFICATE',
  'BUSINESS_PAN',
  'REPRESENTATIVE_ID_PROOF',
  'REPRESENTATIVE_PHOTO',
  'TRANSPORT_PERMIT',
  'TRANSIT_INSURANCE',
];

export const reviewVendorDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const docType = Array.isArray(req.params.docType) ? req.params.docType[0] : req.params.docType;
    const { decision, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const validDecisions = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'PENDING_REVIEW'];
    if (!validDecisions.includes(decision)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid decision: ${decision}` } });
      return;
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    if (!vendor.verificationDetails) vendor.verificationDetails = {};
    if (!Array.isArray(vendor.verificationDetails.documents)) {
      vendor.verificationDetails.documents = [];
    }

    const reviewerName = (req.user as any)?.displayName || req.user?.phone || req.user?.id || 'Admin Staff';
    const fallbackFeedback =
      decision === 'APPROVED'
        ? 'Approved and verified by administrator.'
        : decision === 'CHANGES_REQUESTED'
        ? 'Revision requested: please upload an updated and clear copy.'
        : decision === 'REJECTED'
        ? 'Document rejected by administrator.'
        : '';
    const finalFeedback = reason !== undefined && reason !== null && reason !== '' ? reason : fallbackFeedback;

    const docIndex = vendor.verificationDetails.documents.findIndex((d: any) => d.type === docType);
    const updatedDocData = {
      type: docType,
      status: decision,
      feedback: finalFeedback,
      reviewedAt: new Date(),
      reviewedBy: reviewerName,
    };

    if (docIndex >= 0) {
      vendor.verificationDetails.documents[docIndex] = {
        ...vendor.verificationDetails.documents[docIndex],
        ...updatedDocData,
      };
    } else {
      vendor.verificationDetails.documents.push(updatedDocData);
    }

    // Individual document review updates the document within verificationDetails.
    // Vendor overall account status (vendor.status) remains separate and governed by vendor account review.
    vendor.verificationDetails.lastReviewedAt = new Date();
    if (finalFeedback) {
      vendor.verificationDetails.reviewReason = finalFeedback;
    }

    vendor.markModified('verificationDetails');
    await vendor.save();
    invalidateAdminCaches();

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      `VENDOR_DOC_${decision}`,
      'Vendor',
      id,
      finalFeedback || `Document ${docType} marked as ${decision}`,
      { docType, decision, reason: finalFeedback }
    );

    await createCrossNotification({
      actorId: req.user?.id,
      actorName: reviewerName,
      actorRole: 'admin',
      title: decision === 'APPROVED' ? `Document Approved: ${docType}` : decision === 'CHANGES_REQUESTED' ? `Document Revision Requested: ${docType}` : `Document Rejected: ${docType}`,
      message: `${reviewerName} marked ${docType} for carrier ${vendor.businessName} as ${decision}.${finalFeedback ? ` Notes: "${finalFeedback}"` : ''}`,
      type: 'DOCUMENT_REVIEW',
      targetType: 'Document',
      targetId: docType,
      vendorId: vendor._id,
      metadata: { docType, decision, reason: finalFeedback, vendorId: id },
    });

    // Format authoritative document item and company dossier for instant response
    const formattedDocs = vendor.verificationDetails.documents.map((d: any) => {
      const meta = STANDARD_COMPLIANCE_META[d.type] || {
        title: d.type,
        category: 'BUSINESS',
        description: 'Platform verification document',
      };
      return {
        vendorId: vendor._id.toString(),
        businessName: vendor.businessName,
        vendorPhone: vendor.contactPhone,
        vendorEmail: vendor.contactEmail,
        vendorStatus: vendor.status,
        type: d.type,
        title: meta.title,
        category: meta.category,
        description: meta.description,
        fileUrl: `/api/v1/admin/vendors/${vendor._id.toString()}/documents/${d.type}/view`,
        fileName: d.fileName || `${d.type.toLowerCase()}_document.pdf`,
        fileSize: d.fileSize || '1.2 MB',
        idType: d.idType,
        maskedIdNumber: d.maskedIdNumber,
        notes: d.notes,
        status: d.status || 'PENDING_REVIEW',
        submittedAt: d.submittedAt || vendor.createdAt,
        reviewedAt: d.reviewedAt,
        reviewedBy: d.reviewedBy,
        feedback: d.feedback,
      };
    });

    const approvedCount = formattedDocs.filter((d: any) => d.status === 'APPROVED').length;
    const pendingCount = formattedDocs.filter((d: any) => d.status === 'PENDING_REVIEW').length;
    const changesRequestedCount = formattedDocs.filter((d: any) => d.status === 'CHANGES_REQUESTED').length;
    const rejectedCount = formattedDocs.filter((d: any) => d.status === 'REJECTED').length;
    const totalDocuments = formattedDocs.length;
    const coreApprovedCount = formattedDocs.filter(
      (d: any) => CORE_VERIFICATION_DOCS.includes(d.type) && d.status === 'APPROVED'
    ).length;
    const coreRequiredCount = 4;
    const coreVerificationComplete = coreApprovedCount === 4;
    const totalRequired = 6;
    const totalRequiredCount = 6;
    const allDocumentsApproved = approvedCount === 6;
    const compliancePercentage = Math.round((approvedCount / 6) * 100);

    const verificationDecision = getVendorVerificationDecision(vendor);

    const companyDossier = {
      vendorId: vendor._id.toString(),
      businessName: vendor.businessName,
      contactPhone: vendor.contactPhone,
      contactEmail: vendor.contactEmail,
      status: vendor.status,
      createdAt: vendor.createdAt,
      totalDocuments,
      totalRequired,
      totalRequiredCount,
      approvedCount,
      totalApprovedCount: approvedCount,
      coreApprovedCount,
      coreRequiredCount,
      coreVerificationComplete,
      allDocumentsApproved,
      verificationDecision,
      verificationAccess: verificationDecision.verificationAccess,
      verificationStatus: verificationDecision.verificationStatus,
      blockingItem: verificationDecision.blockingItem,
      pendingCount,
      changesRequestedCount,
      rejectedCount,
      compliancePercentage,
      documents: formattedDocs,
    };

    const updatedDocument = formattedDocs.find((d: any) => d.type === docType);

    // Invalidate admin caches immediately so subsequent queries get fresh database state
    invalidateAdminCaches();

    res.status(200).json({
      message: `Document ${docType} review recorded successfully.`,
      vendor,
      updatedDocument,
      companyDossier,
      verificationDecision,
    });
  } catch (error) {
    console.error('[reviewVendorDocument] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to review document' } });
  }
};

export const viewAdminVendorDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const vendorId = Array.isArray(req.params.vendorId) ? req.params.vendorId[0] : req.params.vendorId;
    const docType = (Array.isArray(req.params.docType) ? req.params.docType[0] : (req.params.docType || '')).toUpperCase();

    if (!mongoose.isValidObjectId(vendorId)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    const docs = vendor.verificationDetails?.documents || [];
    const doc = docs.find((d: any) => d.type === docType);

    if (!doc || doc.status === 'NOT_SUBMITTED') {
      res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document file is unavailable.' } });
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
        console.warn('[viewAdminVendorDocument] Failed to read doc.filePath, falling back:', readErr);
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
  } catch (error) {
    console.error('[viewAdminVendorDocument] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to retrieve document' } });
  }
};

export const toggleVendorSuspension = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { action, suspend, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const isSuspending = action ? action === 'suspend' : (suspend !== undefined ? Boolean(suspend) : true);
    const targetStatus = isSuspending ? 'SUSPENDED' : 'APPROVED';

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      {
        $set: {
          status: targetStatus,
          'verificationDetails.suspensionReason': isSuspending ? reason || '' : undefined,
          'verificationDetails.statusUpdatedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      isSuspending ? 'SUSPEND_VENDOR' : 'REACTIVATE_VENDOR',
      'Vendor',
      id,
      reason || `Vendor status updated to ${targetStatus}`,
      { action: isSuspending ? 'suspend' : 'reactivate', targetStatus, reason }
    );

    res.status(200).json({ vendor });
  } catch (error) {
    console.error('[toggleVendorSuspension] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update vendor suspension status' } });
  }
};

export const updateVendorCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const { businessName, contactPhone, contactEmail, status, serviceAreas, servicesOffered } = req.body;

    const updateFields: any = {};
    if (businessName !== undefined) updateFields.businessName = businessName.trim();
    if (contactPhone !== undefined) updateFields.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) updateFields.contactEmail = contactEmail.trim();
    if (status !== undefined) {
      const validStatuses = ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid vendor status: ${status}` } });
        return;
      }
      updateFields.status = status;
    }
    if (Array.isArray(serviceAreas)) updateFields.serviceAreas = serviceAreas;
    if (Array.isArray(servicesOffered)) updateFields.servicesOffered = servicesOffered;

    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    ).populate('ownerId', 'displayName phone');

    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    // Sync owner user display name / phone if updated
    if (vendor.ownerId && (businessName || contactPhone)) {
      await User.findByIdAndUpdate(vendor.ownerId, {
        $set: {
          ...(businessName ? { displayName: businessName.trim() } : {}),
          ...(contactPhone ? { phone: contactPhone.trim() } : {}),
        },
      });
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'UPDATE_VENDOR',
      'Vendor',
      id,
      `Updated vendor details for ${vendor.businessName}`,
      { updateFields }
    );

    invalidateAdminCaches();

    await createCrossNotification({
      actorId: req.user?.id,
      actorName: (req.user as any)?.displayName || req.user?.phone || 'Admin Staff',
      actorRole: 'admin',
      title: `Carrier Profile Updated: ${vendor.businessName}`,
      message: `${(req.user as any)?.displayName || 'Admin staff'} updated operational status (${vendor.status}) and profile for ${vendor.businessName}.`,
      type: 'VENDOR_PROFILE_UPDATE',
      targetType: 'Vendor',
      targetId: id,
      vendorId: vendor._id,
      metadata: { updateFields, vendorId: id },
    });

    res.status(200).json({ vendor });
  } catch (error) {
    console.error('[updateVendorCompany] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update vendor' } });
  }
};

export const deleteVendorCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid vendor ID' } });
      return;
    }

    const vendor = await Vendor.findByIdAndDelete(id);
    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'DELETE_VENDOR',
      'Vendor',
      id,
      `Deleted vendor company ${vendor.businessName}`,
      { businessName: vendor.businessName }
    );

    res.status(200).json({ message: 'Vendor deleted successfully', id });
  } catch (error) {
    console.error('[deleteVendorCompany] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete vendor' } });
  }
};

// ----------------------------------------------------
// 5. SERVICE PACKAGES
// ----------------------------------------------------
export const getPackages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { search, isActive } = req.query;
    const query: any = {};
    if (isActive !== undefined && isActive !== 'all') query.isActive = isActive === 'true';

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      query.$or = [{ name: { $regex: q, $options: 'i' } }, { code: { $regex: q, $options: 'i' } }];
    }

    const packages = await ServicePackage.find(query).sort({ createdAt: -1 });
    res.status(200).json({ packages });
  } catch (error) {
    console.error('[getPackages] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch packages' } });
  }
};

export const createPackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { name, code, description, category = 'General', isActive = true, basePriceEstimate = 0, inclusions } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Package name and code are required' } });
      return;
    }

    const existing = await ServicePackage.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      res.status(409).json({ error: { code: 'PACKAGE_EXISTS', message: 'A package with this code already exists' } });
      return;
    }

    const pkg = await ServicePackage.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description || '',
      category,
      isActive: Boolean(isActive),
      basePriceEstimate: Number(basePriceEstimate) || 0,
      inclusions: Array.isArray(inclusions) ? inclusions : [],
    });

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'CREATE_PACKAGE',
      'ServicePackage',
      pkg._id.toString(),
      `Created service package ${name}`,
      { name, code: pkg.code }
    );

    res.status(201).json({ package: pkg });
  } catch (error) {
    console.error('[createPackage] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create service package' } });
  }
};

export const updatePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid package ID' } });
      return;
    }

    const pkg = await ServicePackage.findByIdAndUpdate(id, { $set: req.body }, { new: true });
    if (!pkg) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
      return;
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'UPDATE_PACKAGE',
      'ServicePackage',
      id,
      `Updated package ${pkg.name}`,
      req.body
    );

    res.status(200).json({ package: pkg });
  } catch (error) {
    console.error('[updatePackage] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update package' } });
  }
};

export const deletePackage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid package ID' } });
      return;
    }

    const pkg = await ServicePackage.findByIdAndDelete(id);
    if (!pkg) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Package not found' } });
      return;
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'DELETE_PACKAGE',
      'ServicePackage',
      id,
      `Deleted package ${pkg.name}`
    );

    res.status(200).json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    console.error('[deletePackage] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete package' } });
  }
};

// ----------------------------------------------------
// 6. BOOKINGS & MOVE SUPERVISION
// ----------------------------------------------------
export const getAdminBookings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '10' } = req.query;

    const query: any = {};
    if (status && status !== 'all') query.status = status;

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      if (mongoose.isValidObjectId(q)) {
        query._id = q;
      }
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const validSortFields = ['createdAt', 'scheduledDate', 'status'];
    const sortField = validSortFields.includes(sortBy as string) ? (sortBy as string) : 'createdAt';
    const sortDirection: 1 | -1 = sortOrder === 'asc' ? 1 : -1;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customerId', 'displayName phone')
        .populate('vendorId', 'businessName contactPhone')
        .populate('requestId', 'pickupAddress destinationAddress preferredDate')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(query),
    ]);

    // For any terminated bookings, look up audit log reason
    const enhancedBookings = await Promise.all(
      bookings.map(async (b) => {
        const bObj: any = b.toObject();
        if (b.status === 'TERMINATED') {
          const termAudit = await AuditLog.findOne({
            targetId: b._id.toString(),
            action: { $in: ['BOOKING_TERMINATED', 'CANCEL_MOVE'] },
          }).sort({ createdAt: -1 });
          bObj.cancellationReason = termAudit?.reason || 'Terminated via Admin / Dispute Resolution';
        }
        return bObj;
      })
    );

    res.status(200).json({
      bookings: enhancedBookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[getAdminBookings] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch bookings' } });
  }
};

export const updateBookingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, reason } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid booking ID' } });
      return;
    }

    const validStatuses: BookingStatus[] = [
      'PENDING_PAYMENT',
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
      'TERMINATED',
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid booking status: ${status}` } });
      return;
    }

    const booking = await Booking.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      status === 'TERMINATED' ? 'BOOKING_TERMINATED' : 'UPDATE_BOOKING_STATUS',
      'Booking',
      id,
      reason || `Booking status updated to ${status}`,
      { status, reason }
    );

    res.status(200).json({ booking });
  } catch (error) {
    console.error('[updateBookingStatus] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update booking status' } });
  }
};

// ----------------------------------------------------
// 7. SERVICE AREAS (GEOGRAPHIC COVERAGE)
// ----------------------------------------------------
export const getServiceAreas = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { search, status, sortBy = 'name', sortOrder = 'asc' } = req.query;

    let setting = await PlatformSetting.findOne({ key: 'service_areas' });
    if (!setting) {
      setting = await PlatformSetting.create({
        key: 'service_areas',
        category: 'operations',
        description: 'Active geographic operational zones',
        value: DEFAULT_SERVICE_AREAS,
      });
    }

    let areas: any[] = Array.isArray(setting.value) ? [...setting.value] : [...DEFAULT_SERVICE_AREAS];

    // Status filter
    if (status && status !== 'all') {
      const activeFilter = status === 'active';
      areas = areas.filter((a) => a.active === activeFilter);
    }

    // Text search
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.toLowerCase().trim();
      areas = areas.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.state.toLowerCase().includes(q)
      );
    }

    // Sort
    areas.sort((a, b) => {
      const fieldA = (a[sortBy as string] || '').toString().toLowerCase();
      const fieldB = (b[sortBy as string] || '').toString().toLowerCase();
      return sortOrder === 'desc' ? fieldB.localeCompare(fieldA) : fieldA.localeCompare(fieldB);
    });

    res.status(200).json({ serviceAreas: areas, total: areas.length });
  } catch (error) {
    console.error('[getServiceAreas] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch service areas' } });
  }
};

export const createServiceArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { name, code, city, state, active = true } = req.body;

    if (!name || !code || !city || !state) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Area name, code, city, and state are required' },
      });
      return;
    }

    let setting = await PlatformSetting.findOne({ key: 'service_areas' });
    const areas: any[] = setting && Array.isArray(setting.value) ? [...setting.value] : [...DEFAULT_SERVICE_AREAS];

    const cleanCode = code.toUpperCase().trim();
    if (areas.some((a) => a.code === cleanCode)) {
      res.status(409).json({ error: { code: 'AREA_EXISTS', message: 'An area with this code already exists' } });
      return;
    }

    const newArea = {
      id: `sa_${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      city: city.trim(),
      state: state.trim(),
      active: Boolean(active),
    };

    areas.push(newArea);

    await PlatformSetting.findOneAndUpdate(
      { key: 'service_areas' },
      {
        $set: {
          value: areas,
          updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'CREATE_SERVICE_AREA',
      'PlatformSetting',
      newArea.id,
      `Created service area ${name} (${cleanCode})`,
      newArea
    );

    res.status(201).json({ serviceArea: newArea });
  } catch (error) {
    console.error('[createServiceArea] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create service area' } });
  }
};

export const updateServiceArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, code, city, state, active } = req.body;

    let setting = await PlatformSetting.findOne({ key: 'service_areas' });
    const areas: any[] = setting && Array.isArray(setting.value) ? [...setting.value] : [...DEFAULT_SERVICE_AREAS];

    const areaIndex = areas.findIndex((a) => a.id === id);
    if (areaIndex === -1) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service area not found' } });
      return;
    }

    if (name !== undefined) areas[areaIndex].name = name.trim();
    if (code !== undefined) areas[areaIndex].code = code.toUpperCase().trim();
    if (city !== undefined) areas[areaIndex].city = city.trim();
    if (state !== undefined) areas[areaIndex].state = state.trim();
    if (active !== undefined) areas[areaIndex].active = Boolean(active);

    await PlatformSetting.findOneAndUpdate(
      { key: 'service_areas' },
      {
        $set: {
          value: areas,
          updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'UPDATE_SERVICE_AREA',
      'PlatformSetting',
      id,
      `Updated service area ${areas[areaIndex].name}`,
      areas[areaIndex]
    );

    res.status(200).json({ serviceArea: areas[areaIndex] });
  } catch (error) {
    console.error('[updateServiceArea] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update service area' } });
  }
};

export const deleteServiceArea = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    let setting = await PlatformSetting.findOne({ key: 'service_areas' });
    const areas: any[] = setting && Array.isArray(setting.value) ? [...setting.value] : [...DEFAULT_SERVICE_AREAS];

    const filtered = areas.filter((a) => a.id !== id);
    if (filtered.length === areas.length) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service area not found' } });
      return;
    }

    await PlatformSetting.findOneAndUpdate(
      { key: 'service_areas' },
      {
        $set: {
          value: filtered,
          updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'DELETE_SERVICE_AREA',
      'PlatformSetting',
      id,
      `Deleted service area ${id}`
    );

    res.status(200).json({ success: true, message: 'Service area deleted successfully' });
  } catch (error) {
    console.error('[deleteServiceArea] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete service area' } });
  }
};

// ----------------------------------------------------
// 8. SYSTEM CONFIGURATION & SETTINGS
// ----------------------------------------------------
export const getSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    let setting = await PlatformSetting.findOne({ key: 'system_settings' });
    if (!setting) {
      setting = await PlatformSetting.create({
        key: 'system_settings',
        category: 'system',
        description: 'System-wide operational parameters',
        value: DEFAULT_SYSTEM_SETTINGS,
      });
    }

    res.status(200).json({ settings: setting.value || DEFAULT_SYSTEM_SETTINGS });
  } catch (error) {
    console.error('[getSettings] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch settings' } });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { platformName, supportPhone, supportEmail, operatingHours, minAdvanceNoticeHours, maintenanceMode } = req.body;

    let setting = await PlatformSetting.findOne({ key: 'system_settings' });
    const current = setting?.value || DEFAULT_SYSTEM_SETTINGS;

    const updated = {
      platformName: platformName !== undefined ? platformName.trim() : current.platformName,
      supportPhone: supportPhone !== undefined ? supportPhone.trim() : current.supportPhone,
      supportEmail: supportEmail !== undefined ? supportEmail.trim() : current.supportEmail,
      operatingHours: operatingHours !== undefined ? operatingHours.trim() : current.operatingHours,
      minAdvanceNoticeHours:
        minAdvanceNoticeHours !== undefined ? Number(minAdvanceNoticeHours) : current.minAdvanceNoticeHours,
      maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : current.maintenanceMode,
    };

    const saved = await PlatformSetting.findOneAndUpdate(
      { key: 'system_settings' },
      {
        $set: {
          value: updated,
          updatedBy: req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : undefined,
        },
      },
      { upsert: true, new: true }
    );

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'UPDATE_SYSTEM_SETTINGS',
      'PlatformSetting',
      'system_settings',
      'Updated platform configuration parameters',
      updated
    );

    res.status(200).json({ message: 'Settings updated successfully', settings: saved.value });
  } catch (error) {
    console.error('[updateSettings] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update settings' } });
  }
};

// ----------------------------------------------------
// 9. AUDIT LOGS
// ----------------------------------------------------
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { targetType, page = '1', limit = '20' } = req.query;

    const query: any = {};
    if (targetType && targetType !== 'all') {
      query.targetType = targetType;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('actorId', 'displayName phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      auditLogs,
      logs: auditLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('[getAuditLogs] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch audit logs' } });
  }
};

// 12. Vendor Document Verification & Compliance Listing
export const getAdminDocuments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  const { status, type, category, vendorId, search } = req.query;

  try {
    const query: any = {};
    if (vendorId && mongoose.isValidObjectId(vendorId)) {
      query._id = vendorId;
    }

    // High-performance lean query selecting only compliance verification fields
    const vendors = await Vendor.find(query)
      .select('businessName contactPhone contactEmail status verificationDetails.documents createdAt')
      .lean();

    const STANDARD_META = STANDARD_COMPLIANCE_META;
    const REQUIRED_DOC_TYPES = REQUIRED_COMPLIANCE_DOCS;

    let allDocs: any[] = [];
    const companies: any[] = [];

    vendors.forEach((vendor: any) => {
      const docs = vendor.verificationDetails?.documents || [];
      const vendorDocs: any[] = [];

      docs.forEach((d: any) => {
        const meta = STANDARD_META[d.type] || {
          title: d.type,
          category: 'COMPANY',
          section: 'COMPANY',
          required: false,
          description: 'Platform verification document',
        };

        const docItem = {
          vendorId: vendor._id.toString(),
          businessName: vendor.businessName,
          vendorPhone: vendor.contactPhone,
          vendorEmail: vendor.contactEmail,
          vendorStatus: vendor.status,
          type: d.type,
          title: meta.title,
          category: meta.category,
          section: meta.section || meta.category,
          required: Boolean(meta.required),
          description: meta.description,
          fileUrl: `/api/v1/admin/vendors/${vendor._id.toString()}/documents/${d.type}/view`,
          fileName: d.fileName || `${d.type.toLowerCase()}_document.pdf`,
          fileSize: d.fileSize || '1.2 MB',
          idType: d.idType,
          maskedIdNumber: d.maskedIdNumber,
          notes: d.notes,
          status: d.status || 'PENDING_REVIEW',
          submittedAt: d.submittedAt || vendor.createdAt,
          reviewedAt: d.reviewedAt,
          feedback: d.feedback,
        };

        vendorDocs.push(docItem);
        allDocs.push(docItem);
      });

      // Calculate 100% genuine dynamic compliance stats per company
      const approvedCount = vendorDocs.filter((d: any) => d.status === 'APPROVED').length;
      const coreApprovedCount = vendorDocs.filter((d: any) => CORE_VERIFICATION_DOCS.includes(d.type) && d.status === 'APPROVED').length;
      const coreRequiredCount = 4;
      const coreVerificationComplete = coreApprovedCount === 4;
      const pendingCount = vendorDocs.filter((d: any) => d.status === 'PENDING_REVIEW').length;
      const changesRequestedCount = vendorDocs.filter((d: any) => d.status === 'CHANGES_REQUESTED').length;
      const rejectedCount = vendorDocs.filter((d: any) => d.status === 'REJECTED').length;
      const totalDocuments = vendorDocs.length;
      const totalRequired = 4;
      const compliancePercentage = Math.round((coreApprovedCount / 4) * 100);

      companies.push({
        vendorId: vendor._id.toString(),
        businessName: vendor.businessName,
        contactPhone: vendor.contactPhone,
        contactEmail: vendor.contactEmail,
        status: vendor.status,
        createdAt: vendor.createdAt,
        totalDocuments,
        totalRequired,
        approvedCount,
        coreApprovedCount,
        coreRequiredCount,
        coreVerificationComplete,
        pendingCount,
        changesRequestedCount,
        rejectedCount,
        compliancePercentage,
        documents: vendorDocs,
      });
    });

    // Filtering
    let filteredDocs = allDocs;
    if (status && status !== 'all') {
      filteredDocs = filteredDocs.filter((d) => d.status === status);
    }
    if (category && category !== 'all') {
      filteredDocs = filteredDocs.filter((d) => d.category.toLowerCase() === (category as string).toLowerCase());
    }
    if (type && type !== 'all') {
      filteredDocs = filteredDocs.filter((d) => d.type === type);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.toLowerCase();
      filteredDocs = filteredDocs.filter(
        (d) =>
          d.businessName.toLowerCase().includes(s) ||
          d.title.toLowerCase().includes(s) ||
          d.type.toLowerCase().includes(s) ||
          (d.fileName && d.fileName.toLowerCase().includes(s)) ||
          (d.vendorPhone && d.vendorPhone.includes(s)) ||
          (d.idType && d.idType.toLowerCase().includes(s))
      );
    }

    // Sort: newest submission first
    filteredDocs.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

    // Compute comprehensive statistics
    const totalCompanies = companies.length;
    const fullyApprovedCompanies = companies.filter((c) => c.compliancePercentage === 100 || c.status === 'APPROVED').length;
    const pendingReviewCompanies = companies.filter((c) => c.pendingCount > 0 || c.status === 'PENDING_REVIEW').length;
    const changesRequestedCompanies = companies.filter((c) => c.changesRequestedCount > 0 || c.status === 'CHANGES_REQUESTED').length;
    const avgComplianceScore = totalCompanies > 0
      ? Math.round(companies.reduce((sum, c) => sum + c.compliancePercentage, 0) / totalCompanies)
      : 0;

    const stats = {
      total: allDocs.length,
      pending: allDocs.filter((d) => d.status === 'PENDING_REVIEW').length,
      approved: allDocs.filter((d) => d.status === 'APPROVED').length,
      changesRequested: allDocs.filter((d) => d.status === 'CHANGES_REQUESTED').length,
      rejected: allDocs.filter((d) => d.status === 'REJECTED').length,
      businessCount: allDocs.filter((d) => d.category === 'BUSINESS').length,
      representativeCount: allDocs.filter((d) => d.category === 'REPRESENTATIVE').length,
      totalCompanies,
      fullyApprovedCompanies,
      pendingReviewCompanies,
      changesRequestedCompanies,
      avgComplianceScore,
    };

    const responsePayload = {
      companies,
      documents: filteredDocs,
      stats,
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('[getAdminDocuments] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin documents' } });
  }
};

// ----------------------------------------------------
// 12. ADMIN NOTIFICATIONS
// ----------------------------------------------------
export const getAdminNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { limit = '30', unreadOnly } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 30));

    const query: any = { recipientRole: 'admin' };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limitNum).lean(),
      Notification.countDocuments({ recipientRole: 'admin', isRead: false }),
    ]);

    res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('[getAdminNotifications] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch admin notifications' } });
  }
};

export const markAdminNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ error: { code: 'INVALID_ID', message: 'Invalid notification ID' } });
      return;
    }

    await Notification.findByIdAndUpdate(id, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[markAdminNotificationRead] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update notification' } });
  }
};

export const markAllAdminNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

  try {
    await Notification.updateMany({ recipientRole: 'admin', isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: 'All admin notifications marked as read' });
  } catch (error) {
    console.error('[markAllAdminNotificationsRead] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to mark all notifications read' } });
  }
};

