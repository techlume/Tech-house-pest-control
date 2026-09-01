import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.PAYMENT_ENABLED = 'true';
process.env.PAYMENT_PROVIDER = 'razorpay';
process.env.PAYMENT_KEY_ID = 'rzp_test_key';
process.env.PAYMENT_KEY_SECRET = 'secret_key_for_tests_1234567890';
process.env.PAYMENT_WEBHOOK_SECRET = 'webhook_secret_for_tests_1234567890';

const { verifyRazorpayPayment, verifyRazorpayWebhook } = await import(
  '../src/services/razorpayService.js'
);

test('razorpay checkout signature verification uses order and payment ids', () => {
  const signature = crypto
    .createHmac('sha256', process.env.PAYMENT_KEY_SECRET)
    .update('order_123|pay_456')
    .digest('hex');

  assert.equal(
    verifyRazorpayPayment({
      orderId: 'order_123',
      paymentId: 'pay_456',
      signature,
    }),
    true,
  );
  assert.equal(
    verifyRazorpayPayment({
      orderId: 'order_123',
      paymentId: 'pay_456',
      signature: 'bad-signature',
    }),
    false,
  );
});

test('razorpay webhook signature verification uses raw body', () => {
  const body = '{event:payment.captured,payload:{payment:{entity:{id:pay_456}}}}';
  const signature = crypto
    .createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  assert.equal(verifyRazorpayWebhook({ body, signature }), true);
  assert.equal(verifyRazorpayWebhook({ body, signature: 'bad-signature' }), false);
});
