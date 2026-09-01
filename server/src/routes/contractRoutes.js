import { Router } from 'express';
import { Contract } from '../models/Contract.js';
import { Visit } from '../models/Visit.js';
import { Quotation } from '../models/Quotation.js';
import {
  authenticate,
  allowRoles,
  branchScope,
  customerDataScope,
} from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { notifyCustomer } from '../services/notificationService.js';
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
    const [items, total] = await Promise.all([
      Contract.find(filter)
        .populate('customerId', 'name customerNo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contract.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.post(
  '/from-quotation/:quotationId',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON),
  asyncHandler(async (req, res) => {
    const quotation = await Quotation.findOne({
      ...branchScope(req),
      _id: req.params.quotationId,
    });
    if (!quotation) throw new AppError(404, 'Quotation not found');
    if (quotation.status !== 'Accepted')
      throw new AppError(
        409,
        'Only an accepted quotation can become a contract',
      );
    if (quotation.status === 'Converted')
      throw new AppError(409, 'Quotation already converted');
    const existing = await Contract.findOne({ quotationId: quotation._id });
    if (existing) throw new AppError(409, 'A contract already exists');
    const start = new Date(req.body.startDate || Date.now()),
      end = new Date(req.body.endDate || start);
    if (!req.body.endDate) end.setFullYear(end.getFullYear() + 1);
    const scope = {
      companyId: quotation.companyId,
      branchId: quotation.branchId,
    };
    const contract = await Contract.create({
      ...scope,
      contractNo: await nextReference(Contract, scope, 'contractNo', 'AMC'),
      customerId: quotation.customerId,
      propertyId: quotation.propertyId,
      quotationId: quotation._id,
      contractType: req.body.contractType || 'AMC',
      startDate: start,
      endDate: end,
      services: quotation.lines.map((l) => ({
        serviceName: l.serviceName,
        visits: l.visits,
        rate: l.rate,
      })),
      contractValue: quotation.grandTotal,
      billingFrequency: req.body.billingFrequency || 'Per Visit',
      terms: quotation.terms,
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    const visits = [];
    let sequence = 0;
    for (const service of contract.services) {
      for (let i = 0; i < service.visits; i++) {
        const scheduled = new Date(start);
        scheduled.setMonth(
          scheduled.getMonth() + Math.floor((i * 12) / service.visits),
        );
        sequence++;
        visits.push({
          ...scope,
          visitNo: `VIS-${new Date().getFullYear().toString().slice(-2)}-${String(Date.now()).slice(-5)}-${sequence}`,
          contractId: contract._id,
          customerId: contract.customerId,
          propertyId: contract.propertyId,
          serviceName: service.serviceName,
          scheduledAt: scheduled,
          createdBy: req.auth.userId,
          updatedBy: req.auth.userId,
        });
      }
    }
    if (visits.length) await Visit.insertMany(visits);
    quotation.status = 'Converted';
    quotation.updatedBy = req.auth.userId;
    await quotation.save();
    res.status(201).json({ contract, visitsCreated: visits.length });
  }),
);
router.patch(
  '/:id/status',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON),
  asyncHandler(async (req, res) => {
    const contract = await Contract.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!contract) throw new AppError(404, 'Contract not found');
    const transitions = {
      Active: ['Paused', 'Cancelled'],
      Paused: ['Active', 'Cancelled'],
      Expired: ['Cancelled'],
    };
    if (!(transitions[contract.status] || []).includes(req.body.status))
      throw new AppError(
        409,
        'Contract cannot move from ' + contract.status + ' to ' + req.body.status,
      );
    contract.status = req.body.status;
    contract.updatedBy = req.auth.userId;
    await contract.save();
    if (req.body.status === 'Cancelled')
      await Visit.updateMany(
        {
          contractId: contract._id,
          status: { $in: ['Scheduled', 'Assigned'] },
          scheduledAt: { $gte: new Date() },
        },
        { $set: { status: 'Cancelled', updatedBy: req.auth.userId } },
      );
    res.json({ contract });
  }),
);
router.post(
  '/:id/renew',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.SALESPERSON),
  asyncHandler(async (req, res) => {
    const previous = await Contract.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!previous) throw new AppError(404, 'Contract not found');
    if (!['Active', 'Expired'].includes(previous.status))
      throw new AppError(409, 'Only active or expired contracts can be renewed');
    if (await Contract.exists({ renewedFromId: previous._id }))
      throw new AppError(409, 'This contract has already been renewed');
    const startDate = req.body.startDate
      ? new Date(req.body.startDate)
      : new Date(previous.endDate.getTime() + 86400000);
    const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date(startDate);
    if (!req.body.endDate) endDate.setFullYear(endDate.getFullYear() + 1);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate <= startDate
    )
      throw new AppError(422, 'Enter a valid renewal date range');
    const scope = {
      companyId: previous.companyId,
      branchId: previous.branchId,
    };
    const contract = await Contract.create({
      ...scope,
      contractNo: await nextReference(Contract, scope, 'contractNo', 'AMC'),
      customerId: previous.customerId,
      propertyId: previous.propertyId,
      quotationId: previous.quotationId,
      renewedFromId: previous._id,
      contractType: previous.contractType,
      startDate,
      endDate,
      services: previous.services,
      contractValue: Number(req.body.contractValue ?? previous.contractValue),
      billingFrequency: previous.billingFrequency,
      terms: previous.terms,
      status: 'Active',
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    const visits = [];
    let sequence = 0;
    for (const service of contract.services) {
      for (let index = 0; index < service.visits; index += 1) {
        const scheduledAt = new Date(startDate);
        scheduledAt.setMonth(
          scheduledAt.getMonth() + Math.floor((index * 12) / service.visits),
        );
        sequence += 1;
        visits.push({
          ...scope,
          visitNo:
            'VIS-' +
            new Date().getFullYear().toString().slice(-2) +
            '-' +
            String(Date.now()).slice(-5) +
            '-' +
            sequence,
          contractId: contract._id,
          customerId: contract.customerId,
          propertyId: contract.propertyId,
          serviceName: service.serviceName,
          scheduledAt,
          createdBy: req.auth.userId,
          updatedBy: req.auth.userId,
        });
      }
    }
    if (visits.length) await Visit.insertMany(visits);
    previous.status = 'Renewed';
    previous.updatedBy = req.auth.userId;
    await previous.save();
    await notifyCustomer(contract.customerId, {
      type: 'CONTRACT_RENEWED',
      title: 'Service contract renewed',
      message:
        contract.contractNo +
        ' is active until ' +
        new Date(contract.endDate).toLocaleDateString('en-IN'),
      link: '/contracts',
    });
    res.status(201).json({ contract, visitsCreated: visits.length });
  }),
);
export default router;
