import { Router } from 'express';
import { Company } from '../models/Company.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { pick } from '../utils/pick.js';

const router = Router();
const fields = [
  'name', 'legalName', 'gstin', 'pan', 'email', 'phone', 'address',
  'invoiceTerms', 'logoUrl', 'palette', 'timezone', 'currency',
];
router.use(authenticate, allowRoles(ROLES.OWNER, ROLES.ADMIN));
router.get('/', asyncHandler(async (req, res) => {
  const company = await Company.findById(req.auth.companyId);
  if (!company) throw new AppError(404, 'Company not found');
  res.json({ company });
}));
router.patch('/', asyncHandler(async (req, res) => {
  const company = await Company.findById(req.auth.companyId);
  if (!company) throw new AppError(404, 'Company not found');
  Object.assign(company, pick(req.body, fields));
  await company.save();
  res.json({ company });
}));
export default router;
