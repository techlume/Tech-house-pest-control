import { Router } from 'express';
import { Complaint } from '../models/Complaint.js';
import { Customer } from '../models/Customer.js';
import { Company } from '../models/Company.js';
import { Branch } from '../models/Branch.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
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

// Public complaint registration from website storefront
r.post(
  '/public',
  asyncHandler(async (req, res) => {
    const { name, phone, email, subject, description, category, priority, address } = req.body;
    if (!name?.trim() || !phone?.trim() || !description?.trim()) {
      throw new AppError(422, 'Name, phone number and complaint description are required');
    }

    const defaultCompany = await Company.findOne({});
    const defaultBranch = await Branch.findOne({});
    if (!defaultCompany || !defaultBranch) {
      throw new AppError(500, 'Company configuration is pending');
    }

    const companyId = defaultCompany._id;
    const branchId = defaultBranch._id;
    const scope = { companyId, branchId };

    // Find or create customer
    let customer = await Customer.findOne({ phone: phone.trim() });
    if (!customer) {
      customer = await Customer.create({
        ...scope,
        customerNo: await nextReference(Customer, scope, 'customerNo', 'CUS'),
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || '',
        customerType: 'Residential',
        billingAddress: {
          line1: address || 'Site Address Pending',
          city: 'Cuddalore',
          state: 'Tamil Nadu',
        },
        properties: [
          {
            name: 'Primary Site',
            propertyType: 'Residential',
            address: {
              line1: address || 'Site Address Pending',
              city: 'Cuddalore',
              state: 'Tamil Nadu',
            },
          },
        ],
      });
    }

    const hours = priority === 'Critical' ? 4 : priority === 'High' ? 12 : 24;
    const slaDueAt = new Date(Date.now() + hours * 3600000);
    const complaint = await Complaint.create({
      ...scope,
      customerId: customer._id,
      category: category || 'Customer Service',
      subject: subject || 'Site Service Grievance',
      description: description.trim(),
      priority: priority || 'High',
      status: 'Open',
      slaDueAt,
      complaintNo: await nextReference(Complaint, scope, 'complaintNo', 'CMP'),
    });

    res.status(201).json({
      success: true,
      complaintNo: complaint.complaintNo,
      complaint,
      message: `Your complaint #${complaint.complaintNo} has been registered successfully. Our support team will address it promptly.`,
    });
  }),
);

r.use(authenticate);
r.get(
  '/',
  asyncHandler(async (req, res) =>
    res.json({
      items: await Complaint.find(branchScope(req, req.query.branchId))
        .populate('customerId', 'name phone customerNo email')
        .populate('assignedTo', 'name email')
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
    const customerId = req.body.customerId;
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
  allowRoles(ROLES.ADMIN, ROLES.TECHNICIAN),
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
        role: { $in: [ROLES.ADMIN, ROLES.TECHNICIAN] },
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
