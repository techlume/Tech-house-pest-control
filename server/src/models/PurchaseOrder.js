import mongoose from 'mongoose';
const line = new mongoose.Schema(
  { productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, batchNo: { type: String, required: true }, expiryDate: Date, quantity: { type: Number, required: true, min: 0.001 }, receivedQuantity: { type: Number, default: 0 }, rate: { type: Number, required: true, min: 0 }, taxRate: { type: Number, default: 0 }, total: Number },
  { _id: true },
);
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    purchaseNo: { type: String, required: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    orderDate: { type: Date, default: Date.now },
    expectedDate: Date,
    lines: { type: [line], validate: (value) => value.length > 0 },
    subtotal: Number,
    taxTotal: Number,
    grandTotal: Number,
    status: { type: String, enum: ['Draft', 'Approved', 'Received', 'Cancelled'], default: 'Draft' },
    note: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
schema.index({ companyId: 1, branchId: 1, purchaseNo: 1 }, { unique: true });
export const PurchaseOrder = mongoose.model('PurchaseOrder', schema);
