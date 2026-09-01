import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    expenseNo: { type: String, required: true },
    date: { type: Date, default: Date.now, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    vendor: String,
    amount: { type: Number, required: true, min: 0.01 },
    taxAmount: { type: Number, default: 0, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'Bank', 'UPI', 'Card', 'Other'], default: 'Cash' },
    reference: String,
    status: { type: String, enum: ['Recorded', 'Approved', 'Void'], default: 'Recorded' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
schema.index({ companyId: 1, branchId: 1, expenseNo: 1 }, { unique: true });
export const Expense = mongoose.model('Expense', schema);
