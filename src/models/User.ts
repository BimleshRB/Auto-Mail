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
    portfolio: { type: String, default: '' },
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
    mobileNumber: { type: String, default: '' },
    resumeText: { type: String, default: '' } // Raw text input of their resume
  },
  apiUsageLogs: [{
    keyPrefix: { type: String, required: true },
    requestsMade: { type: Number, default: 0 },
    lastUsed: { type: Date, default: Date.now }
  }],
  apiKeys: {
    gemini: { type: [String], default: [] },
    zerobounce: { type: [String], default: [] },
    hunter: { type: [String], default: [] },
    abstract: { type: [String], default: [] }
  },
  jobPreferences: {
    roles: { type: [String], default: [] }
  }
}, { timestamps: true });

// Check if the model is already compiled to prevent Next.js overwrite errs
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
