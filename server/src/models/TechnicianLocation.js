import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  visitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', required: true, index: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: Number,
  recordedAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: false });

schema.index({ visitId: 1, recordedAt: -1 });
export const TechnicianLocation = mongoose.model('TechnicianLocation', schema);
