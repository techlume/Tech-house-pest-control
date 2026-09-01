import mongoose from 'mongoose';
const serviceSchema = new mongoose.Schema(
  { serviceName: String, visits: { type: Number, min: 1 }, rate: Number },
  { _id: true },
);
const schema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    contractNo: { type: String, required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    propertyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation',
      required: true,
    },
    renewedFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
    contractType: { type: String, enum: ['One-time', 'AMC'], default: 'AMC' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Paused', 'Expired', 'Renewed', 'Cancelled'],
      default: 'Active',
    },
    services: [serviceSchema],
    contractValue: { type: Number, required: true },
    billingFrequency: {
      type: String,
      enum: ['Advance', 'Per Visit', 'Monthly', 'Quarterly', 'Annually'],
      default: 'Per Visit',
    },
    terms: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);
schema.index({ companyId: 1, branchId: 1, contractNo: 1 }, { unique: true });
export const Contract = mongoose.model('Contract', schema);
