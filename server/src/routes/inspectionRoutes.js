import { Router } from 'express';
import { Inspection } from '../models/Inspection.js';
import { Customer } from '../models/Customer.js';
import { authenticate, allowRoles, branchScope, customerDataScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination, writeBranch } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { assertTransition } from '../utils/workflow.js';
import { pick } from '../utils/pick.js';
import { User } from '../models/User.js';
const router = Router();
const editors = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.SALESPERSON,
  ROLES.DISPATCHER,
  ROLES.TECHNICIAN,
];
const transitions = {
  Scheduled: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};
const editableFields = [
  'scheduledAt',
  'inspectorId',
  'status',
  'findings',
  'recommendedServices',
  'notes',
];
router.use(authenticate);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { ...branchScope(req, req.query.branchId), ...customerDataScope(req) };
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Inspection.find(filter)
        .populate('customerId', 'name customerNo')
        .populate('inspectorId', 'name')
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit),
      Inspection.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.post(
  '/',
  allowRoles(...editors.slice(0, 4)),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId);
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      ...branchScope(req, branchId),
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    if (!customer.properties.id(req.body.propertyId))
      throw new AppError(422, 'Property does not belong to customer');
    const scope = { companyId: req.auth.companyId, branchId };
    const inspection = await Inspection.create({
      ...req.body,
      ...scope,
      status: 'Scheduled',
      inspectorId: null,
      inspectionNo: await nextReference(
        Inspection,
        scope,
        'inspectionNo',
        'INS',
      ),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ inspection });
  }),
);
router.patch(
  '/:id',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const item = await Inspection.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!item) throw new AppError(404, 'Inspection not found');
    assertTransition(item.status, req.body.status, transitions, 'Inspection');
    if (
      req.body.status === 'Completed' &&
      !req.body.findings?.length &&
      !item.findings.length
    )
      throw new AppError(
        422,
        'At least one finding is required to complete an inspection',
      );
    if (req.body.inspectorId) {
      const inspector = await User.findOne({
        _id: req.body.inspectorId,
        companyId: item.companyId,
        branchId: item.branchId,
        role: ROLES.TECHNICIAN,
        active: true,
      });
      if (!inspector) throw new AppError(422, 'Select a technician from this branch');
    }
    Object.assign(item, pick(req.body, editableFields), {
      updatedBy: req.auth.userId,
    });
    if (req.body.status === 'Completed' && !item.completedAt)
      item.completedAt = new Date();
    await item.save();
    res.json({ inspection: item });
  }),
);
export default router;
