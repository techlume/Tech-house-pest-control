import { Router } from 'express';
import { Complaint } from '../models/Complaint.js';
import { Customer } from '../models/Customer.js';
import { authenticate, allowRoles, branchScope, customerDataScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeBranch } from '../utils/scope.js';
import { nextReference } from '../services/sequenceService.js';
import { AppError } from '../utils/AppError.js';
import { assertTransition } from '../utils/workflow.js';
import { pick } from '../utils/pick.js';
import { User } from '../models/User.js';
import { notifyUser } from '../services/notificationService.js';
const r = Router();
const transitions = {
  Open: ['Assigned', 'In Progress', 'Cancelled'],
  Assigned: ['In Progress', 'Resolved', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed', 'In Progress'],
  Closed: [],
  Cancelled: [],
};
const editableFields = ['priority', 'status', 'assignedTo', 'resolution'];
r.use(authenticate);
r.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      items: await Complaint.find({
        ...branchScope(req, req.query.branchId),
        ...customerDataScope(req),
      })
        .populate('customerId', 'name')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 }),
    }),
  ),
);
r.post(
  '/',
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId),
      scope = { companyId: req.auth.companyId, branchId },
      hours =
        req.body.priority === 'Critical'
          ? 4
          : req.body.priority === 'High'
            ? 12
            : 24,
      slaDueAt = new Date(Date.now() + hours * 3600000);
    const customerId =
      req.auth.role === ROLES.CUSTOMER ? req.auth.customerId : req.body.customerId;
    const customer = await Customer.findOne({ _id: customerId, ...scope });
    if (!customer) throw new AppError(422, 'Select a valid customer');
    const complaint = await Complaint.create({
      ...req.body,
      ...scope,
      customerId,
      status: 'Open',
      assignedTo: null,
      resolution: undefined,
      resolvedAt: undefined,
      slaDueAt,
      complaintNo: await nextReference(Complaint, scope, 'complaintNo', 'CMP'),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ complaint });
  }),
);
r.patch(
  '/:id',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.TECHNICIAN),
  asyncHandler(async (req, res) => {
    const complaint = await Complaint.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!complaint) throw new AppError(404, 'Complaint not found');
    assertTransition(complaint.status, req.body.status, transitions, 'Complaint');
    if (req.body.status === 'Resolved' && !req.body.resolution)
      throw new AppError(422, 'A resolution is required');
    if (req.body.assignedTo) {
      const assignee = await User.findOne({
        _id: req.body.assignedTo,
        companyId: complaint.companyId,
        branchId: complaint.branchId,
        role: { $in: [ROLES.ADMIN, ROLES.DISPATCHER, ROLES.TECHNICIAN] },
        active: true,
      });
      if (!assignee) throw new AppError(422, 'Select an active staff member from this branch');
    }
    if (
      req.body.status === 'Assigned' &&
      !req.body.assignedTo &&
      !complaint.assignedTo
    )
      throw new AppError(422, 'Assign a staff member before changing status to Assigned');
    Object.assign(complaint, pick(req.body, editableFields), {
      updatedBy: req.auth.userId,
    });
    if (req.body.status === 'Resolved') complaint.resolvedAt = new Date();
    await complaint.save();
    if (req.body.assignedTo)
      await notifyUser(req.body.assignedTo, {
        type: 'COMPLAINT_ASSIGNED',
        title: 'Complaint assigned to you',
        message: complaint.complaintNo + ' · Priority ' + complaint.priority,
        link: '/complaints',
      });
    res.json({ complaint });
  }),
);
export default r;
