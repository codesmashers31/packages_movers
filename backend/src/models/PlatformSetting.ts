import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSetting extends Document {
  key: string;
  value: any;
  category: string;
  description: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    category: { type: String, default: 'general', index: true },
    description: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const PlatformSetting = mongoose.model<IPlatformSetting>('PlatformSetting', PlatformSettingSchema);
