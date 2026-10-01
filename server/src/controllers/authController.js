import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from '../services/tokenService.js';
import { env } from '../config/env.js';
import { audit } from '../services/auditService.js';
// Cross-site deployments (client and API on different domains) need SameSite=None,
// which browsers only honour on a Secure (HTTPS) cookie. Same-site/local dev keeps
// the stricter Lax setting so it still works over plain http://localhost.
// Keyed off COOKIE_SECURE (explicit operator intent) as well as NODE_ENV, since a
// deployment that forgets to set NODE_ENV=production would otherwise silently fall
// back to the broken Lax/cross-site combination.
const crossSite = env.NODE_ENV === 'production' || env.cookieSecure;
const cookie = {
  httpOnly: true,
  secure: crossSite,
  sameSite: crossSite ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 604800000,
};
const present = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  canEdit: Boolean(u.canEdit),
  companyId: u.companyId,
  branchId: u.branchId,
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
  const user = await User.findById(payload.sub).select('+tokenVersion canEdit');
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
