import mongoose, { Schema, Document } from 'mongoose';
import { VendorStatus } from '../types/index.js';

export interface ICustomService {
  id: string;
  name: string;
  description: string;
  category?: string;
  isActive?: boolean;
  createdAt?: Date;
}

export interface ICustomRole {
  id: string;
  name: string;
  purpose: string;
  accessLevel: string;
  permissions: string[];
  status: 'Active' | 'Inactive';
  isCustom?: boolean;
  createdAt?: Date;
}

export interface IVendor extends Document {
  ownerId: mongoose.Types.ObjectId;
  businessName: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone: string;
  status: VendorStatus;
  serviceAreas: string[];
  servicesOffered: string[];
  customServices?: ICustomService[];
  customRoles?: ICustomRole[];
  verificationDetails?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    businessName: { type: String, required: true },
    logoUrl: { type: String },
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
    customServices: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: String, default: 'Specialized Relocation' },
        isActive: { type: Boolean, default: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    customRoles: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        purpose: { type: String, required: true },
        accessLevel: { type: String, default: 'Custom Operational Scope' },
        permissions: [{ type: String }],
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    verificationDetails: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
