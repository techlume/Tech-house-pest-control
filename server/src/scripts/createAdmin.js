import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { Company } from '../models/Company.js';
import { Branch } from '../models/Branch.js';
import { User } from '../models/User.js';
import { ROLES } from '../constants/roles.js';
import { assertStrongPassword } from '../utils/passwordPolicy.js';

async function run() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  assertStrongPassword(password);

  await connectDatabase();

  let company = await Company.findOne().sort({ createdAt: 1 });
  if (!company) throw new Error('No company found — seed the owner/company first');
  let branch = await Branch.findOne({ companyId: company._id }).sort({ createdAt: 1 });
  if (!branch) throw new Error('No branch found for company ' + company.name);

  const passwordHash = await User.hashPassword(password);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.role = ROLES.ADMIN;
    existing.companyId = company._id;
    existing.branchId = branch._id;
    existing.passwordHash = passwordHash;
    existing.active = true;
    existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
    await existing.save();
    console.info(`Updated existing user ${email} -> role ADMIN with new password`);
  } else {
    await User.create({
      companyId: company._id,
      branchId: branch._id,
      name,
      email,
      role: ROLES.ADMIN,
      passwordHash,
      emailVerifiedAt: new Date(),
    });
    console.info(`Created ADMIN user ${email}`);
  }
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
