import { Router } from 'express';
import { Lead } from '../models/Lead.js';
import { Customer } from '../models/Customer.js';
import { Quotation } from '../models/Quotation.js';
import { Contract } from '../models/Contract.js';
import { Visit } from '../models/Visit.js';
import { Invoice } from '../models/Invoice.js';
import { Complaint } from '../models/Complaint.js';
import { Product } from '../models/Product.js';
import { JobCard } from '../models/JobCard.js';
import { Company } from '../models/Company.js';
import { authenticate, allowRoles, branchScope, customerDataScope } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { sendDocumentEmail } from '../services/documentEmailService.js';
import { ROLES } from '../constants/roles.js';

const r = Router();
r.use(authenticate);

r.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const scope = branchScope(req, req.query.branchId),
      customerScope = customerDataScope(req),
      isCustomer = req.auth.role === 'CUSTOMER',
      today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [
      leads,
      customers,
      quotes,
      contracts,
      todayVisits,
      completedVisits,
      invoices,
      complaints,
      products,
    ] = await Promise.all([
      isCustomer ? Promise.resolve([]) : Lead.find(scope).lean(),
      Customer.countDocuments({
        ...scope,
        ...(isCustomer ? { _id: req.auth.customerId } : {}),
        active: true,
      }),
      Quotation.find({ ...scope, ...customerScope }).lean(),
      Contract.countDocuments({ ...scope, ...customerScope, status: 'Active' }),
      Visit.countDocuments({
        ...scope,
        ...customerScope,
        scheduledAt: { $gte: today, $lt: tomorrow },
      }),
      Visit.countDocuments({ ...scope, ...customerScope, status: 'Completed' }),
      Invoice.find({ ...scope, ...customerScope }).lean(),
      Complaint.find({
        ...scope,
        ...customerScope,
        status: { $nin: ['Closed', 'Cancelled'] },
      }).lean(),
      isCustomer ? Promise.resolve([]) : Product.find({ ...scope, active: true }).lean(),
    ]);
    const won = leads.filter((x) => x.status === 'Won').length,
      conversionRate = leads.length ? (won / leads.length) * 100 : 0,
      quoteValue = quotes.reduce((n, x) => n + (x.grandTotal || 0), 0),
      billed = invoices.reduce((n, x) => n + (x.grandTotal || 0), 0),
      outstanding = invoices.reduce((n, x) => n + (x.dueAmount || 0), 0),
      overdue = invoices
        .filter((x) => x.dueAmount > 0 && new Date(x.dueDate) < new Date())
        .reduce((n, x) => n + x.dueAmount, 0),
      lowStock = products.filter(
        (p) => p.batches.reduce((n, b) => n + b.quantity, 0) <= p.reorderLevel,
      ).length,
      overdueComplaints = complaints.filter(
        (x) => new Date(x.slaDueAt) < new Date(),
      ).length;
    res.json({
      sales: {
        leads: leads.length,
        won,
        conversionRate,
        quotations: quotes.length,
        quoteValue,
      },
      operations: {
        customers,
        activeContracts: contracts,
        todayVisits,
        completedVisits,
      },
      finance: { billed, outstanding, overdue },
      quality: { openComplaints: complaints.length, overdueComplaints },
      inventory: { products: products.length, lowStock },
    });
  }),
);

r.get(
  '/reminders',
  asyncHandler(async (req, res) => {
    const scope = branchScope(req, req.query.branchId);
    const customerScope = customerDataScope(req);
    const isCustomer = req.auth.role === 'CUSTOMER';
    const now = new Date();
    const next7 = new Date(now);
    next7.setDate(next7.getDate() + 7);
    const next60 = new Date(now);
    next60.setDate(next60.getDate() + 60);
    const [followUps, contracts, visits, invoices, complaints, products] =
      await Promise.all([
        isCustomer
          ? []
          : Lead.find({
              ...scope,
              status: { $nin: ['Won', 'Lost'] },
              nextFollowUpAt: { $lte: next7 },
            })
              .select('leadNo name nextFollowUpAt priority')
              .sort({ nextFollowUpAt: 1 })
              .limit(20)
              .lean(),
        Contract.find({
          ...scope,
          ...customerScope,
          status: 'Active',
          endDate: { $lte: next60 },
        })
          .populate('customerId', 'name')
          .sort({ endDate: 1 })
          .limit(20)
          .lean(),
        Visit.find({
          ...scope,
          ...customerScope,
          status: { $in: ['Scheduled', 'Assigned', 'En Route'] },
          scheduledAt: { $gte: now, $lte: next7 },
        })
          .populate('customerId', 'name')
          .sort({ scheduledAt: 1 })
          .limit(20)
          .lean(),
        Invoice.find({
          ...scope,
          ...customerScope,
          dueAmount: { $gt: 0 },
          dueDate: { $lte: next7 },
        })
          .populate('customerId', 'name')
          .sort({ dueDate: 1 })
          .limit(20)
          .lean(),
        Complaint.find({
          ...scope,
          ...customerScope,
          status: { $nin: ['Closed', 'Cancelled'] },
          slaDueAt: { $lte: next7 },
        })
          .populate('customerId', 'name')
          .sort({ slaDueAt: 1 })
          .limit(20)
          .lean(),
        isCustomer ? [] : Product.find({ ...scope, active: true }).lean(),
      ]);
    const lowStock = products
      .map((product) => ({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity: product.batches.reduce((sum, batch) => sum + batch.quantity, 0),
        reorderLevel: product.reorderLevel,
      }))
      .filter((product) => product.quantity <= product.reorderLevel);
    res.json({ followUps, contracts, visits, invoices, complaints, lowStock });
  }),
);

