import { Router } from 'express';
import { Quotation } from '../models/Quotation.js';
import { Customer } from '../models/Customer.js';
import { Inspection } from '../models/Inspection.js';
import { Company } from '../models/Company.js';
import { authenticate, allowRoles, branchScope, customerDataScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination, writeBranch } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { assertTransition } from '../utils/workflow.js';
import { sendDocumentEmail } from '../services/documentEmailService.js';

const router = Router();
const editors = [ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON];
const transitions = {
  Draft: ['Approval Pending', 'Sent', 'Rejected'],
  'Approval Pending': ['Sent', 'Rejected'],
  Sent: ['Viewed', 'Accepted', 'Rejected', 'Expired'],
  Viewed: ['Accepted', 'Rejected', 'Expired'],
  Accepted: ['Expired'],
  Rejected: [],
  Expired: [],
  Converted: [],
};
router.use(authenticate);
const totals = (body) => {
  let subtotal = 0,
    discountTotal = 0,
    taxTotal = 0;
  const lines = (body.lines || []).map((l) => {
    const base = Number(l.quantity || 1) * Number(l.rate || 0);
    const discount = Math.min(Number(l.discount || 0), base);
    const taxable = base - discount;
    const tax =
      body.gstTreatment === 'GST'
        ? (taxable * Number(l.taxRate || 0)) / 100
        : 0;
    subtotal += base;
    discountTotal += discount;
    taxTotal += tax;
    return { ...l, lineTotal: taxable + tax };
  });
  return {
    lines,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal: subtotal - discountTotal + taxTotal,
  };
};
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { ...branchScope(req, req.query.branchId), ...customerDataScope(req) };
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Quotation.find(filter)
        .populate('customerId', 'name customerNo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Quotation.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.post(
  '/',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId);
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      ...branchScope(req, branchId),
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    const scope = { companyId: req.auth.companyId, branchId };
    const quotation = await Quotation.create({
      ...req.body,
      ...totals(req.body),
      ...scope,
      status: 'Draft',
      version: 1,
      quotationNo: await nextReference(Quotation, scope, 'quotationNo', 'QUO'),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ quotation });
  }),
);
router.post(
  '/from-inspection/:inspectionId',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const inspection = await Inspection.findOne({
      ...branchScope(req),
      _id: req.params.inspectionId,
      status: 'Completed',
    });
    if (!inspection) throw new AppError(404, 'Completed inspection not found');
    if (await Quotation.exists({ inspectionId: inspection._id }))
      throw new AppError(409, 'A quotation already exists for this inspection');
    if (!inspection.recommendedServices.length)
      throw new AppError(422, 'Add at least one recommended service first');
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + Number(req.body.validDays || 15));
    const body = {
      gstTreatment: req.body.gstTreatment || 'GST',
      taxType: req.body.taxType || 'CGST+SGST',
      lines: inspection.recommendedServices.map((service) => ({
        serviceName: service.name,
        description: 'Recommended from inspection ' + inspection.inspectionNo,
        visits: service.visits || 1,
        quantity: 1,
        rate: Number(service.estimatedRate || 0),
        taxRate: Number(req.body.taxRate ?? 18),
      })),
    };
    const scope = {
      companyId: inspection.companyId,
      branchId: inspection.branchId,
    };
    const quotation = await Quotation.create({
      ...body,
      ...totals(body),
      ...scope,
      quotationNo: await nextReference(Quotation, scope, 'quotationNo', 'QUO'),
      inspectionId: inspection._id,
      customerId: inspection.customerId,
      propertyId: inspection.propertyId,
      validUntil,
      status: 'Draft',
      version: 1,
      terms: req.body.terms || 'Payment due as agreed.',
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    res.status(201).json({ quotation });
  }),
);
router.patch(
  '/:id/status',
  allowRoles(...editors),
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!quotation) throw new AppError(404, 'Quotation not found');
    assertTransition(quotation.status, req.body.status, transitions, 'Quotation');
    quotation.status = req.body.status;
    quotation.updatedBy = req.auth.userId;
    await quotation.save();
    if (req.body.status === 'Sent') {
      const [customer, company] = await Promise.all([
        Customer.findById(quotation.customerId).select('name email').lean(),
        Company.findById(req.auth.companyId).select('name legalName').lean(),
      ]);
      const companyName = company?.legalName || company?.name || 'Tech House Pest Control';
      await sendDocumentEmail({
        companyId: quotation.companyId,
        branchId: quotation.branchId,
        createdBy: req.auth.userId,
        to: customer?.email,
        eventType: 'QUOTATION_EMAIL',
        template: 'quotation',
        subject: 'Quotation ' + quotation.quotationNo + ' from ' + companyName,
        templateData: {
          companyName,
          quotationNo: quotation.quotationNo,
          customerName: customer?.name || 'Customer',
          validUntil: quotation.validUntil,
        },
      });
    }
    res.json({ quotation });
  }),
);
export default router;

