import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true },
  image: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  emailConfig: {
    gmailAddress: { type: String, default: '' },
    appPassword: { type: String, default: '' },
  },
  professionalLinks: {
    resume: { type: String, default: '' },
    resumeText: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
  },
  apiKeys: {
    gemini: { type: [String], default: [] },
  },
  jobPreferences: {
    roles: { type: [String], default: [] }
  }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
