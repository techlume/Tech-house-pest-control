import { Router } from 'express';
import { Invoice } from '../models/Invoice.js';
import { Receipt } from '../models/Receipt.js';
import { Customer } from '../models/Customer.js';
import { Branch } from '../models/Branch.js';
import { Company } from '../models/Company.js';
import {
  authenticate,
  allowRoles,
  branchScope,
  customerDataScope,
} from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeBranch } from '../utils/scope.js';
import { nextReference } from '../services/sequenceService.js';
import { AppError } from '../utils/AppError.js';
import { allocateReceipt, calculateInvoice } from '../utils/billing.js';
import { notifyCustomer } from '../services/notificationService.js';
import { sendDocumentEmail } from '../services/documentEmailService.js';

const r = Router();
r.use(authenticate);
r.get(
  '/invoices',
  asyncHandler(async (req, res) =>
    res.json({
      items: await Invoice.find({
        ...branchScope(req, req.query.branchId),
        ...customerDataScope(req),
      })
        .populate('customerId', 'name customerNo gstin billingAddress phone email')
        .populate('branchId', 'name code gstin address phone email')
        .populate('companyId', 'name legalName gstin email phone')
        .sort({ issueDate: -1 }),
    }),
  ),
);
r.post(
  '/invoices',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId),
      scope = { companyId: req.auth.companyId, branchId };
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      ...scope,
    });
    if (!customer) throw new AppError(422, 'Select a valid customer');
    const branch = await Branch.findOne({ _id: branchId, companyId: req.auth.companyId });
    if (!branch) throw new AppError(422, 'Select a valid branch');
    const dueDate = new Date(req.body.dueDate);
    if (Number.isNaN(dueDate.getTime()))
      throw new AppError(422, 'A valid due date is required');
    const { lines, subtotal, taxTotal, grandTotal } = calculateInvoice(
      req.body.lines,
      req.body.gstTreatment,
    );
    const stateCode = String(req.body.placeOfSupply?.stateCode || '').padStart(2, '0');
    const state = String(
      req.body.placeOfSupply?.state || customer.billingAddress?.state || branch.address?.state || '',
    ).trim();
    if (req.body.gstTreatment === 'GST' && (!state || !stateCode))
      throw new AppError(422, 'Place of supply and state code are required for a GST invoice');
    const sellerStateCode = String(branch.gstin || '').slice(0, 2);
    const taxType =
      req.body.gstTreatment === 'GST'
        ? stateCode === sellerStateCode
          ? 'CGST+SGST'
          : 'IGST'
        : 'Exempt';
    const invoice = await Invoice.create({
      ...req.body,
      ...scope,
      placeOfSupply: { state, stateCode },
      reverseCharge: Boolean(req.body.reverseCharge),
      taxType,
      lines,
      subtotal,
      taxTotal,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      status: 'Issued',
      invoiceNo: await nextReference(Invoice, scope, 'invoiceNo', 'INV'),
      createdBy: req.auth.userId,
      updatedBy: req.auth.userId,
    });
    const company = await Company.findById(req.auth.companyId).select('name legalName').lean();
    const companyName = company?.legalName || company?.name || 'Tech House Pest Control';
    await notifyCustomer(invoice.customerId, {
      type: 'INVOICE_ISSUED',
      title: 'New invoice issued',
      message: invoice.invoiceNo + ' - Rs. ' + invoice.grandTotal.toLocaleString('en-IN'),
      link: '/billing',
    });
    await sendDocumentEmail({
      companyId: invoice.companyId,
      branchId: invoice.branchId,
      createdBy: req.auth.userId,
      to: customer.email,
      eventType: 'INVOICE_EMAIL',
      template: 'invoice',
      subject: 'Invoice ' + invoice.invoiceNo + ' from ' + companyName,
      templateData: {
        companyName,
        invoiceNo: invoice.invoiceNo,
        dueDate: invoice.dueDate,
        grandTotal: invoice.grandTotal,
        customerName: customer.name,
      },
    });
    res.status(201).json({ invoice });
  }),
);
r.post(
  '/receipts',
  allowRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.ACCOUNTANT),
  asyncHandler(async (req, res) => {
    const branchId = writeBranch(req, req.body.branchId),
      scope = { companyId: req.auth.companyId, branchId };
    const customer = await Customer.findOne({
      _id: req.body.customerId,
      ...scope,
    });
    if (!customer) throw new AppError(422, 'Select a valid customer');
    const invoices = await Invoice.find({
      ...scope,
      customerId: req.body.customerId,
      dueAmount: { $gt: 0 },
    }).sort({ dueDate: 1 });
    const { allocations, unallocatedAmount } = allocateReceipt(
      req.body.amount,
      invoices,
    );
    const allocationByInvoice = new Map(
      allocations.map((allocation) => [
        String(allocation.invoiceId),
        allocation.amount,
      ]),
    );
    for (const inv of invoices) {
      const amount = allocationByInvoice.get(String(inv._id));
      if (!amount) continue;
      inv.paidAmount += amount;
      inv.dueAmount -= amount;
      if (Math.abs(inv.dueAmount) < 0.001) inv.dueAmount = 0;
      inv.status = inv.dueAmount === 0 ? 'Paid' : 'Partially Paid';
      await inv.save();
    }
    const receipt = await Receipt.create({
      ...req.body,
      ...scope,
      allocations,
      receiptNo: await nextReference(Receipt, scope, 'receiptNo', 'REC'),
      createdBy: req.auth.userId,
    });
    res.status(201).json({ receipt, unallocatedAmount });
  }),
);
r.get(
  '/receipts',
  asyncHandler(async (req, res) =>
    res.json({
      items: await Receipt.find({
        ...branchScope(req, req.query.branchId),
        ...customerDataScope(req),
      })
        .populate('customerId', 'name')
        .populate('allocations.invoiceId', 'invoiceNo issueDate grandTotal')
        .sort({ receivedAt: -1 }),
    }),
  ),
);
export default r;
