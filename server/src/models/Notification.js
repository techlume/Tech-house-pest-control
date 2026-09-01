import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, default: 'INFO' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    readAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);
schema.index({ userId: 1, readAt: 1, createdAt: -1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
export const Notification = mongoose.model('Notification', schema);
