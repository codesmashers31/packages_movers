import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUser extends Document {
  phone: string;
  username?: string;
  email?: string;
  password?: string;
  mustChangePassword?: boolean;
  plainTempPassword?: string;
  displayName: string;
  language: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended' | 'deleted';
  verifiedAt?: Date;
  vendorId?: mongoose.Types.ObjectId;
  employeeRole?: string;
  skills?: string[];
  adminRole?: string;
  permissions?: string[];
  adminDepartment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    username: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    password: { type: String },
    mustChangePassword: { type: Boolean, default: false },
    plainTempPassword: { type: String },
    displayName: { type: String, default: '' },
    language: { type: String, default: 'en' },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'worker', 'admin'],
      default: 'customer',
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    verifiedAt: { type: Date },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', index: true },
    employeeRole: {
      type: String,
      default: 'worker',
    },
    skills: [{ type: String }],
    adminRole: {
      type: String,
      default: 'super_admin',
    },
    permissions: [{ type: String }],
    adminDepartment: {
      type: String,
      default: 'General Administration',
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
