import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middlewares/auth.js';
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
import { sendCredentialsViaWhatsApp, generateSimpleCompanyEmail } from '../utils/whatsappService.js';
import { createCrossNotification } from '../utils/notificationHelper.js';
import fs from 'fs';
import path from 'path';
import {
  saveDocumentFile,
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
    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(actorId),
      actorPhone: actorPhone || '',
      action,
      targetType,
      targetId: String(targetId),
      reason,
      details,
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to record vendor action:', err);
  }
};

// 1. Vendor Profile
export const getVendorProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({ vendor: req.vendor });
};

export const getVendorCompanies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let companies: any[] = [];
    if (req.user?.role === 'admin') {
      companies = await Vendor.find({})
        .select('_id businessName contactPhone contactEmail status serviceAreas servicesOffered createdAt')
        .sort({ businessName: 1 });
    } else if (req.user?.role === 'vendor') {
      companies = await Vendor.find({
        $or: [
          { ownerId: req.user.id },
          ...(req.user.phone ? [{ contactPhone: req.user.phone }] : []),
        ],
      }).select('_id businessName contactPhone contactEmail status serviceAreas servicesOffered createdAt');
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
      businessName,
      contactPhone,
      contactEmail,
      serviceAreas: serviceAreas || [],
      servicesOffered: servicesOffered || ['Packing', 'Loading', 'Transport', 'Unloading'],
      status: 'PENDING_REVIEW',
      verificationDetails: {
        submittedAt: new Date(),
        documents: [],
      },
    });

    await logVendorAction(ownerId!, req.user?.phone, 'VENDOR_REGISTERED', 'Vendor', vendor._id.toString(), 'Vendor company self-registered');

    res.status(201).json({ vendor });
  } catch (error) {
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

    // E. Recent 5 Bookings
    const recentBookings = await Booking.find({ vendorId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'displayName phone')
      .populate('requestId');

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
    const { search, role, status, page = 1, limit = 20 } = req.query;

    const query: any = { vendorId };

    if (search) {
      query.$or = [
        { displayName: { $regex: String(search), $options: 'i' } },
        { phone: { $regex: String(search), $options: 'i' } },
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

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, employees] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);

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

    const enrichedEmployees = employees.map((emp) => ({
      ...emp.toObject(),
      availability: busyWorkerMap[emp._id.toString()] ? 'ON_MOVE' : 'AVAILABLE',
      activeBookingId: busyWorkerMap[emp._id.toString()] || null,
    }));

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

export const createVendorEmployee = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vendorId = req.vendor._id;
    const { phone, displayName, employeeRole = 'worker', skills = [], permissions = [] } = req.body;

    if (!phone || !displayName) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Phone number and employee name are required' } });
      return;
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(displayName).trim();

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
      const existingName = existing.displayName ? ` (${existing.displayName})` : '';
      res.status(409).json({
        error: {
          code: 'PHONE_EXISTS',
          message: `A user account with phone number "${cleanPhone}" already exists${existingName}. Please use a different phone number.`,
        },
      });
      return;
    }

    // 1. Generate unique username from employee name
    const baseUsername = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '') || 'mover';

    let username = baseUsername;
    const userWithSameName = await User.findOne({ username });
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

    const employee = await User.create({
      phone: cleanPhone,
      username,
      email,
      password: hashedPassword,
      mustChangePassword: true,
      plainTempPassword: defaultPassword,
      displayName: cleanName,
      role: 'worker',
      employeeRole,
      vendorId,
      accountStatus: 'active',
      skills: Array.isArray(skills) ? skills : [],
      permissions: Array.isArray(permissions) && permissions.length > 0 ? permissions : undefined,
      verifiedAt: new Date(),
    });

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
      { vendorId: vendorId.toString(), role: employeeRole, username, email }
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
    const { displayName, employeeRole, skills, accountStatus, permissions } = req.body;

    const employee = await User.findOne({ _id: id, vendorId });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found in your company' } });
      return;
    }

    if (displayName) employee.displayName = displayName;
    if (employeeRole) employee.employeeRole = employeeRole;
    if (skills) employee.skills = skills;
    if (accountStatus) employee.accountStatus = accountStatus;
    if (Array.isArray(permissions)) employee.permissions = permissions;

    await employee.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'EMPLOYEE_UPDATED',
      'User',
      id,
      `Updated employee profile for ${employee.displayName}`,
      { employeeRole, accountStatus }
    );

    res.status(200).json({ employee });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update employee' } });
  }
};

