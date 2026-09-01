import { Router } from 'express';
import { JobCard } from '../models/JobCard.js';
import { Visit } from '../models/Visit.js';
import { authenticate, branchScope, allowRoles, customerDataScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextReference } from '../services/sequenceService.js';
import { pagination } from '../utils/scope.js';
import { AppError } from '../utils/AppError.js';
import { audit } from '../services/auditService.js';
import { consumeJobChemicals } from '../services/inventoryConsumptionService.js';
import { TechnicianLocation } from '../models/TechnicianLocation.js';
import { Customer } from '../models/Customer.js';
import { Company } from '../models/Company.js';
import { sendDocumentEmail } from '../services/documentEmailService.js';
import {
  persistJobMedia,
  removeStoredFiles,
} from '../services/fileStorageService.js';
const router = Router();
router.use(authenticate);
const fieldRoles = allowRoles(
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.DISPATCHER,
  ROLES.TECHNICIAN,
);
const findVisit = async (req) => {
  const visit = await Visit.findOne({
    ...branchScope(req),
    _id: req.params.visitId,
  });
  if (!visit) throw new AppError(404, 'Visit not found');
  if (
    req.auth.role === ROLES.TECHNICIAN &&
    String(visit.technicianId) !== String(req.auth.userId)
  )
    throw new AppError(403, 'This visit is not assigned to you');
  return visit;
};
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = pagination(req.query);
    const filter = {
      ...branchScope(req, req.query.branchId),
      ...customerDataScope(req),
    };
    if (req.auth.role === ROLES.TECHNICIAN)
      filter.technicianId = req.auth.userId;
    const [items, total] = await Promise.all([
      JobCard.find(filter)
        .populate('customerId', 'name')
        .populate('technicianId', 'name')
        .populate('visitId', 'visitNo serviceName scheduledAt')
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limit),
      JobCard.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  }),
);
router.post(
  '/visits/:visitId/en-route',
  fieldRoles,
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    if (!['Assigned', 'Scheduled'].includes(visit.status))
      throw new AppError(409, 'Only an assigned or scheduled visit can begin travel');
    visit.status = 'En Route';
    visit.updatedBy = req.auth.userId;
    await visit.save();
    await audit(req, 'VISIT_EN_ROUTE', 'Visit', visit._id);
    res.json({ visit });
  }),
);
router.post(
  '/visits/:visitId/en-route',
  fieldRoles,
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    if (!['Assigned', 'Scheduled'].includes(visit.status))
      throw new AppError(409, 'Only an assigned or scheduled visit can begin travel');
    visit.status = 'En Route';
    visit.updatedBy = req.auth.userId;
    await visit.save();
    await audit(req, 'VISIT_EN_ROUTE', 'Visit', visit._id);
    res.json({ visit });
  }),
);
router.post(
  '/visits/:visitId/check-in',
  fieldRoles,
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    if (!['Assigned', 'Scheduled', 'En Route'].includes(visit.status))
      throw new AppError(409, 'Visit cannot be checked in');
    visit.status = 'Checked In';
    visit.checkInAt = new Date();
    visit.checkInGps = req.body.gps;
    visit.updatedBy = req.auth.userId;
    await visit.save();
    await audit(req, 'VISIT_CHECKED_IN', 'Visit', visit._id, {
      gps: req.body.gps,
    });
    res.json({ visit });
  }),
);
router.post(
  '/visits/:visitId/start',
  fieldRoles,
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    if (visit.status !== 'Checked In')
      throw new AppError(409, 'Check in before starting work');
    visit.status = 'In Progress';
    visit.workStartedAt = new Date();
    visit.updatedBy = req.auth.userId;
    await visit.save();
    res.json({ visit });
  }),
);
router.post(
  '/visits/:visitId/location',
  fieldRoles,
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    if (visit.status !== 'In Progress')
      throw new AppError(
        409,
        'Location tracking is allowed only during an active job',
      );
    const { latitude, longitude, accuracy } = req.body;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
      throw new AppError(400, 'Valid GPS coordinates are required');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const location = await TechnicianLocation.create({
      companyId: visit.companyId,
      branchId: visit.branchId,
      visitId: visit._id,
      technicianId: visit.technicianId || req.auth.userId,
      latitude,
      longitude,
      accuracy,
      expiresAt,
    });
    res.status(201).json({ location });
  }),
);
router.get(
  '/visits/:visitId/locations',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.DISPATCHER, ROLES.TECHNICIAN),
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    const items = await TechnicianLocation.find({ visitId: visit._id })
      .sort({ recordedAt: -1 })
      .limit(500);
    res.json({ items });
  }),
);
router.post(
  '/visits/:visitId/complete',
  fieldRoles,
  asyncHandler(async (req, res) => {
    const visit = await findVisit(req);
    if (!['Checked In', 'In Progress'].includes(visit.status))
      throw new AppError(409, 'Visit must be checked in before completion');
    if (await JobCard.exists({ visitId: visit._id }))
      throw new AppError(409, 'Job card already completed');
    const scope = { companyId: visit.companyId, branchId: visit.branchId };
    const storedMedia = await persistJobMedia(req.body, {
      ...scope,
      customerId: visit.customerId,
      createdBy: req.auth.userId,
    });
    let job;
    try {
      await consumeJobChemicals({
        chemicals: storedMedia.body.chemicalsUsed,
        visit,
        actorId: req.auth.userId,
      });
      job = await JobCard.create({
      ...storedMedia.body,
      ...scope,
      jobCardNo: await nextReference(JobCard, scope, 'jobCardNo', 'JOB'),
      serviceReportNo: await nextReference(
        JobCard,
        scope,
        'serviceReportNo',
        'SR',
      ),
      visitId: visit._id,
      contractId: visit.contractId,
      customerId: visit.customerId,
      propertyId: visit.propertyId,
      technicianId: visit.technicianId || req.auth.userId,
      startedAt: visit.workStartedAt || visit.checkInAt,
      completedAt: new Date(),
      gps: { checkIn: visit.checkInGps, checkOut: req.body.gps?.checkOut },
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
      });
    } catch (error) {
      await removeStoredFiles(storedMedia.files);
      throw error;
    }
    visit.status = 'Completed';
    visit.checkOutAt = job.completedAt;
    visit.checkOutGps = req.body.gps?.checkOut;
    visit.updatedBy = req.auth.userId;
    await visit.save();
    await audit(req, 'JOB_CARD_COMPLETED', 'JobCard', job._id, {
      visitId: visit.id,
    });
    const [customer, company] = await Promise.all([
      Customer.findById(visit.customerId).select('name email').lean(),
      Company.findById(req.auth.companyId).select('name legalName').lean(),
    ]);
    const companyName = company?.legalName || company?.name || 'Tech House Pest Control';
    await sendDocumentEmail({
      companyId: visit.companyId,
      branchId: visit.branchId,
      createdBy: req.auth.userId,
      to: customer?.email,
      eventType: 'JOB_REPORT_EMAIL',
      template: 'jobReport',
      subject: 'Service report ' + job.jobCardNo + ' from ' + companyName,
      templateData: {
        companyName,
        jobCardNo: job.jobCardNo,
        customerName: customer?.name || 'Customer',
      },
    });
    res.status(201).json({ jobCard: job, visit });
  }),
);
export default router;

