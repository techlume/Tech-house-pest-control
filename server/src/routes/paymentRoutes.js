import { Router } from 'express';
import { Invoice } from '../models/Invoice.js';
import { Receipt } from '../models/Receipt.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { authenticate, branchScope } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { nextReference } from '../services/sequenceService.js';
import {
  createRazorpayOrder,
  razorpayKeyId,
  verifyRazorpayPayment,
  verifyRazorpayWebhook,
} from '../services/razorpayService.js';

const router = Router();

async function finalizePayment({ payment, paymentId, verifiedBy }) {
  const invoice = await Invoice.findOne({ _id: payment.invoiceId, companyId: payment.companyId });
  if (!invoice) throw new AppError(404, 'Invoice not found');

  const existingReceipt = await Receipt.findOne({
    companyId: payment.companyId,
    referenceNo: paymentId,
  });

  if (existingReceipt) {
    if (payment.status !== 'Paid') {
      payment.razorpayPaymentId = paymentId;
      payment.status = 'Paid';
      payment.verifiedAt = payment.verifiedAt || new Date();
      await payment.save();
    }
    return { invoice, receipt: existingReceipt, alreadyVerified: true };
  }

  if (payment.status === 'Paid') {
    return { invoice, receipt: null, alreadyVerified: true };
  }

  if (payment.amount > invoice.dueAmount + 0.001) {
    throw new AppError(409, 'Invoice balance changed; payment requires review');
  }

  invoice.paidAmount += payment.amount;
  invoice.dueAmount -= payment.amount;
  if (Math.abs(invoice.dueAmount) < 0.001) invoice.dueAmount = 0;
  invoice.status = invoice.dueAmount === 0 ? 'Paid' : 'Partially Paid';
  await invoice.save();

  const scope = { companyId: invoice.companyId, branchId: invoice.branchId };
  const receipt = await Receipt.create({
    ...scope,
    receiptNo: await nextReference(Receipt, scope, 'receiptNo', 'REC'),
    customerId: invoice.customerId,
    amount: payment.amount,
    method: 'Gateway',
    referenceNo: paymentId,
    allocations: [{ invoiceId: invoice._id, amount: payment.amount }],
    createdBy: verifiedBy || payment.createdBy,
  });

  payment.razorpayPaymentId = paymentId;
  payment.status = 'Paid';
  payment.verifiedAt = new Date();
  await payment.save();

  return { invoice, receipt, alreadyVerified: false };
}

router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    if (!verifyRazorpayWebhook({ body: req.rawBody || JSON.stringify(req.body || {}), signature: req.header('x-razorpay-signature') })) {
      throw new AppError(400, 'Webhook signature could not be verified', 'INVALID_WEBHOOK_SIGNATURE');
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity || {};
    const orderEntity = req.body?.payload?.order?.entity || {};
    const orderId = paymentEntity.order_id || orderEntity.id;
    const paymentId = paymentEntity.id;

    if (!orderId) throw new AppError(400, 'Webhook payload is missing order details', 'INVALID_WEBHOOK_PAYLOAD');

    const payment = await PaymentTransaction.findOne({ razorpayOrderId: orderId });
    if (!payment) return res.json({ success: true, ignored: true });

    if (event === 'payment.failed') {
      if (payment.status !== 'Paid') {
        payment.status = 'Failed';
        await payment.save();
      }
      return res.json({ success: true, status: payment.status });
    }

    if (event !== 'payment.captured' && event !== 'payment.authorized') {
      return res.json({ success: true, ignored: true });
    }

    if (!paymentId) throw new AppError(400, 'Webhook payload is missing payment details', 'INVALID_WEBHOOK_PAYLOAD');

    const result = await finalizePayment({ payment, paymentId, verifiedBy: payment.createdBy });
    return res.json({ success: true, alreadyVerified: result.alreadyVerified, receipt: result.receipt });
  }),
);

router.use(authenticate);

const findInvoice = async (req, invoiceId) => {
  const invoice = await Invoice.findOne({ ...branchScope(req), _id: invoiceId });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  if (req.auth.role === ROLES.CUSTOMER && String(invoice.customerId) !== String(req.auth.customerId)) {
    throw new AppError(403, 'You can only pay your own invoices');
  }
  return invoice;
};

router.post(
  '/invoices/:id/order',
  asyncHandler(async (req, res) => {
    const invoice = await findInvoice(req, req.params.id);
    if (!(invoice.dueAmount > 0)) throw new AppError(409, 'This invoice is already paid');

    const gatewayOrder = await createRazorpayOrder({
      amount: invoice.dueAmount,
      receipt: invoice.invoiceNo + '-' + Date.now(),
      notes: { invoiceNo: invoice.invoiceNo, invoiceId: String(invoice._id) },
    });

    const payment = await PaymentTransaction.create({
      companyId: invoice.companyId,
      branchId: invoice.branchId,
      invoiceId: invoice._id,
      customerId: invoice.customerId,
      razorpayOrderId: gatewayOrder.id,
      amount: invoice.dueAmount,
      createdBy: req.auth.userId,
    });

    res.status(201).json({
      orderId: payment.razorpayOrderId,
      amount: Math.round(payment.amount * 100),
      currency: 'INR',
      keyId: razorpayKeyId(),
      invoiceNo: invoice.invoiceNo,
    });
  }),
);

router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const payment = await PaymentTransaction.findOne({
      razorpayOrderId: req.body.razorpay_order_id,
      companyId: req.auth.companyId,
    });
    if (!payment) throw new AppError(404, 'Payment order not found');
    if (req.auth.role === ROLES.CUSTOMER && String(payment.customerId) !== String(req.auth.customerId)) {
      throw new AppError(403, 'You can only verify your own payment');
    }
    if (!verifyRazorpayPayment({ orderId: payment.razorpayOrderId, paymentId: req.body.razorpay_payment_id, signature: req.body.razorpay_signature })) {
      throw new AppError(400, 'Payment signature could not be verified', 'INVALID_PAYMENT_SIGNATURE');
    }

    const result = await finalizePayment({ payment, paymentId: req.body.razorpay_payment_id, verifiedBy: req.auth.userId });
    if (result.receipt) return res.json({ success: true, receipt: result.receipt, alreadyVerified: result.alreadyVerified });

    const receipt = await Receipt.findOne({
      companyId: payment.companyId,
      referenceNo: req.body.razorpay_payment_id,
    });

    res.json({ success: true, receipt, alreadyVerified: true });
  }),
);

export default router;
