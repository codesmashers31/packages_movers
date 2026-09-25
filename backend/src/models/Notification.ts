import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientRole: 'admin' | 'vendor' | 'customer' | 'all';
  recipientVendorId?: mongoose.Types.ObjectId;
  recipientUserId?: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  title: string;
  message: string;
  type: 'DOCUMENT_REVIEW' | 'APPLICATION_DECISION' | 'MOVE_UPDATE' | 'VENDOR_PROFILE_UPDATE' | 'GENERAL';
  targetType?: 'Vendor' | 'Document' | 'Booking' | 'User';
  targetId?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientRole: {
      type: String,
      enum: ['admin', 'vendor', 'customer', 'all'],
      required: true,
      index: true,
    },
    recipientVendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      index: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorName: {
      type: String,
      default: 'System',
    },
    actorRole: {
      type: String,
      default: 'admin',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['DOCUMENT_REVIEW', 'APPLICATION_DECISION', 'MOVE_UPDATE', 'VENDOR_PROFILE_UPDATE', 'GENERAL'],
      default: 'GENERAL',
      index: true,
    },
    targetType: {
      type: String,
    },
    targetId: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
