import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES, STAFF_ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = Router();
router.use(authenticate, allowRoles(...STAFF_ROLES));
router.get(
  '/salespeople',
  asyncHandler(async (req, res) => {
    const salespeople = await User.find({
      ...branchScope(req, req.query.branchId),
      role: ROLES.SALESPERSON,
      active: true,
    })
      .select('name email phone branchId')
      .sort({ name: 1 });
    res.json({ salespeople });
  }),
);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const technicians = await User.find({
      ...branchScope(req, req.query.branchId),
      role: ROLES.TECHNICIAN,
      active: true,
    })
      .select('name email phone branchId')
      .sort({ name: 1 });
    res.json({ technicians });
  }),
);
export default router;
