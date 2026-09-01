import { Router } from 'express';
import { Visit } from '../models/Visit.js';
import {
  authenticate,
  allowRoles,
  branchScope,
  customerDataScope,
} from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { pagination } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import { notifyUser } from '../services/notificationService.js';
const router = Router();
router.use(authenticate);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = {
      ...branchScope(req, req.query.branchId),
      ...customerDataScope(req),
    };
    if (req.query.from || req.query.to)
      filter.scheduledAt = {
        ...(req.query.from ? { $gte: new Date(req.query.from) } : {}),
        ...(req.query.to ? { $lte: new Date(req.query.to) } : {}),
      };
    if (req.auth.role === ROLES.TECHNICIAN)
      filter.technicianId = req.auth.userId;
    const [items, total] = await Promise.all([
      Visit.find(filter)
        .populate('customerId', 'name')
        .populate('technicianId', 'name')
        .populate('contractId', 'contractNo')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(limit),
      Visit.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.patch(
  '/:id/assign',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.DISPATCHER),
  asyncHandler(async (req, res) => {
    const visit = await Visit.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!visit) throw new AppError(404, 'Visit not found');
    if (['Completed', 'Cancelled'].includes(visit.status))
      throw new AppError(
        409,
        'A completed or cancelled visit cannot be assigned',
      );
    const technician = await User.findOne({
      _id: req.body.technicianId,
      companyId: visit.companyId,
      branchId: visit.branchId,
      role: ROLES.TECHNICIAN,
      active: true,
    });
    if (!technician)
      throw new AppError(422, 'Select an active technician from this branch');
    visit.technicianId = req.body.technicianId;
    visit.status = 'Assigned';
    visit.updatedBy = req.auth.userId;
    await visit.save();
    await notifyUser(visit.technicianId, {
      type: 'VISIT_ASSIGNED',
      title: 'New service visit assigned',
      message:
        visit.visitNo +
        ' is scheduled for ' +
        new Date(visit.scheduledAt).toLocaleString('en-IN'),
      link: '/jobs',
    });
    res.json({ visit });
  }),
);
router.patch(
  '/:id/reschedule',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.DISPATCHER),
  asyncHandler(async (req, res) => {
    const visit = await Visit.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!visit) throw new AppError(404, 'Visit not found');
    if (!['Scheduled', 'Assigned'].includes(visit.status))
      throw new AppError(409, 'Only scheduled or assigned visits can be rescheduled');
    const scheduledAt = new Date(req.body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()))
      throw new AppError(422, 'A valid schedule date and time is required');
    visit.scheduledAt = scheduledAt;
    visit.updatedBy = req.auth.userId;
    await visit.save();
    res.json({ visit });
  }),
);
export default router;
