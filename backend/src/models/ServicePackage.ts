import mongoose, { Schema, Document } from 'mongoose';

export interface IServicePackage extends Document {
  name: string;
  code: string;
  description: string;
  category: string;
  isActive: boolean;
  basePriceEstimate?: number;
  inclusions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ServicePackageSchema = new Schema<IServicePackage>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'General' },
    isActive: { type: Boolean, default: true },
    basePriceEstimate: { type: Number, default: 0 },
    inclusions: [{ type: String }],
  },
  { timestamps: true }
);

export const ServicePackage = mongoose.model<IServicePackage>('ServicePackage', ServicePackageSchema);
