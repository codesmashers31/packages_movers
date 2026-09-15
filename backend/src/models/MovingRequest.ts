import mongoose, { Schema, Document } from 'mongoose';
import { RequestStatus } from '../types/index.js';

export interface IMovingRequest extends Document {
  customerId: mongoose.Types.ObjectId;
  pickupAddress: {
    street: string;
    city: string;
    postalCode: string;
    floor?: number;
    hasLift?: boolean;
    parkingDistanceMeters?: number;
  };
  destinationAddress: {
    street: string;
    city: string;
    postalCode: string;
    floor?: number;
    hasLift?: boolean;
    parkingDistanceMeters?: number;
  };
  preferredDate: Date;
  preferredTimeSlot?: string;
  items: Array<{
    name: string;
    category?: string;
    quantity: number;
    isFragile?: boolean;
  }>;
  requestedServices: string[];
  category?: string;
  revision: number;
  status: RequestStatus;
  commonRejectionFeedback?: {
    reasons: string[];
    comment?: string;
    submittedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MovingRequestSchema = new Schema<IMovingRequest>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pickupAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      floor: { type: Number, default: 0 },
      hasLift: { type: Boolean, default: false },
      parkingDistanceMeters: { type: Number, default: 0 },
    },
    destinationAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      floor: { type: Number, default: 0 },
      hasLift: { type: Boolean, default: false },
      parkingDistanceMeters: { type: Number, default: 0 },
    },
    preferredDate: { type: Date, required: true },
    preferredTimeSlot: { type: String },
    items: [
      {
        name: { type: String, required: true },
        category: { type: String },
        quantity: { type: Number, default: 1 },
        isFragile: { type: Boolean, default: false },
      },
    ],
    requestedServices: [{ type: String }],
    category: {
      type: String,
      default: 'Heavy Load House Shifting',
      index: true,
    },
    revision: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'RESERVED', 'BOOKED', 'CLOSED', 'EXPIRED'],
      default: 'OPEN',
      index: true,
    },
    commonRejectionFeedback: {
      reasons: [{ type: String }],
      comment: { type: String },
      submittedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export const MovingRequest = mongoose.model<IMovingRequest>('MovingRequest', MovingRequestSchema);
