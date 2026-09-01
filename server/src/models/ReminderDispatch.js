import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    reminderKey: { type: String, required: true, unique: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    stage: { type: String, required: true },
    recipient: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['SENT', 'FAILED'], default: 'SENT' },
    lastError: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
schema.index({ companyId: 1, entityType: 1, entityId: 1, stage: 1 }, { unique: true });
export const ReminderDispatch = mongoose.model('ReminderDispatch', schema);
