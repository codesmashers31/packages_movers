import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';

export interface CreateNotificationParams {
  actorId?: mongoose.Types.ObjectId | string;
  actorName: string;
  actorRole: 'admin' | 'vendor' | 'customer';
  title: string;
  message: string;
  type: 'DOCUMENT_REVIEW' | 'APPLICATION_DECISION' | 'MOVE_UPDATE' | 'VENDOR_PROFILE_UPDATE' | 'GENERAL';
  targetType?: 'Vendor' | 'Document' | 'Booking' | 'User';
  targetId?: string;
  vendorId?: mongoose.Types.ObjectId | string;
  notifyAdmin?: boolean;
  notifyVendor?: boolean;
  metadata?: Record<string, any>;
}

export const createCrossNotification = async (params: CreateNotificationParams): Promise<void> => {
  try {
    const promises: Promise<any>[] = [];

    const actorIdObj =
      params.actorId && mongoose.isValidObjectId(params.actorId)
        ? new mongoose.Types.ObjectId(params.actorId.toString())
        : undefined;

    const vendorIdObj =
      params.vendorId && mongoose.isValidObjectId(params.vendorId)
        ? new mongoose.Types.ObjectId(params.vendorId.toString())
        : undefined;

    // 1. Notify Admin Team
    if (params.notifyAdmin !== false) {
      promises.push(
        Notification.create({
          recipientRole: 'admin',
          actorId: actorIdObj,
          actorName: params.actorName,
          actorRole: params.actorRole,
          title: params.title,
          message: params.message,
          type: params.type,
          targetType: params.targetType,
          targetId: params.targetId,
          recipientVendorId: vendorIdObj,
          metadata: params.metadata,
        })
      );
    }

    // 2. Notify Vendor Admin (if vendorId provided and notifyVendor is true)
    if (params.notifyVendor !== false && vendorIdObj) {
      promises.push(
        Notification.create({
          recipientRole: 'vendor',
          recipientVendorId: vendorIdObj,
          actorId: actorIdObj,
          actorName: params.actorName,
          actorRole: params.actorRole,
          title: params.title,
          message: params.message,
          type: params.type,
          targetType: params.targetType,
          targetId: params.targetId,
          metadata: params.metadata,
        })
      );
    }

    await Promise.all(promises);
  } catch (error) {
    console.error('[createCrossNotification] Failed to record notification:', error);
  }
};
