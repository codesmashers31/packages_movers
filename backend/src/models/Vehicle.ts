import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle extends Document {
  vendorId: mongoose.Types.ObjectId;
  name: string;
  registrationNumber: string;
  vehicleType: 'Small Pickup' | 'Medium Truck' | 'Large Freight Truck' | 'Mini Van' | string;
  capacity: string;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    vehicleType: {
      type: String,
      enum: ['Small Pickup', 'Medium Truck', 'Large Freight Truck', 'Mini Van', 'Flatbed Truck', 'Other'],
      default: 'Medium Truck',
    },
    capacity: { type: String, default: '2.5 Ton' },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

VehicleSchema.index({ vendorId: 1, registrationNumber: 1 }, { unique: true });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', VehicleSchema);
