import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from './auth.js';
import { Vendor } from '../models/Vendor.js';
import { User } from '../models/User.js';
import { waitForDB } from '../config/db.js';

export const requireVendor = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const dbReady = await waitForDB(5000);
  if (!dbReady) {
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'MongoDB is currently unreachable. Please ensure database service is online.',
      },
    });
    return;
  }

  try {
    let vendor: any = null;
    const requestedVendorId = (req.headers['x-vendor-id'] as string) || (req.query.vendorId as string);

    if (req.user.role === 'admin') {
      // 1. Admin / Super Admin can enter and manage any vendor company
      if (requestedVendorId && mongoose.isValidObjectId(requestedVendorId)) {
        vendor = await Vendor.findById(requestedVendorId);
      }
      if (!vendor) {
        // Fallback: pick the first active / approved vendor
        vendor = await Vendor.findOne({ status: { $ne: 'SUSPENDED' } }).sort({ updatedAt: -1 });
      }
      if (!vendor) {
        vendor = await Vendor.findOne({}).sort({ updatedAt: -1 });
      }
    } else if (req.user.role === 'vendor') {
      // 2. Vendor Owner: if requestedVendorId is provided, check if they own it or have access
      if (requestedVendorId && mongoose.isValidObjectId(requestedVendorId)) {
        vendor = await Vendor.findOne({ _id: requestedVendorId, ownerId: req.user.id });
      }
      // If not specified or not found, find vendor where they are owner
      if (!vendor) {
        vendor = await Vendor.findOne({ ownerId: req.user.id });
      }
      // Fallback: match by contactPhone if ownerId was reassigned
      if (!vendor && req.user.phone) {
        vendor = await Vendor.findOne({ contactPhone: req.user.phone });
        if (vendor && !vendor.ownerId) {
          vendor.ownerId = req.user.id;
          await vendor.save();
        }
      }
      // Fallback: check if vendorId is explicitly on user document
      if (!vendor) {
        const user = await User.findById(req.user.id);
        if (user?.vendorId) {
          vendor = await Vendor.findById(user.vendorId);
        }
      }
    } else if (req.user.role === 'worker') {
      // 3. Worker / Employee: strictly check their assigned vendorId first
      const workerVendorId = req.user.vendorId;
      if (workerVendorId && mongoose.isValidObjectId(workerVendorId)) {
        vendor = await Vendor.findById(workerVendorId);
      }
      if (!vendor) {
        const user = await User.findById(req.user.id);
        if (user?.vendorId) {
          vendor = await Vendor.findById(user.vendorId);
        }
      }
      if (!vendor) {
        vendor = await Vendor.findOne({ ownerId: req.user.id });
      }
      if (!vendor && req.user.phone) {
        vendor = await Vendor.findOne({ contactPhone: req.user.phone });
      }
    }

    if (!vendor) {
      res.status(403).json({
        error: {
          code: 'VENDOR_NOT_FOUND',
          message: 'Access restricted: No registered vendor company profile associated with this account.',
        },
      });
      return;
    }

    req.vendor = vendor;
    next();
  } catch (error: any) {
    console.error('[requireVendor] Error resolving vendor context:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to verify vendor authorization context.',
      },
    });
  }
};
