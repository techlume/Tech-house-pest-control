import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    legalName: String,
    gstin: String,
    pan: String,
    email: String,
    phone: String,
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pin: String,
    },
    invoiceTerms: String,
    logoUrl: { type: String, default: '/tech-house-logo.png' },
    palette: {
      primary: { type: String, default: '#159BD3' },
      accent: { type: String, default: '#9BD51C' },
    },
    timezone: { type: String, default: 'Asia/Kolkata' },
    currency: { type: String, default: 'INR' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export const Company = mongoose.model('Company', schema);
