import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['Created', 'Paid', 'Failed'], default: 'Created' },
    verifiedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
export const PaymentTransaction = mongoose.model('PaymentTransaction', schema);
