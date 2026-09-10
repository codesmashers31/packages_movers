import mongoose, { Schema, Document } from 'mongoose';
import { VendorStatus } from '../types/index.js';

export interface IVendor extends Document {
  ownerId: mongoose.Types.ObjectId;
  businessName: string;
  contactEmail?: string;
  contactPhone: string;
  status: VendorStatus;
  serviceAreas: string[];
  servicesOffered: string[];
  verificationDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessName: { type: String, required: true },
    contactEmail: { type: String },
    contactPhone: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    serviceAreas: [{ type: String }],
    servicesOffered: [{ type: String }],
    verificationDetails: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
