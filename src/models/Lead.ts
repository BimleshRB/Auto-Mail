import mongoose, { Schema } from 'mongoose';

// Force clear the cached model so Next.js hot-reloads the new schema fields
if (mongoose.models.Lead) {
  delete mongoose.models.Lead;
}

const LeadSchema = new mongoose.Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  campaignName: { type: String, required: true, default: 'Default Campaign' },
  hrName: { type: String, required: true },
  hrEmail: { type: String, required: true },
  companyName: { type: String, required: true },
  targetRole: { type: String, required: true },
  status: { type: String, enum: ['pending', 'applied', 'failed'], default: 'pending' },
  verificationStatus: { type: String, enum: ['unverified', 'valid', 'bounced', 'catch-all', 'unknown'], default: 'unverified' },
  generatedTemplate: { type: String, default: '' },
  subject: { type: String, default: '' },
}, { timestamps: true });

// Prevent mongoose overwrite model error in serverless environments
export default mongoose.model('Lead', LeadSchema);
