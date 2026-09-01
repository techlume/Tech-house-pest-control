import crypto from 'crypto';
import { User } from '../models/User.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { sendEmail } from '../services/emailService.js';
import { emailTemplates } from '../services/emailTemplates.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const hash = (userId, code) => crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(userId + ':' + code).digest('hex');

export async function requestEmailOtp(req, res) {
  const email = req.validated.body.email.toLowerCase();
  const user = await User.findOne({ email, active: true });
  if (!user || user.emailVerifiedAt) return res.status(202).json({ message: 'If verification is required, an OTP will be sent.' });
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const template = emailTemplates.verification({ companyName: 'Tech House Pest Control', otp: code });
  await sendEmail({ to: user.email, subject: 'Verify your Tech House Pest Control account', text: template.text, html: template.html });
  await EmailVerification.findOneAndUpdate({ userId: user._id }, { codeHash: hash(user.id, code), attempts: 0, expiresAt }, { upsert: true, new: true });
  res.status(202).json({ message: 'Verification OTP sent.' });
}

export async function verifyEmailOtp(req, res) {
  const { email, otp } = req.validated.body;
  const user = await User.findOne({ email: email.toLowerCase(), active: true });
  if (!user) throw new AppError(400, 'Invalid or expired verification code', 'INVALID_OTP');
  if (user.emailVerifiedAt) return res.json({ message: 'Email is already verified.' });
  const record = await EmailVerification.findOne({ userId: user._id });
  if (!record || record.expiresAt <= new Date() || record.attempts >= 5) throw new AppError(400, 'Invalid or expired verification code', 'INVALID_OTP');
  if (record.codeHash !== hash(user.id, otp)) {
    record.attempts += 1;
    await record.save();
    throw new AppError(400, 'Invalid or expired verification code', 'INVALID_OTP');
  }
  user.emailVerifiedAt = new Date();
  await user.save();
  await EmailVerification.deleteOne({ _id: record._id });
  res.json({ message: 'Email verified. You can now sign in.' });
}
