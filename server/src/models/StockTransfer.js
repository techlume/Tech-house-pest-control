import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    fromBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    toBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    sourceProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    destinationProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batchNo: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    note: String,
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
export const StockTransfer = mongoose.model('StockTransfer', schema);
