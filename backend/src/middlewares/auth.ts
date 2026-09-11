import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AuthUser, UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const token = authHeader.split(' ')[1];
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
    'bookings:view',
    'bookings:manage',
    'packages:manage',
    'service_areas:manage',
    'settings:manage',
    'permissions:manage',
  ],
  vendor: [],
  worker: [],
  customer: [],
};

export const requirePermission = (permissionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Safety: admin role always retains permissions:manage to prevent accidental lockout
    if (req.user.role === 'admin' && permissionKey === 'permissions:manage') {
      next();
      return;
    }

    try {
      const { waitForDB } = await import('../config/db.js');
      const dbReady = await waitForDB(5000);
      if (!dbReady) {
        res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'MongoDB database is currently unreachable. Please ensure database service is running.',
          },
        });
        return;
      }


      const { PlatformSetting } = await import('../models/PlatformSetting.js');
      const setting = await PlatformSetting.findOne({ key: 'role_permissions' });
      const permissionsMap = (setting?.value as Record<string, string[]>) || DEFAULT_ROLE_PERMISSIONS;
      const userPermissions = permissionsMap[req.user.role] || [];

      if (!userPermissions.includes(permissionKey)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: `Role '${req.user.role}' is not authorized to execute permission '${permissionKey}'`,
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

