import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '../services/tokenService.js';
import { env } from '../config/env.js';
import { audit } from '../services/auditService.js';
const cookie = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: 604800000,
};
const present = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  companyId: u.companyId,
  branchId: u.branchId,
  customerId: u.customerId,
});
export async function login(req, res) {
  const { email, password } = req.validated.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash +tokenVersion',
  );
  if (!user || !(await user.verifyPassword(password)))
    throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user.active)
    throw new AppError(403, 'Account is inactive', 'ACCOUNT_INACTIVE');
  if (user.role === 'CUSTOMER' && !user.emailVerifiedAt)
    throw new AppError(403, 'Verify your email before signing in', 'EMAIL_NOT_VERIFIED');
  user.lastLoginAt = new Date();
  await user.save();
  res.cookie('refreshToken', createRefreshToken(user), cookie);
  req.auth = {
    userId: user.id,
    companyId: user.companyId,
    branchId: user.branchId,
  };
  await audit(req, 'AUTH_LOGIN', 'User', user._id);
  res.json({ accessToken: createAccessToken(user), user: present(user) });
}
export async function refresh(req, res) {
  const token = req.cookies.refreshToken;
  if (!token)
    throw new AppError(401, 'Refresh session missing', 'UNAUTHENTICATED');
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Refresh session expired', 'INVALID_TOKEN');
  }
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user?.active || user.tokenVersion !== payload.version)
    throw new AppError(401, 'Session revoked', 'SESSION_REVOKED');
  res.json({ accessToken: createAccessToken(user), user: present(user) });
}
export async function logout(_req, res) {
  res.clearCookie('refreshToken', cookie);
  res.status(204).end();
}
export async function me(req, res) {
  const user = await User.findById(req.auth.userId)
    .populate('branchId', 'name code')
    .populate('companyId', 'name logoUrl palette');
  res.json({
    user: present(user),
    company: user.companyId,
    branch: user.branchId,
  });
}
