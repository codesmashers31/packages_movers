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
  vendor: [],
  worker: [],
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

let cachedRolePermissions: { map: Record<string, string[]>; expiresAt: number } | null = null;

export const requirePermission = (permissionKey: string | string[]) => {
  const requiredKeys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  const requiredDisplay = requiredKeys.join(' or ');

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Safety: root admin phone always retains full root bypass
    if (req.user.phone === '+919876543210' || req.user.role === 'admin' && (req.user as any).adminRole === 'super_admin') {
      next();
      return;
    }

    const hasAnyKey = (perms: string[]): boolean => {
      if (perms.includes('*')) return true;
      return requiredKeys.some((k) => perms.includes(k));
    };

    // Fast-path 1: Token already embeds verified permissions
    const tokenPerms = (req.user as any).permissions;
    if (Array.isArray(tokenPerms) && hasAnyKey(tokenPerms)) {
      next();
      return;
    }

    // Fast-path 2: Check in-memory permissions cache for admin staff
    if (req.user.role === 'admin') {
      const cached = permissionsCache.get(req.user.id);
      if (cached && cached.expiresAt > Date.now()) {
        if (hasAnyKey(cached.permissions)) {
          next();
          return;
        }
        // If not in cache, do not immediately 403; fall through to live DB query to avoid stale cache lock
      }
    }

    try {
      const mongoose = (await import('mongoose')).default;
      if (mongoose.connection.readyState !== 1) {
        const { waitForDB } = await import('../config/db.js');
        const dbReady = await waitForDB(4000);
        if (!dbReady) {
          res.status(503).json({
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message: 'MongoDB database is currently unreachable. Please ensure database service is running.',
            },
          });
          return;
        }
      }

      // Check specific administrative staff permissions from live database
      if (req.user.role === 'admin') {
        const { User } = await import('../models/User.js');
        const user = await User.findById(req.user.id).select('phone adminRole permissions');
        if (!user) {
          res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Admin account not found' } });
          return;
        }

        if (user.phone === '+919876543210' || user.adminRole === 'super_admin' || !user.adminRole) {
          permissionsCache.set(req.user.id, { permissions: ['*'], expiresAt: Date.now() + CACHE_TTL_MS });
          next();
          return;
        }

        const { resolveUserPermissions } = await import('../controllers/authController.js');
        const userPerms = await resolveUserPermissions(user);

        permissionsCache.set(req.user.id, { permissions: userPerms, expiresAt: Date.now() + CACHE_TTL_MS });

        if (hasAnyKey(userPerms)) {
          next();
          return;
        }

        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Administrative staff account is not authorized for permission: '${requiredDisplay}'`,
          },
        });
        return;
      }

      // General role-based permissions matrix
      if (!cachedRolePermissions || cachedRolePermissions.expiresAt <= Date.now()) {
        const { PlatformSetting } = await import('../models/PlatformSetting.js');
        const setting = await PlatformSetting.findOne({ key: 'role_permissions' }).lean();
        cachedRolePermissions = {
          map: (setting?.value as Record<string, string[]>) || DEFAULT_ROLE_PERMISSIONS,
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
      }

      const userPermissions = cachedRolePermissions.map[req.user.role] || [];

      if (!hasAnyKey(userPermissions)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Role '${req.user.role}' is not authorized to execute permission '${requiredDisplay}'`,
          },
        });
        return;
      }

      next();
    } catch (error) {
      console.error('[requirePermission] Error verifying permissions:', error);
      res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Unable to verify permission matrix from database',
        },
      });
    }
  };
};

export const requireAnyPermission = requirePermission;


