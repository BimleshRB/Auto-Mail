import mongoose, { Schema } from 'mongoose';

const LeadSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hrName: { type: String, required: true },
  hrEmail: { type: String, required: true },
  companyName: { type: String, required: true },
  targetRole: { type: String, required: true },
  status: { type: String, enum: ['pending', 'applied', 'failed'], default: 'pending' },
  generatedTemplate: { type: String, default: '' },
  subject: { type: String, default: '' },
}, { timestamps: true });

// Prevent mongoose overwrite model error in serverless environments
export default mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
