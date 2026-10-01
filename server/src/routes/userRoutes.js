import { Router } from 'express';
import { User } from '../models/User.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { Branch } from '../models/Branch.js';
import { assertStrongPassword } from '../utils/passwordPolicy.js';
import { pick } from '../utils/pick.js';

const router = Router();

router.use(authenticate, allowRoles(ROLES.ADMIN));

router.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      users: await User.find(branchScope(req, req.query.branchId)).sort({
        name: 1,
      }),
    }),
  ),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { password, ...data } = req.body;
    assertStrongPassword(password);
    const existing = await User.findOne({ email: data.email.toLowerCase().trim() });
    if (existing) {
      throw new AppError(409, `User with email "${data.email}" already exists`);
    }
    if (data.role !== ROLES.ADMIN) {
      const branch = await Branch.findOne({
        _id: data.branchId,
        companyId: req.auth.companyId,
        active: true,
      });
      if (!branch)
        throw new AppError(422, 'Select a valid active company branch');
    }

    const user = await User.create({
      ...data,
      companyId: req.auth.companyId,
      emailVerifiedAt: new Date(),
      passwordHash: await User.hashPassword(password),
    });
    res.status(201).json({ user });
  }),
);

const loadManageableUser = async (req) => {
  const user = await User.findOne({
    _id: req.params.id,
    companyId: req.auth.companyId,
  }).select('+tokenVersion +passwordHash');
  if (!user) throw new AppError(404, 'User not found');
  return user;
};

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await loadManageableUser(req);
    const changes = pick(req.body, [
      'name',
      'phone',
      'role',
      'branchId',
      'canEdit',
      'active',
    ]);
    if (String(user._id) === String(req.auth.userId) && changes.active === false)
      throw new AppError(409, 'You cannot deactivate your own account');
    const role = changes.role || user.role;
    const branchId = role === ROLES.ADMIN ? null : changes.branchId || user.branchId;
    if (role !== ROLES.ADMIN) {
      const branch = await Branch.findOne({
        _id: branchId,
        companyId: req.auth.companyId,
        active: true,
      });
      if (!branch) throw new AppError(422, 'Select a valid active company branch');
    }
    changes.branchId = branchId;
    Object.assign(user, changes);
    await user.save();
    const { passwordHash, tokenVersion, ...safeUser } = user.toObject();
    res.json({ user: safeUser });
  }),
);

router.post(
  '/:id/reset-password',
  asyncHandler(async (req, res) => {
    const user = await loadManageableUser(req);
    assertStrongPassword(req.body.password);
    user.passwordHash = await User.hashPassword(req.body.password);
    user.tokenVersion += 1;
    await user.save();
    res.json({ message: 'Password reset and existing sessions revoked' });
  }),
);

export default router;
