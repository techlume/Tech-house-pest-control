import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { Customer } from '../models/Customer.js';
import { Branch } from '../models/Branch.js';
import { ROLES } from '../constants/roles.js';
import { nextReference } from '../services/sequenceService.js';

async function seed() {
  const email = process.env.CUSTOMER_EMAIL?.toLowerCase();
  const password = process.env.CUSTOMER_PASSWORD;
  const name = process.env.CUSTOMER_NAME;
  const phone = process.env.CUSTOMER_PHONE;
  if (!email || !password || !name || !phone)
    throw new Error('Required customer environment values are missing');
  await connectDatabase();
  const owner = await User.findOne({ role: ROLES.OWNER, active: true });
  if (!owner) throw new Error('Seed the owner first');
  const branch = await Branch.findOne({
    companyId: owner.companyId,
    active: true,
  }).sort({ createdAt: 1 });
  if (!branch) throw new Error('No active branch found');
  let customer = await Customer.findOne({ companyId: owner.companyId, email });
  if (!customer) {
    const scope = { companyId: owner.companyId, branchId: branch._id };
    customer = await Customer.create({
      ...scope,
      customerNo: await nextReference(Customer, scope, 'customerNo', 'CUS'),
      name,
      phone,
      email,
      customerType: 'Residential',
      properties: [{
        name: 'Primary Site',
        propertyType: 'Residential',
        address: {
          line1: process.env.CUSTOMER_ADDRESS || 'Cuddalore',
          city: process.env.CUSTOMER_CITY || 'Cuddalore',
          state: process.env.CUSTOMER_STATE || 'Tamil Nadu',
          pin: process.env.CUSTOMER_PIN,
        },
      }],
      createdBy: owner._id,
      updatedBy: owner._id,
    });
  }
  if (await User.exists({ email }))
    throw new Error('A user with this email already exists');
  await User.create({
    companyId: owner.companyId,
    branchId: customer.branchId,
    customerId: customer._id,
    name,
    email,
    phone,
    role: ROLES.CUSTOMER,
    passwordHash: await User.hashPassword(password),
    emailVerifiedAt: new Date(),
  });
  console.info('Created verified customer login for ' + email);
}
seed().finally(() => mongoose.disconnect());
