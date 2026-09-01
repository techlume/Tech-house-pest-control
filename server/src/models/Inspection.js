import mongoose from 'mongoose';
const findingSchema = new mongoose.Schema(
  {
    area: String,
    pestType: { type: String, required: true },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    observation: String,
    recommendation: String,
  },
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
    inspectionNo: { type: String, required: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    propertyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    scheduledAt: { type: Date, required: true },
    inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    findings: [findingSchema],
    recommendedServices: [
      {
        name: String,
        visits: { type: Number, default: 1 },
        estimatedRate: Number,
      },
    ],
    notes: String,
    completedAt: Date,
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
schema.index({ companyId: 1, branchId: 1, inspectionNo: 1 }, { unique: true });
export const Inspection = mongoose.model('Inspection', schema);
