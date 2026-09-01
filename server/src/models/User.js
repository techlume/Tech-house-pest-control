import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE_VALUES } from '../constants/roles.js';
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
      default: null,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    phone: String,
    role: { type: String, enum: ROLE_VALUES, required: true },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, select: false },
    lastLoginAt: Date,
    emailVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};
schema.statics.hashPassword = (password) => bcrypt.hash(password, 12);
export const User = mongoose.model('User', schema);
