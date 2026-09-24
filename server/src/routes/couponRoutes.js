import { Router } from 'express';
import { Coupon } from '../models/Coupon.js';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { pick } from '../utils/pick.js';
const router = Router();
const editableFields = ['description', 'discountPercent', 'expiresAt', 'usageLimit', 'active'];
router.get(
  '/validate',
  asyncHandler(async (req, res) => {
    const code = String(req.query.code || '').trim().toUpperCase();
    if (!code) throw new AppError(422, 'Enter a coupon code');
    const coupon = await Coupon.findOne({ code });
    if (!coupon || !coupon.active)
      return res.json({ valid: false, message: 'This coupon code is not valid' });
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      return res.json({ valid: false, message: 'This coupon has expired' });
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)
      return res.json({ valid: false, message: 'This coupon has reached its usage limit' });
    res.json({ valid: true, code: coupon.code, discountPercent: coupon.discountPercent, description: coupon.description });
  }),
);
router.use(authenticate, allowRoles(ROLES.ADMIN));
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ items: await Coupon.find().sort({ createdAt: -1 }) });
  }),
);
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) throw new AppError(422, 'A coupon code is required');
    if (await Coupon.exists({ code }))
      throw new AppError(409, 'A coupon with this code already exists');
    const coupon = await Coupon.create({
      code,
      description: req.body.description,
      discountPercent: Number(req.body.discountPercent),
      expiresAt: req.body.expiresAt || null,
      usageLimit: req.body.usageLimit || null,
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ coupon });
  }),
);
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new AppError(404, 'Coupon not found');
    Object.assign(coupon, pick(req.body, editableFields), { updatedBy: req.auth.userId });
    await coupon.save();
    res.json({ coupon });
  }),
);
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) throw new AppError(404, 'Coupon not found');
    await coupon.deleteOne();
    res.status(204).end();
  }),
);
export default router;
