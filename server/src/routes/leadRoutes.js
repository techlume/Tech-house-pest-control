import { Router } from 'express';
import { Lead } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES, STAFF_ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination, writeBranch } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { audit } from '../services/auditService.js';
import { assertTransition } from '../utils/workflow.js';
import { pick } from '../utils/pick.js';
import { User } from '../models/User.js';
import { notifyUser } from '../services/notificationService.js';
const router = Router();
const sales = [ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON];
const transitions = {
  New: ['Contacted', 'Lost'],
  Contacted: ['Inspection Required', 'Quotation Sent', 'Lost'],
  'Inspection Required': ['Quotation Sent', 'Lost'],
  'Quotation Sent': ['Negotiation', 'Won', 'Lost'],
  Negotiation: ['Won', 'Lost'],
  Won: [],
  Lost: [],
};
const editableFields = [
  'name',
  'phone',
  'email',
  'source',
  'propertyType',
  'pestTypes',
  'address',
  'city',
  'priority',
  'status',
  'assignedTo',
  'nextFollowUpAt',
  'lostReason',
  'notes',
];
router.use(authenticate, allowRoles(...STAFF_ROLES));
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { ...branchScope(req, req.query.branchId) };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search)
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { leadNo: { $regex: req.query.search, $options: 'i' } },
      ];
    const [items, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.post(
  '/',
  allowRoles(...sales),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId);
    const scope = { companyId: req.auth.companyId, branchId };
    const lead = await Lead.create({
      ...req.body,
      ...scope,
      status: 'New',
      assignedTo: null,
      leadNo: await nextReference(Lead, scope, 'leadNo', 'LEAD'),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
      activities: [
        { type: 'CREATED', note: 'Lead created', createdBy: req.auth.userId },
      ],
    });
    await audit(req, 'LEAD_CREATED', 'Lead', lead._id);
    res.status(201).json({ lead });
  }),
);
router.patch(
  '/:id',
  allowRoles(...sales),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!lead) throw new AppError(404, 'Lead not found');
    const previous = lead.status;
    const previousAssignee = String(lead.assignedTo || '');
    const previousFollowUp = lead.nextFollowUpAt?.toISOString();
    assertTransition(previous, req.body.status, transitions, 'Lead');
    if (req.body.status === 'Lost' && !req.body.lostReason)
      throw new AppError(422, 'A lost reason is required');
    if (
      req.body.nextFollowUpAt &&
      Number.isNaN(new Date(req.body.nextFollowUpAt).getTime())
    )
      throw new AppError(422, 'A valid follow-up date and time is required');
    if (req.body.assignedTo) {
      const assignee = await User.findOne({
        _id: req.body.assignedTo,
        companyId: lead.companyId,
        branchId: lead.branchId,
        role: ROLES.SALESPERSON,
        active: true,
      });
      if (!assignee) throw new AppError(422, 'Select a salesperson from this branch');
    }
    Object.assign(lead, pick(req.body, editableFields), {
      updatedBy: req.auth.userId,
    });
    if (
      Object.prototype.hasOwnProperty.call(req.body, 'assignedTo') &&
      String(req.body.assignedTo || '') !== previousAssignee
    )
      lead.activities.push({
        type: 'ASSIGNED',
        note: req.body.assignedTo ? 'Lead ownership updated' : 'Lead unassigned',
        createdBy: req.auth.userId,
      });
    if (
      req.body.nextFollowUpAt &&
      new Date(req.body.nextFollowUpAt).toISOString() !== previousFollowUp
    )
      lead.activities.push({
        type: 'FOLLOW_UP',
        note: 'Follow-up scheduled for ' + new Date(req.body.nextFollowUpAt).toLocaleString('en-IN'),
        createdBy: req.auth.userId,
      });
    if (req.body.status && req.body.status !== previous)
      lead.activities.push({
        type: 'STATUS_CHANGED',
        note: `${previous} → ${req.body.status}`,
        createdBy: req.auth.userId,
      });
    await lead.save();
    if (
      req.body.assignedTo &&
      String(req.body.assignedTo) !== previousAssignee
    )
      await notifyUser(req.body.assignedTo, {
        type: 'LEAD_ASSIGNED',
        title: 'Lead assigned to you',
        message: lead.leadNo + ' · ' + lead.name,
        link: '/crm',
      });
    res.json({ lead });
  }),
);
router.post(
  '/:id/convert',
  allowRoles(...sales),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!lead) throw new AppError(404, 'Lead not found');
    if (lead.convertedCustomerId)
      throw new AppError(409, 'Lead is already converted');
    if (lead.status === 'Lost')
      throw new AppError(409, 'A lost lead cannot be converted');
    const scope = { companyId: lead.companyId, branchId: lead.branchId };
    const customer = await Customer.create({
      ...scope,
      customerNo: await nextReference(Customer, scope, 'customerNo', 'CUS'),
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      customerType: lead.propertyType,
      sourceLeadId: lead._id,
      properties: [
        {
          name: req.body.propertyName || 'Primary Site',
          propertyType: lead.propertyType,
          address: {
            line1: lead.address || 'Address pending',
            city: lead.city || 'City pending',
            state: req.body.state || 'State pending',
            pin: req.body.pin,
          },
        },
      ],
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    lead.status = 'Won';
    lead.convertedCustomerId = customer._id;
    lead.updatedBy = req.auth.userId;
    lead.activities.push({
      type: 'CONVERTED',
      note: `Converted to ${customer.customerNo}`,
      createdBy: req.auth.userId,
    });
    await lead.save();
    await audit(req, 'LEAD_CONVERTED', 'Customer', customer._id, {
      leadId: lead.id,
    });
    res.status(201).json({ customer, lead });
  }),
);
export default router;
