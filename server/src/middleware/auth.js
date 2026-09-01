import { User } from '../models/User.js';
import { verifyAccessToken } from '../services/tokenService.js';
import { AppError } from '../utils/AppError.js';
import { GLOBAL_BRANCH_ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer '))
    throw new AppError(401, 'Authentication required', 'UNAUTHENTICATED');
  let payload;
  try {
    payload = verifyAccessToken(header.slice(7));
  } catch {
    throw new AppError(401, 'Session expired', 'INVALID_TOKEN');
  }
  const user = await User.findById(payload.sub).select(
    'companyId branchId customerId role active',
  );
  if (!user?.active)
    throw new AppError(401, 'Account unavailable', 'ACCOUNT_INACTIVE');
  req.auth = {
    userId: user.id,
    companyId: user.companyId,
    branchId: user.branchId,
    customerId: user.customerId,
    role: user.role,
    allBranches: GLOBAL_BRANCH_ROLES.includes(user.role),
  };
  next();
});
export const allowRoles =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.auth.role)
      ? next()
      : next(new AppError(403, 'You do not have permission', 'FORBIDDEN'));
export const branchScope = (req, branchId) =>
  req.auth.allBranches
    ? branchId
      ? { companyId: req.auth.companyId, branchId }
      : { companyId: req.auth.companyId }
    : { companyId: req.auth.companyId, branchId: req.auth.branchId };
export const customerDataScope = (req) =>
  req.auth.role === 'CUSTOMER' ? { customerId: req.auth.customerId } : {};
