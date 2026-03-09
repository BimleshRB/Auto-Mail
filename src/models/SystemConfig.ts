import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  masterGeminiKey?: string;
  maintenanceMode: boolean;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>({
  razorpayKeyId: { type: String, default: "" },
  razorpayKeySecret: { type: String, default: "" },
  masterGeminiKey: { type: String, default: "" },
  maintenanceMode: { type: Boolean, default: false },
}, { timestamps: true });

export const SystemConfig: Model<ISystemConfig> = mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
export default SystemConfig;
