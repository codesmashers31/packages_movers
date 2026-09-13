import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest, DEFAULT_ROLE_PERMISSIONS } from '../middlewares/auth.js';
import { User } from '../models/User.js';
import { Vendor } from '../models/Vendor.js';
import { Booking } from '../models/Booking.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { AuditLog } from '../models/AuditLog.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { UserRole, VendorStatus, BookingStatus } from '../types/index.js';
import { isDBConnected } from '../config/db.js';

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
    id: 'bookings:view',
    name: 'View Bookings',
    module: 'Move Supervision',
    description: 'Monitor active, scheduled, completed, and terminated moving operations.',
  },
  {
    id: 'bookings:manage',
    name: 'Manage Moves & Disputes',
    module: 'Move Supervision',
    description: 'Intervene in live moves, update status, inspect delivery codes, and resolve disputes.',
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

// ----------------------------------------------------
// 1. DASHBOARD STATS
// ----------------------------------------------------
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!ensureDB(res)) return;

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
      totalUsers,
      totalVendors,
      pendingVendors,
      approvedVendors,
      totalBookings,
      activeBookings,
      completedBookings,
      terminatedBookings,
      totalPackages,
      serviceAreasDoc,
      recentBookings,
      recentAuditLogs,
      bookingStatusAgg,
      userRoleAgg,
      vendorStatusAgg,
    ] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: 'PENDING_REVIEW' }),
      Vendor.countDocuments({ status: 'APPROVED' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: { $in: activeStatuses } }),
      Booking.countDocuments({ status: 'COMPLETED' }),
      Booking.countDocuments({ status: 'TERMINATED' }),
      ServicePackage.countDocuments({ isActive: true }),
      PlatformSetting.findOne({ key: 'service_areas' }),
      Booking.find()
        .populate('customerId', 'displayName phone')
        .populate('vendorId', 'businessName contactPhone')
        .populate('requestId', 'pickupAddress destinationAddress preferredDate')
        .sort({ createdAt: -1 })
        .limit(6),
      AuditLog.find().sort({ createdAt: -1 }).limit(10),
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

    const serviceAreasCount = Array.isArray(serviceAreasDoc?.value)
      ? serviceAreasDoc.value.filter((a: any) => a.active).length
      : DEFAULT_SERVICE_AREAS.filter((a) => a.active).length;

    res.status(200).json({
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
    });
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

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate('ownerId', 'displayName phone')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum),
      Vendor.countDocuments(query),
    ]);

    res.status(200).json({
      vendors,
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

    // Ensure owner user account exists
    let owner = await User.findOne({ phone: contactPhone });
    if (!owner) {
      owner = await User.create({
        phone: contactPhone,
        displayName: businessName,
        role: 'vendor',
        accountStatus: 'active',
        verifiedAt: new Date(),
      });
    }

    const vendor = await Vendor.create({
      ownerId: owner._id,
      businessName: businessName.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail ? contactEmail.trim() : undefined,
      status: 'APPROVED',
      serviceAreas: Array.isArray(serviceAreas) ? serviceAreas : [],
      servicesOffered: Array.isArray(servicesOffered) ? servicesOffered : [],
      verificationDetails: { verifiedByAdmin: true, approvedAt: new Date() },
    });

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      'CREATE_VENDOR',
      'Vendor',
      vendor._id.toString(),
      `Created and approved vendor company ${businessName}`,
      { businessName, contactPhone }
    );

    res.status(201).json({ vendor });
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

    const vendor = await Vendor.findById(id).populate('ownerId', 'displayName phone');
    if (!vendor) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Vendor not found' } });
      return;
    }

    res.status(200).json({ vendor });
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

    await logAdminAction(
      req.user?.id,
      req.user?.phone,
      `VENDOR_${decision}`,
      'Vendor',
      id,
      reason || `Vendor application marked as ${decision}`,
      { decision, reason }
    );

    res.status(200).json({ vendor });
  } catch (error) {
    console.error('[reviewVendorApplication] Error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to review vendor application' } });
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

    const isSuspending = action === 'suspend' || suspend === true;
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
