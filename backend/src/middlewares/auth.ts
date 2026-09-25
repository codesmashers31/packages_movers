import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AuthUser, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  vendor?: any;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
};

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }
    next();
  };
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'users:view',
    'users:create',
    'users:edit',
    'users:suspend',
    'vendors:view',
    'vendors:approve',
    'vendors:suspend',
    'documents:view',
    'documents:verify',
    'bookings:view',
    'bookings:manage',
    'disputes:view',
    'disputes:manage',
    'staff:view',
    'staff:manage',
    'packages:manage',
    'service_areas:manage',
    'reports:view',
    'audit:view',
    'settings:manage',
    'permissions:manage',
  ],
  operations_manager: [],
  operations_executive: [],
  customer: [],
};

interface CachedPermissions {
  permissions: string[];
  expiresAt: number;
}

const permissionsCache = new Map<string, CachedPermissions>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export const invalidatePermissionsCache = (userId?: string): void => {
  if (userId) {
    permissionsCache.delete(userId);
  } else {
    permissionsCache.clear();
  }
};

export const setCachedUserPermissions = (userId: string, permissions: string[]): void => {
  permissionsCache.set(userId, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
};

let cachedRolePermissions: { map: Record<string, string[]>; expiresAt: number } | null = null;

const PERMISSION_ALIASES: Record<string, string[]> = {
  'quotations:view': ['Review Available Customer Leads', 'View Quotations', 'Quotation: Can View Only', 'Can View Quotations Only', 'Can View Quotations'],
  'quotations:create': ['Create & Submit Formal Quotations', 'Create Quotations', 'Quotation: Can Create Quotations', 'Can Create Quotations'],
  'quotations:edit': ['Edit Quotations', 'quotations:manage', 'Quotation: Can Edit Quotations', 'Can Edit Quotations'],
  'quotations:submit': ['Submit Quotations', 'Create & Submit Formal Quotations', 'quotations:create', 'Quotation: Can Submit Quotations', 'Can Submit Quotations'],
  'quotations:delete': ['Delete Quotations', 'quotations:cancel', 'quotations:manage'],
  'quotations:cancel': ['Delete Quotations', 'quotations:delete', 'quotations:manage'],

  'employees:view': ['Manage Employees & Crew', 'staff:view', 'View Staff Directory', 'View Employees', 'Employees: Can View Employees', 'Can View Employees'],
  'employees:create': ['Manage Employees & Crew', 'staff:manage', 'Onboard Employees', 'Create Employee', 'Employees: Can Create Employee Accounts', 'Can Create Employees'],
  'employees:edit': ['Manage Employees & Crew', 'staff:manage', 'Edit Staff Accounts', 'Edit Employee', 'Employees: Can Edit Employee Records', 'Can Edit Employees'],
  'employees:assign': ['Manage Employees & Crew', 'staff:manage', 'Assign Employee', 'employees:status', 'Manage Account Status', 'Employees: Can Assign Supervisor & Scope', 'Can Assign Employee'],
  'employees:manage': ['Manage Employees & Crew', 'staff:manage', 'Assign Employee', 'Employees: Can Create Employee Accounts', 'Employees: Can Edit Employee Records'],
  'roles:view': ['roles:manage', 'permissions:manage', 'View Roles', 'View Company Roles', 'Roles & Rules: Can View Roles & Rules', 'Can View Roles & Rules'],
  'roles:create': ['roles:manage', 'permissions:manage', 'Create Role', 'Roles & Rules: Can Create & Manage Roles', 'Can Create & Manage Roles'],
  'roles:edit': ['roles:manage', 'permissions:manage', 'Edit Role', 'Roles & Rules: Can Create & Manage Roles'],
  'roles:manage': ['permissions:manage', 'Create Role', 'Edit Role', 'Roles & Rules: Can Create & Manage Roles', 'Can Create & Manage Roles'],
  'permissions:view': ['roles:view', 'permissions:manage', 'View Permissions', 'Permissions: Can View Permissions', 'Can View Permissions'],
  'permissions:manage': ['permissions:manage', 'Manage Permissions', 'Permissions: Can Manage Employee Permissions', 'Can Manage Employee Permissions'],
  'workers:view': ['View Crew Attendance & Performance', 'View Crew Workers', 'Crew Workers: Can View Crew Workers', 'Can View Crew Workers'],
  'workers:assign': ['Assign Available Workers & Crew', 'Assign Crew', 'Crew Workers: Can Assign Crew to Bookings', 'Can Assign Crew to Bookings'],
  'workers:manage': ['View Crew Attendance & Performance', 'Manage Crew Duty', 'Crew Workers: Can Manage Crew Duty & Attendance', 'Can Manage Crew Duty & Attendance'],
  'vehicles:view': ['Fleet & Vehicle Operations', 'View Vehicles', 'Fleet Vehicles: Can View Fleet Vehicles', 'Can View Fleet Vehicles'],
  'vehicles:assign': ['Assign Transport Trucks to Moves', 'Assign Vehicles', 'Fleet Vehicles: Can Assign Transport Trucks', 'Can Assign Transport Trucks'],
  'vehicles:manage': ['Fleet & Vehicle Operations', 'Vehicle Inspection & Maintenance Tracking', 'Vehicle Maintenance', 'Fleet Vehicles: Can Record Maintenance & Logs'],
  'vehicles:maintenance': ['Vehicle Inspection & Maintenance Tracking', 'vehicles:manage', 'Fleet Vehicles: Can Record Maintenance & Logs', 'Can Record Maintenance & Logs'],
  'bookings:view': ['View & Dispatch Bookings', 'View Bookings', 'Bookings: Can View Bookings', 'Can View Bookings'],
  'bookings:dispatch': ['Bookings & Job Dispatch', 'Assign Available Workers & Crew', 'Dispatch Bookings', 'Bookings: Can Dispatch Bookings', 'Can Dispatch Bookings'],
  'bookings:update_status': ['Update Move Progression Milestones', 'Update Booking Status', 'Bookings: Can Update Booking Status', 'Can Update Booking Status'],
  'bookings:verify_delivery': ['Enter Recipient Delivery Verification Code', 'Verify Delivery OTP', 'Bookings: Can Verify Delivery OTP', 'Can Verify Delivery OTP'],
  'tracking:view': ['View Live GPS Tracking', 'Fleet & Vehicle Operations', 'View Tracking', 'Live Tracking: Can View Live Tracking', 'Can View Live Tracking'],
  'tracking:view_crew': ['View Assigned Crew', 'workers:view', 'Customer Support Coordination', 'Live Tracking: Can View Assigned Crew', 'Can View Assigned Crew'],
  'tracking:view_vehicles': ['View Assigned Vehicles', 'vehicles:view', 'Fleet & Vehicle Operations', 'Live Tracking: Can View Assigned Vehicles', 'Can View Assigned Vehicles'],
  'tracking:update_status': ['Update Tracking Status', 'Customer Support Coordination', 'Update Move Progression Milestones', 'Broadcast Transit Updates & Delays', 'Live Tracking: Can Update Tracking Status', 'Can Update Tracking Status'],
  'demand:view': ['Review Available Customer Leads', 'Quotation Performance & Insights', 'Demand Insights: Can View Customer Demand & Leads', 'Can View Customer Demand & Leads'],
  'demand:export': ['Reports & Performance Analytics', 'Demand Insights: Can Export Demand Analytics', 'Can Export Demand Analytics'],
  'services:view': ['Service Catalog Configuration', 'View Services', 'Services Catalog: Can View Services Catalog', 'Can View Services Catalog'],
  'services:manage': ['Service Catalog Configuration', 'Custom Specialized Services', 'Manage Services', 'Services Catalog: Can Configure Services & Pricing', 'Can Configure Services & Pricing'],
  'packages:view': ['Service Catalog Configuration', 'Moving Packages: Can View Moving Packages', 'Can View Moving Packages'],
  'packages:manage': ['Service Catalog Configuration', 'Moving Packages: Can Create & Manage Packages', 'Can Create & Manage Packages'],
  'service_areas:view': ['Coverage Areas Configuration', 'View Service Areas', 'Service Areas: Can View Service Areas', 'Can View Service Areas'],
  'documents:view': ['Document Submissions', 'Regulatory Status Monitoring', 'View Documents', 'Compliance Docs: Can View Compliance Documents', 'Can View Compliance Documents', 'company_profile:view'],
  'documents:upload': ['Document Submissions', 'Upload Documents', 'Compliance Docs: Can Upload & Submit Paperwork', 'Can Upload & Submit Paperwork', 'company_profile:upload_documents'],
  'company_profile:view': ['documents:view', 'View Documents', 'View Company Profile', 'Company Information & Regulatory Compliance', 'Compliance Docs: Can View Compliance Documents', 'Can View Company Profile'],
  'company_profile:edit': ['company_profile:manage', 'Edit Company Profile', 'Update Company Profile', 'Company Information & Regulatory Compliance'],
  'company_profile:manage': ['company_profile:edit', 'Manage Company Profile', 'Company Information & Regulatory Compliance'],
  'company_profile:upload_documents': ['documents:upload', 'Upload Documents', 'Compliance Docs: Can Upload & Submit Paperwork', 'Can Upload & Submit Paperwork'],
  'reports:view': ['Reports & Performance Analytics', 'View Reports', 'Business Reports: Can View Business Reports', 'Can View Business Reports'],
  'reports:export': ['Reports & Performance Analytics', 'Export Reports', 'Business Reports: Can Export Operational Analytics', 'Can Export Operational Analytics'],
  'audit_logs:view': ['Operational Audit Logs', 'audit:view', 'View Activity Logs', 'Activity Logs: Can View Activity Logs', 'Can View Activity Logs'],
  'audit:view': ['Operational Audit Logs', 'audit_logs:view', 'View Audit Logs'],
  'staff:view': ['staff:view', 'employees:view', 'View Employees', 'Read Platform Staff Roster'],
  'staff:create': ['staff:manage', 'employees:create', 'Create Employee', 'Onboard Staff Members'],
  'staff:edit': ['staff:manage', 'employees:edit', 'Edit Employee', 'Edit Staff Details & Departments'],
  'staff:status': ['staff:manage', 'employees:assign', 'Assign Employee', 'Deactivate Staff Accounts'],
  'staff:manage': ['staff:manage', 'staff:create', 'staff:edit', 'staff:status'],
};

const checkHasKey = (userPerms: string[], targetKey: string): boolean => {
  if (!Array.isArray(userPerms) || userPerms.length === 0) return false;
  if (userPerms.includes('*')) return true;
  if (userPerms.includes(targetKey)) return true;
  const aliases = PERMISSION_ALIASES[targetKey] || [];
  if (aliases.some((a) => userPerms.includes(a))) return true;
  for (const p of userPerms) {
    const pAliases = PERMISSION_ALIASES[p];
    if (pAliases && pAliases.includes(targetKey)) return true;
  }
  return false;
};

export const requirePermission = (permissionKey: string | string[]) => {
  const requiredKeys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  const requiredDisplay = requiredKeys.join(' or ');

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // 1. Root Platform Administrator always retains full platform bypass
    if (
      req.user.phone === '+919876543210' ||
      (req.user.role === 'admin' && (req.user as any).adminRole === 'super_admin')
    ) {
      next();
      return;
    }

    // 2. Vendor Owner has full governance & operational authority over their own company
    if (req.user.role === 'vendor' || (req.vendor && req.vendor.ownerId && req.vendor.ownerId.toString() === req.user.id)) {
      next();
      return;
    }

    const hasAnyKey = (perms: string[]): boolean => {
      if (!Array.isArray(perms) || perms.length === 0) return false;
      if (perms.includes('*')) return true;
      return requiredKeys.some((k) => checkHasKey(perms, k));
    };

    // 3. Fast-path: Check in-memory permissions cache first (populated on login / after live DB resolution)
    const cached = permissionsCache.get(req.user.id);
    if (cached && cached.expiresAt > Date.now()) {
      if (hasAnyKey(cached.permissions)) {
        next();
        return;
      }
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access restricted: Your account is not authorized for permission: '${requiredDisplay}'`,
        },
      });
      return;
    }

    // 4. Live Database Resolution: Dynamically resolve effective permissions from MongoDB
    try {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.connection.readyState !== 1) {
        const { waitForDB } = await import('../config/db.js');
        const dbReady = await waitForDB(4000);
        if (!dbReady) {
          // Security: Fail closed. Never allow stale JWT claims to authorize protected operations when DB/cache is unavailable.
          res.status(503).json({
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: 'MongoDB database is currently unreachable. Protected operations are denied until live connectivity is restored.',
            },
          });
          return;
        }
      }

      const { User } = await import('../models/User.js');
      const user = await User.findById(req.user.id);
      if (!user) {
        res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User account not found' } });
        return;
      }

      const { resolveUserPermissions } = await import('../controllers/authController.js');
      const userPerms = await resolveUserPermissions(user);

      // Cache effective permissions for fast lookup
      permissionsCache.set(req.user.id, { permissions: userPerms, expiresAt: Date.now() + CACHE_TTL_MS });

      if (hasAnyKey(userPerms)) {
        next();
        return;
      }

      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access restricted: Your account is not authorized for permission: '${requiredDisplay}'`,
        },
      });
    } catch (error) {
      console.error('[requirePermission] Error verifying permissions:', error);
      // Security: Fail closed. Never allow stale JWT claims to authorize protected operations on DB/verification error.
      res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Unable to verify permission matrix from database. Protected operation denied.',
        },
      });
    }
  };
};

export const requireAnyPermission = requirePermission;


