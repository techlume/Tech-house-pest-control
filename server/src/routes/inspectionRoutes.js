import { Router } from 'express';
import { Inspection } from '../models/Inspection.js';
import { Customer } from '../models/Customer.js';
import { JobCard } from '../models/JobCard.js';
import { authenticate, allowRoles, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination, writeBranch } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { assertTransition } from '../utils/workflow.js';
import { pick } from '../utils/pick.js';
import { User } from '../models/User.js';
import { persistJobMedia, removeStoredFiles } from '../services/fileStorageService.js';
const router = Router();
const managers = [ROLES.ADMIN];
const editors = [ROLES.ADMIN, ROLES.TECHNICIAN];
const transitions = {
  Added: ['Assigned', 'In process', 'Cancelled'],
  Assigned: ['Assigned', 'In process', 'Cancelled'],
  'In process': ['In process', 'Completed', 'Cancelled'],
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
  'siteAddress',
];
router.use(authenticate);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = { ...branchScope(req, req.query.branchId) };
    if (req.auth.role === ROLES.TECHNICIAN) filter.inspectorId = req.auth.userId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to)
      filter.scheduledAt = {
        ...(req.query.from ? { $gte: new Date(req.query.from) } : {}),
        ...(req.query.to ? { $lte: new Date(req.query.to) } : {}),
      };
    const [items, total] = await Promise.all([
      Inspection.find(filter)
        .populate('customerId', 'name customerNo phone email')
        .populate('inspectorId', 'name phone')
        .populate('branchId', 'name')
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
  allowRoles(...managers),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      ...branchScope(req),
    });
    if (!customer) throw new AppError(404, 'Customer not found');
    const branchId = writeBranch(req, customer.branchId);
    if (!req.body.siteAddress?.trim())
      throw new AppError(422, 'Enter the inspection site address');
    const scope = { companyId: req.auth.companyId, branchId };
    const inspection = await Inspection.create({
      ...req.body,
      ...scope,
      propertyId: req.body.propertyId || undefined,
      status: 'Added',
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
    if (
      req.body.inspectorId &&
      !req.body.status &&
      item.status === 'Added'
    )
      item.status = 'Assigned';
    Object.assign(item, pick(req.body, editableFields), {
      updatedBy: req.auth.userId,
    });
    if (req.body.status === 'Completed' && !item.completedAt)
      item.completedAt = new Date();
    await item.save();
    res.json({ inspection: item });
  }),
);
router.post(
  '/:id/complete',
  allowRoles(ROLES.ADMIN, ROLES.TECHNICIAN),
  asyncHandler(async (req, res) => {
    const item = await Inspection.findOne({
      ...branchScope(req),
      _id: req.params.id,
    });
    if (!item) throw new AppError(404, 'Inspection not found');
    if (
      req.auth.role === ROLES.TECHNICIAN &&
      String(item.inspectorId) !== String(req.auth.userId)
    )
      throw new AppError(403, 'This inspection is not assigned to you');
    if (!['Assigned', 'In process'].includes(item.status))
      throw new AppError(409, 'Only an assigned or in-process inspection can be completed');
    if (await JobCard.exists({ inspectionId: item._id }))
      throw new AppError(409, 'A job card already exists for this inspection');
    const findings = Array.isArray(req.body.findings) ? req.body.findings : [];
    if (!findings.length && !item.findings.length)
      throw new AppError(422, 'At least one finding is required to complete an inspection');
    if (!req.body.treatmentPerformed?.trim())
      throw new AppError(422, 'Describe the treatment performed');
    if (!Array.isArray(req.body.evidence) || !req.body.evidence.length)
      throw new AppError(422, 'Add at least one before/after photo');
    const scope = { companyId: item.companyId, branchId: item.branchId };
    const storedMedia = await persistJobMedia(req.body, {
      ...scope,
      customerId: item.customerId,
      createdBy: req.auth.userId,
    });
    let job;
    try {
      job = await JobCard.create({
        ...scope,
        jobCardNo: await nextReference(JobCard, scope, 'jobCardNo', 'JOB'),
        serviceReportNo: await nextReference(JobCard, scope, 'serviceReportNo', 'SR'),
        inspectionId: item._id,
        customerId: item.customerId,
        propertyId: item.propertyId,
        technicianId: item.inspectorId || req.auth.userId,
        pestFindings: findings.map((f) => ({
          area: f.area,
          pestType: f.pestType,
          severity: f.severity,
          observation: f.observation,
        })),
        treatmentPerformed: storedMedia.body.treatmentPerformed,
        evidence: storedMedia.body.evidence,
        recommendations: storedMedia.body.recommendations,
        completedAt: new Date(),
        createdBy: req.auth.userId,
        updatedBy: req.auth.userId,
      });
    } catch (error) {
      await removeStoredFiles(storedMedia.files);
      throw error;
    }
    if (findings.length) item.findings = findings;
    if (Array.isArray(req.body.recommendedServices) && req.body.recommendedServices.length)
      item.recommendedServices = req.body.recommendedServices;
    item.beforeImages = storedMedia.body.evidence
      .filter((e) => e.type === 'Before Photo')
      .map((e) => e.url);
    item.afterImages = storedMedia.body.evidence
      .filter((e) => e.type === 'After Photo')
      .map((e) => e.url);
    item.completionNotes = req.body.recommendations || req.body.treatmentPerformed || '';
    item.jobCardId = job._id;
    item.status = 'Completed';
    item.completedAt = job.completedAt;
    item.updatedBy = req.auth.userId;
    await item.save();
    res.status(201).json({ jobCard: job, inspection: item });
  }),
);
router.delete(
  '/:id',
  allowRoles(...managers),
  asyncHandler(async (req, res) => {
    const item = await Inspection.findOne({ ...branchScope(req), _id: req.params.id });
    if (!item) throw new AppError(404, 'Inspection not found');
    if (item.status === 'Completed')
      throw new AppError(409, 'Completed inspections cannot be deleted');
    await item.deleteOne();
    res.status(204).end();
  }),
);
export default router;
