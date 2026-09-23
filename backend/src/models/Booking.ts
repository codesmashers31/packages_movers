import mongoose, { Schema, Document } from 'mongoose';
import { BookingStatus } from '../types/index.js';

export interface IOperationalNote {
  timestamp: Date;
  authorId?: mongoose.Types.ObjectId;
  authorName: string;
  authorRole: string;
  noteType: 'CREW_CONTACT' | 'CUSTOMER_DELAY_ALERT' | 'STATUS_UPDATE' | 'GENERAL';
  content: string;
  metadata?: Record<string, any>;
}

export interface IBooking extends Document {
  requestId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  quoteId: mongoose.Types.ObjectId;
  quoteSnapshot: Record<string, any>;
  status: BookingStatus;
  scheduledDate: Date;
  assignedWorkers: mongoose.Types.ObjectId[];
  leadWorkerId?: mongoose.Types.ObjectId;
  assignedCoordinatorId?: mongoose.Types.ObjectId;
  assignedVehicleId?: string;
  deliveryCode?: string;
  operationalNotes?: IOperationalNote[];
  lastGpsUpdate?: {
    timestamp: Date;
    latitude: number;
    longitude: number;
    locationName?: string;
    isStationary?: boolean;
    speedKmph?: number;
  };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'MovingRequest', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', required: true },
    quoteSnapshot: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'ASSIGNED',
        'EN_ROUTE_PICKUP',
        'ARRIVED_PICKUP',
        'PACKING',
        'LOADING',
        'IN_TRANSIT',
        'ARRIVED_DROPOFF',
        'UNLOADING',
        'AWAITING_CONFIRMATION',
        'COMPLETED',
        'CANCELLED',
        'TERMINATED',
      ],
      default: 'PENDING_PAYMENT',
      index: true,
    },
    scheduledDate: { type: Date, required: true },
    assignedWorkers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    leadWorkerId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedCoordinatorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedVehicleId: { type: String },
    deliveryCode: { type: String },
    lastGpsUpdate: {
      timestamp: { type: Date },
      latitude: { type: Number },
      longitude: { type: Number },
      locationName: { type: String },
      isStationary: { type: Boolean, default: false },
      speedKmph: { type: Number, default: 0 },
    },
    operationalNotes: [
      {
        timestamp: { type: Date, default: Date.now },
        authorId: { type: Schema.Types.ObjectId, ref: 'User' },
        authorName: { type: String },
        authorRole: { type: String },
        noteType: {
          type: String,
          enum: ['CREW_CONTACT', 'CUSTOMER_DELAY_ALERT', 'STATUS_UPDATE', 'GENERAL'],
          default: 'GENERAL',
        },
        content: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
