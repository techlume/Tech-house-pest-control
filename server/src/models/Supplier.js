import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    supplierNo: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: String,
    email: String,
    gstin: String,
    address: { line1: String, city: String, state: String, pin: String },
    paymentTerms: String,
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
schema.index({ companyId: 1, branchId: 1, supplierNo: 1 }, { unique: true });
export const Supplier = mongoose.model('Supplier', schema);
