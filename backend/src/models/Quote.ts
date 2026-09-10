import mongoose, { Schema, Document } from 'mongoose';
import { QuoteStatus } from '../types/index.js';

export interface IQuote extends Document {
  requestId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  requestRevision: number;
  quoteRevision: number;
  totalAmountMinorUnits: number; // Integer minor units (e.g. Paise or Cents)
  currency: string;
  itemizedServices: Array<{
    serviceName: string;
    amountMinorUnits: number;
  }>;
  inclusions: string[];
  exclusions: string[];
  assumptions?: string[];
  validUntil: Date;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteSchema = new Schema<IQuote>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'MovingRequest', required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    requestRevision: { type: Number, required: true, default: 1 },
    quoteRevision: { type: Number, required: true, default: 1 },
    totalAmountMinorUnits: { type: Number, required: true },
    currency: { type: String, default: 'INR', required: true },
    itemizedServices: [
      {
        serviceName: { type: String, required: true },
        amountMinorUnits: { type: Number, required: true },
      },
    ],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    assumptions: [{ type: String }],
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'WITHDRAWN', 'EXPIRED', 'SUPERSEDED', 'NOT_SELECTED'],
      default: 'SUBMITTED',
      index: true,
    },
  },
  { timestamps: true }
);

export const Quote = mongoose.model<IQuote>('Quote', QuoteSchema);
