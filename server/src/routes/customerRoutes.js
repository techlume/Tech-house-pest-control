import { Router } from 'express';
import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination, writeBranch } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { pick } from '../utils/pick.js';
const router = Router();
const editors = [ROLES.ADMIN];
router.use(authenticate);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { ...branchScope(req, req.query.branchId) };
    if (req.query.search) {
      const matchingInvoiceCustomerIds = await Invoice.find({
        ...branchScope(req, req.query.branchId),
        invoiceNo: { $regex: req.query.search, $options: 'i' },
      }).distinct('customerId');
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
        { customerNo: { $regex: req.query.search, $options: 'i' } },
        { _id: { $in: matchingInvoiceCustomerIds } },
      ];
    }
    const [items, total] = await Promise.all([
      Customer.find(filter)
        .populate({ path: 'sourceLeadId', populate: { path: 'createdBy', select: 'name' } })
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.post(
  '/',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId);
    const scope = { companyId: req.auth.companyId, branchId };
    const customer = await Customer.create({
      ...req.body,
      ...scope,
      customerNo: await nextReference(Customer, scope, 'customerNo', 'CUS'),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ customer });
  }),
);
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    res.json({ customer });
  }),
);
router.patch(
  '/:id',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    Object.assign(
      customer,
      pick(req.body, [
        'name',
        'phone',
        'email',
        'customerType',
        'gstin',
        'billingAddress',
        'creditDays',
        'active',
      ]),
      { updatedBy: req.auth.userId },
    );
    await customer.save();
    res.json({ customer });
  }),
);
router.post(
  '/:id/properties',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    customer.properties.push(req.body);
    customer.updatedBy = req.auth.userId;
    await customer.save();
    res.status(201).json({ property: customer.properties.at(-1), customer });
  }),
);
router.patch(
  '/:id/properties/:propertyId',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    const property = customer.properties.id(req.params.propertyId);
    if (!property) throw new AppError(404, 'Property not found');
    Object.assign(
      property,
      pick(req.body, [
        'name',
        'propertyType',
        'address',
        'contactName',
        'contactPhone',
        'location',
        'active',
      ]),
    );
    customer.updatedBy = req.auth.userId;
    await customer.save();
    res.json({ property, customer });
  }),
);
export default router;