r.post(
  '/reminders/invoices/:id/send',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT),
  asyncHandler(async (req, res) => {
    const invoice = await Invoice.findOne({
      ...branchScope(req),
      _id: req.params.id,
      dueAmount: { $gt: 0 },
    }).populate('customerId', 'name email');
    if (!invoice) throw new AppError(404, 'Invoice not found');
    if (!invoice.customerId?.email) throw new AppError(422, 'Customer email is missing');
    const company = await Company.findById(req.auth.companyId).select('name legalName').lean();
    const companyName = company?.legalName || company?.name || 'Tech House Pest Control';
    await sendDocumentEmail({
      companyId: invoice.companyId,
      branchId: invoice.branchId,
      createdBy: req.auth.userId,
      to: invoice.customerId.email,
      eventType: 'REMINDER_EMAIL',
      template: 'reminder',
      subject: 'Payment reminder for ' + invoice.invoiceNo,
      templateData: {
        companyName,
        subject: 'Payment reminder for ' + invoice.invoiceNo,
        message:
          'Hello ' +
          invoice.customerId.name +
          ', your invoice ' +
          invoice.invoiceNo +
          ' has an outstanding balance of Rs. ' +
          Number(invoice.dueAmount).toLocaleString('en-IN') +
          '.',
        actionText: 'Open billing',
        actionUrl: '/billing',
      },
    });
    res.json({ message: 'Reminder sent', invoiceNo: invoice.invoiceNo });
  }),
);

r.get(
  '/details',
  asyncHandler(async (req, res) => {
    const scope = branchScope(req, req.query.branchId);
    const customerScope = customerDataScope(req);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from
      ? new Date(req.query.from)
      : new Date(to.getFullYear(), to.getMonth(), 1);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to)
      throw new AppError(400, 'Invalid report date range');
    to.setHours(23, 59, 59, 999);
    const [invoices, visits, jobs, leads] = await Promise.all([
      Invoice.find({
        ...scope,
        ...customerScope,
        issueDate: { $gte: from, $lte: to },
      })
        .populate('customerId', 'name customerNo')
        .sort({ issueDate: -1 })
        .lean(),
      Visit.find({
        ...scope,
        ...customerScope,
        scheduledAt: { $gte: from, $lte: to },
      })
        .populate('customerId', 'name')
        .populate('technicianId', 'name')
        .sort({ scheduledAt: -1 })
        .lean(),
      JobCard.find({
        ...scope,
        ...customerScope,
        completedAt: { $gte: from, $lte: to },
      })
        .populate('technicianId', 'name')
        .lean(),
      req.auth.role === 'CUSTOMER'
        ? []
        : Lead.find({
            ...scope,
            createdAt: { $gte: from, $lte: to },
          }).lean(),
    ]);
    const technicianMap = new Map();
    for (const job of jobs) {
      const key = String(job.technicianId?._id || 'unassigned');
      const row = technicianMap.get(key) || {
        technician: job.technicianId?.name || 'Unassigned',
        completedJobs: 0,
        chemicalsUsed: 0,
      };
      row.completedJobs += 1;
      row.chemicalsUsed += Array.isArray(job.chemicalsUsed)
        ? job.chemicalsUsed.reduce(
            (sum, chemical) => sum + Number(chemical.quantity || 0),
            0,
          )
        : 0;
      technicianMap.set(key, row);
    }
    const summary = {
      billed: invoices.reduce(
        (sum, invoice) => sum + Number(invoice.grandTotal || 0),
        0,
      ),
      collected: invoices.reduce(
        (sum, invoice) => sum + Number(invoice.paidAmount || 0),
        0,
      ),
      outstanding: invoices.reduce(
        (sum, invoice) => sum + Number(invoice.dueAmount || 0),
        0,
      ),
      gstTax: invoices
        .filter((invoice) => invoice.gstTreatment === 'GST')
        .reduce((sum, invoice) => sum + Number(invoice.taxTotal || 0), 0),
      visits: visits.length,
      completedJobs: jobs.length,
      leads: leads.length,
    };
    const technicians = [...technicianMap.values()].sort(
      (a, b) =>
        b.completedJobs - a.completedJobs ||
        a.technician.localeCompare(b.technician),
    );
    res.json({
      summary,
      technicians,
      invoices,
      visits,
      jobs,
      leads,
    });
  }),
);

export default r;