// 4. Roles & Permissions (Vendor Admin)
export const VENDOR_PERMISSION_DOMAINS = [
  {
    domain: 'Staff & Crew Management',
    icon: 'Users',
    permissions: [
      { id: 'Manage Employees & Crew', description: 'Add, edit, and manage staff accounts and active status' },
      { id: 'Assign Available Workers & Crew', description: 'Assign drivers, supervisors, and movers to confirmed moves' },
      { id: 'View Crew Attendance & Performance', description: 'View completed moves, customer feedback, and job history' },
    ],
  },
  {
    domain: 'Trucks & Fleet',
    icon: 'Truck',
    permissions: [
      { id: 'Fleet & Vehicle Operations', description: 'Register trucks and manage RC, fitness, and insurance records' },
      { id: 'Assign Transport Trucks to Moves', description: 'Assign moving trucks and carriers to customer moves' },
      { id: 'Vehicle Inspection & Maintenance Tracking', description: 'Record pre-trip truck inspections and mileage checkups' },
    ],
  },
  {
    domain: 'Bookings & Moving Jobs',
    icon: 'Package',
    permissions: [
      { id: 'View & Dispatch Bookings', description: 'View confirmed moves, customer addresses, and job schedules' },
      { id: 'Update Move Progression Milestones', description: 'Update move status: on the way, packing, in transit, delivered' },
      { id: 'Enter Recipient Delivery Verification Code', description: 'Enter customer delivery OTP to complete and verify dropoff' },
    ],
  },
  {
    domain: 'Quotes & Customer Leads',
    icon: 'Calculator',
    permissions: [
      { id: 'Review Available Customer Leads', description: 'View new customer moving requests in your service areas' },
      { id: 'Create & Submit Formal Quotations', description: 'Create price estimates with truck type and crew count' },
      { id: 'Quotation Performance & Insights', description: 'See accepted and rejected quotes and conversion stats' },
    ],
  },
  {
    domain: 'Services & Service Areas',
    icon: 'Layers',
    permissions: [
      { id: 'Service Catalog Configuration', description: 'Manage moving packages (home, office, vehicle) and pricing' },
      { id: 'Custom Specialized Services', description: 'Add specialized add-on services (e.g. piano moving, storage)' },
      { id: 'Coverage Areas Configuration', description: 'Choose which cities and pin code areas your company serves' },
    ],
  },
  {
    domain: 'Business Documents & Verification',
    icon: 'ShieldCheck',
    permissions: [
      { id: 'Document Submissions', description: 'Upload GST, business licenses, and company insurance files' },
      { id: 'Regulatory Status Monitoring', description: 'Check admin verification and approval status of documents' },
    ],
  },
  {
    domain: 'Reports & Customer Support',
    icon: 'BarChart3',
    permissions: [
      { id: 'Reports & Performance Analytics', description: 'View revenue earnings, booking counts, and business trends' },
      { id: 'Operational Audit Logs', description: 'See activity logs of changes made by your team members' },
      { id: 'Customer Support Coordination', description: 'Reply to customer messages and help resolve move issues' },
    ],
  },
];

export const STANDARD_VENDOR_ROLES = [
  {
    id: 'manager',
    name: 'Manager',
    purpose: 'Full access to manage staff, assign vehicles, create quotes, view reports, and oversee all company operations.',
    accessLevel: 'Management (Full Access)',
    permissions: [
      'Manage Employees & Crew',
      'Fleet & Vehicle Operations',
      'Bookings & Job Dispatch',
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

    const roles = [...STANDARD_VENDOR_ROLES, ...customRoles];
    res.status(200).json({
      roles,
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

    if (['manager', 'operations', 'worker', 'admin'].includes(finalKey)) {
      finalKey = `custom_${finalKey}_${Date.now()}`;
    }

    const customList = req.vendor.customRoles || [];
    const exists = customList.some(
      (r: any) => r.id === finalKey || r.name.toLowerCase() === trimmedName.toLowerCase()
    );
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
    if (Array.isArray(permissions) && permissions.length > 0) {
      targetRole.permissions = permissions.map((p: any) => String(p).trim()).filter(Boolean);
    }
    if (status === 'Active' || status === 'Inactive') {
      targetRole.status = status;
    }

    req.vendor.customRoles[roleIndex] = targetRole;
    await req.vendor.save();

    const roleObj = typeof targetRole.toObject === 'function' ? targetRole.toObject() : targetRole;

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'ROLE_UPDATED',
      'Vendor',
      req.vendor._id.toString(),
      `Updated custom vendor role: ${targetRole.name} (${id})`,
      { updatedRole: roleObj }
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

    let workers = await User.find({ vendorId, accountStatus: { $ne: 'deleted' } }).sort({ displayName: 1 });
    if (workers.length === 0) {
      await bootstrapVendorOperations(vendorId);
      workers = await User.find({ vendorId, accountStatus: { $ne: 'deleted' } }).sort({ displayName: 1 });
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

    let vehicles = await Vehicle.find({ vendorId }).sort({ createdAt: -1 });
    if (vehicles.length === 0) {
      await bootstrapVendorOperations(vendorId);
      vehicles = await Vehicle.find({ vendorId }).sort({ createdAt: -1 });
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

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'displayName phone')
        .populate('requestId')
        .populate('assignedWorkers', 'displayName phone employeeRole'),
    ]);

    res.status(200).json({
      bookings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
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
      .populate('leadWorkerId', 'displayName phone');

    if (!booking) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found or does not belong to your company' } });
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
    const { workerIds, vehicleId, leadWorkerId } = req.body;

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
      `Assigned ${booking.assignedWorkers.length} crew workers and vehicle ${booking.assignedVehicleId || 'N/A'} to move`,
      { workerIds, vehicleId: booking.assignedVehicleId }
    );

    const updated = await Booking.findById(id)
      .populate('customerId', 'displayName phone')
      .populate('requestId')
      .populate('assignedWorkers', 'displayName phone employeeRole');

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
    await booking.save();

    await logVendorAction(
      req.user!.id,
      req.user?.phone,
      'STATUS_UPDATED',
      'Booking',
      id,
      `Advanced move milestone from ${prevStatus} to ${status}`,
      { prevStatus, newStatus: status }
    );

    res.status(200).json({
      message: `Move status updated to ${status} successfully.`,
      booking,
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update move status' } });
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
      .sort({ createdAt: -1 })
      .limit(50);

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

