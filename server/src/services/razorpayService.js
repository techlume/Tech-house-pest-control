import crypto from 'node:crypto';
import { integrations } from '../config/integrations.js';
import { AppError } from '../utils/AppError.js';

const authHeader = () =>
  'Basic ' +
  Buffer.from(
    integrations.payment.keyId + ':' + integrations.payment.keySecret,
  ).toString('base64');

const requireGateway = () => {
  if (
    !integrations.payment.enabled ||
    integrations.payment.provider !== 'razorpay' ||
    !integrations.payment.keyId ||
    !integrations.payment.keySecret
  ) {
    throw new AppError(503, 'Razorpay is not configured', 'PAYMENT_NOT_CONFIGURED');
  }
};

const requireWebhookSecret = () => {
  requireGateway();
  if (!integrations.payment.webhookSecret) {
    throw new AppError(503, 'Razorpay webhook is not configured', 'PAYMENT_WEBHOOK_NOT_CONFIGURED');
  }
};

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export async function createRazorpayOrder({ amount, receipt, notes }) {
  requireGateway();
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt, notes }),
  });
  if (!response.ok) throw new AppError(502, 'Razorpay could not create the payment order');
  return response.json();
}

export function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  requireGateway();
  const expected = crypto
    .createHmac('sha256', integrations.payment.keySecret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  return safeCompare(expected, signature);
}

export function verifyRazorpayWebhook({ body, signature }) {
  requireWebhookSecret();
  const expected = crypto
    .createHmac('sha256', integrations.payment.webhookSecret)
    .update(String(body || ''))
    .digest('hex');
  return safeCompare(expected, signature);
}

export const razorpayKeyId = () => {
  requireGateway();
  return integrations.payment.keyId;
};
