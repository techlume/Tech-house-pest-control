import { Router } from 'express';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
const router = Router();
router.use(authenticate);
router.get('/notifications', asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = { companyId: req.auth.companyId, userId: req.auth.userId };
  if (req.query.unread === 'true') filter.readAt = null;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ companyId: req.auth.companyId, userId: req.auth.userId, readAt: null }),
  ]);
  res.json({ items, total, unread, page, limit });
}));
router.patch('/notifications/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { companyId: req.auth.companyId, userId: req.auth.userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  res.json({ success: true });
}));
router.patch('/notifications/:id/read', asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, companyId: req.auth.companyId, userId: req.auth.userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw new AppError(404, 'Notification not found');
  res.json({ notification });
}));
router.get(
  '/audit',
  allowRoles(ROLES.OWNER, ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = branchScope(req, req.query.branchId);
    if (req.query.action) filter.action = req.query.action;
    if (req.query.from || req.query.to)
      filter.createdAt = {
        ...(req.query.from ? { $gte: new Date(req.query.from) } : {}),
        ...(req.query.to ? { $lte: new Date(req.query.to) } : {}),
      };
    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actorId', 'name email role')
        .populate('branchId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  }),
);
export default router;
