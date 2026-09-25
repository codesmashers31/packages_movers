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

export const BLOCKING_VERIFICATION_DOCS = [
  'GST_CERTIFICATE',
  'BUSINESS_PAN',
  'REPRESENTATIVE_ID_PROOF',
  'REPRESENTATIVE_PHOTO',
  'TRANSPORT_PERMIT',
  'TRANSIT_INSURANCE',
] as const;

export type BlockingDocType = typeof BLOCKING_VERIFICATION_DOCS[number];

export interface VendorVerificationDecision {
  verificationAccess: 'ALLOWED' | 'RESTRICTED';
  vendorStatus: 'APPROVED' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'REJECTED' | 'SUSPENDED';
  verificationStatus: 'APPROVED' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'REJECTED' | 'SUSPENDED';
  blockingItem: string | null;
  reason: string | null;
  requiredCount: 6;
  approvedCount: number;
}

/**
 * Centralized Authoritative Verification Decision:
 * Evaluates live vendor company application status and all 6 blocking verification documents.
 * Operational access is ALLOWED ONLY WHEN vendor.status === 'APPROVED' AND all 6 documents are 'APPROVED'.
 */
export const getVendorVerificationDecision = (vendor: any): VendorVerificationDecision => {
  const vendorStatus = (vendor?.status || 'PENDING_REVIEW') as VendorVerificationDecision['vendorStatus'];
  const docs = vendor?.verificationDetails?.documents || [];

  const approvedDocs = BLOCKING_VERIFICATION_DOCS.filter((type) =>
    docs.some((d: any) => d.type === type && d.status === 'APPROVED')
  );
  const approvedCount = approvedDocs.length;

  // 1. Account Suspension overrides everything
  if (vendorStatus === 'SUSPENDED') {
    return {
      verificationAccess: 'RESTRICTED',
      vendorStatus: 'SUSPENDED',
      verificationStatus: 'SUSPENDED',
      blockingItem: null,
      reason: vendor.verificationDetails?.suspensionReason || 'This vendor company account has been suspended by platform administration.',
      requiredCount: 6,
      approvedCount,
    };
  }

  // 2. Company Application Rejected
  if (vendorStatus === 'REJECTED') {
    return {
      verificationAccess: 'RESTRICTED',
      vendorStatus: 'REJECTED',
      verificationStatus: 'REJECTED',
      blockingItem: null,
      reason: vendor.verificationDetails?.reviewReason || 'Company verification application has been rejected.',
      requiredCount: 6,
      approvedCount,
    };
  }

  // 3. Inspect the 6 blocking documents
  // Check for any CHANGES_REQUESTED document
  const changesReqDoc = docs.find(
    (d: any) => BLOCKING_VERIFICATION_DOCS.includes(d.type) && d.status === 'CHANGES_REQUESTED'
  );
  if (changesReqDoc) {
    return {
      verificationAccess: 'RESTRICTED',
      vendorStatus,
      verificationStatus: 'CHANGES_REQUESTED',
      blockingItem: changesReqDoc.type,
      reason: changesReqDoc.feedback || vendor.verificationDetails?.reviewReason || `Verification changes requested for ${changesReqDoc.type}.`,
      requiredCount: 6,
      approvedCount,
    };
  }

  // Check for any REJECTED document
  const rejectedDoc = docs.find(
    (d: any) => BLOCKING_VERIFICATION_DOCS.includes(d.type) && d.status === 'REJECTED'
  );
  if (rejectedDoc) {
    return {
      verificationAccess: 'RESTRICTED',
      vendorStatus,
      verificationStatus: 'REJECTED',
      blockingItem: rejectedDoc.type,
      reason: rejectedDoc.feedback || vendor.verificationDetails?.reviewReason || `Document ${rejectedDoc.type} was rejected by platform administration.`,
      requiredCount: 6,
      approvedCount,
    };
  }

  // Check for any missing or PENDING_REVIEW document
  const firstUnapprovedType = BLOCKING_VERIFICATION_DOCS.find(
    (type) => !docs.some((d: any) => d.type === type && d.status === 'APPROVED')
  );
  if (firstUnapprovedType) {
    const unapprovedDoc = docs.find((d: any) => d.type === firstUnapprovedType);
    const docState = unapprovedDoc?.status || 'NOT_SUBMITTED';
    const isDocPending = docState === 'PENDING_REVIEW';
    return {
      verificationAccess: 'RESTRICTED',
      vendorStatus,
      verificationStatus: vendorStatus === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'PENDING_REVIEW',
      blockingItem: firstUnapprovedType,
      reason: unapprovedDoc?.feedback || vendor.verificationDetails?.reviewReason || (isDocPending ? `Document ${firstUnapprovedType} is pending administrative review.` : `Document ${firstUnapprovedType} has not been submitted.`),
      requiredCount: 6,
      approvedCount,
    };
  }

  // 4. All 6 documents approved, but vendor.status is not yet APPROVED
  if (vendorStatus !== 'APPROVED') {
    return {
      verificationAccess: 'RESTRICTED',
      vendorStatus,
      verificationStatus: vendorStatus,
      blockingItem: null,
      reason: vendor.verificationDetails?.reviewReason || 'All required verification documents are approved, but formal company approval decision is pending.',
      requiredCount: 6,
      approvedCount: 6,
    };
  }

  // 5. Full Operational Access: vendorStatus === APPROVED AND all 6 documents APPROVED
  return {
    verificationAccess: 'ALLOWED',
    vendorStatus: 'APPROVED',
    verificationStatus: 'APPROVED',
    blockingItem: null,
    reason: 'All required verification items approved.',
    requiredCount: 6,
    approvedCount: 6,
  };
};

/**
 * Strict Verification Gate:
 * Enforces that the resolved vendor company has verificationAccess === 'ALLOWED'
 * (meaning vendor.status === 'APPROVED' AND all 6 blocking documents are 'APPROVED').
 * Rejects with 403 VENDOR_SUSPENDED or VENDOR_NOT_APPROVED.
 * Does NOT contain blind admin bypasses.
 */
export const requireApprovedVendor = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const vendor = req.vendor;

  if (!vendor) {
    res.status(403).json({
      error: {
        code: 'VENDOR_NOT_FOUND',
        message: 'Access restricted: No registered vendor company associated with this request.',
      },
    });
    return;
  }

  const decision = getVendorVerificationDecision(vendor);

  if (decision.verificationAccess !== 'ALLOWED') {
    const isSuspended = decision.verificationStatus === 'SUSPENDED' || decision.vendorStatus === 'SUSPENDED';
    res.status(403).json({
      error: {
        code: isSuspended ? 'VENDOR_SUSPENDED' : 'VENDOR_NOT_APPROVED',
        message: isSuspended
          ? 'This vendor company account has been suspended by platform administration.'
          : `Company verification is ${decision.verificationStatus.toLowerCase().replace('_', ' ')}. Operational modules are locked until company verification is approved by platform administration.`,
        vendorStatus: decision.vendorStatus,
        verificationStatus: decision.verificationStatus,
        verificationAccess: decision.verificationAccess,
        blockingItem: decision.blockingItem,
        reviewReason: decision.reason,
      },
      vendorStatus: decision.vendorStatus,
      verificationStatus: decision.verificationStatus,
      verificationAccess: decision.verificationAccess,
      blockingItem: decision.blockingItem,
      reviewReason: decision.reason,
    });
    return;
  }

  next();
};

