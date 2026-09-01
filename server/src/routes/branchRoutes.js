import { Router } from 'express';
import { Branch } from '../models/Branch.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES, STAFF_ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { pick } from '../utils/pick.js';
const router = Router();
router.use(authenticate, allowRoles(...STAFF_ROLES));
router.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      branches: await Branch.find(branchScope(req, req.query.branchId)).sort({
        name: 1,
      }),
    }),
  ),
);
router.post(
  '/',
  allowRoles(ROLES.OWNER, ROLES.ADMIN),
  asyncHandler(async (req, res) =>
    res.status(201).json({
      branch: await Branch.create({
        ...req.body,
        companyId: req.auth.companyId,
      }),
    }),
  ),
);
router.patch(
  '/:id',
  allowRoles(ROLES.OWNER, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const branch = await Branch.findOne({
      _id: req.params.id,
      companyId: req.auth.companyId,
    });
    if (!branch) throw new AppError(404, 'Branch not found');
    Object.assign(
      branch,
      pick(req.body, [
        'name',
        'code',
        'email',
        'phone',
        'gstin',
        'address',
        'active',
      ]),
    );
    await branch.save();
    res.json({ branch });
  }),
);
export default router;
