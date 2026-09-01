import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, required: true },
    direction: { type: String, enum: ['IN', 'OUT'], required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNote: String,
  },
  { timestamps: true },
);
export const StockAdjustment = mongoose.model('StockAdjustment', schema);
