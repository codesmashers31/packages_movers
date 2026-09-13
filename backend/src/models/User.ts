import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUser extends Document {
  phone: string;
  displayName: string;
  language: string;
  role: UserRole;
  accountStatus: 'active' | 'suspended' | 'deleted';
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' },
    language: { type: String, default: 'en' },
    role: {
      type: String,
      enum: ['customer', 'vendor', 'worker', 'admin', 'operations_manager', 'operations_executive'],
      default: 'customer',
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
