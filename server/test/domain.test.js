import test from 'node:test';
import assert from 'node:assert/strict';
import { allowRoles, branchScope, customerDataScope } from '../src/middleware/auth.js';
import { calculateInvoice, allocateReceipt } from '../src/utils/billing.js';
import { stockAfterMovement } from '../src/utils/inventory.js';
import { assertStrongPassword } from '../src/utils/passwordPolicy.js';
import { pagination, writeBranch } from '../src/utils/scope.js';
import { assertTransition } from '../src/utils/workflow.js';

test('GST invoice calculation produces correct totals', () => {
  const result = calculateInvoice(
    [
      { description: 'Service', quantity: 2, rate: 1000, taxRate: 18 },
      { description: 'Material', quantity: 1, rate: 500, taxRate: 5 },
    ],
    'GST',
  );
  assert.equal(result.subtotal, 2500);
  assert.equal(result.taxTotal, 385);
  assert.equal(result.grandTotal, 2885);
  assert.deepEqual(result.lines.map((line) => line.total), [2360, 525]);
});

test('non-GST invoice ignores tax rates', () => {
  const result = calculateInvoice(
    [{ quantity: 2, rate: 1000, taxRate: 18 }],
    'NON_GST',
  );
  assert.equal(result.taxTotal, 0);
  assert.equal(result.grandTotal, 2000);
});

test('invoice rejects invalid quantity, rate and tax', () => {
  assert.throws(() => calculateInvoice([{ quantity: 0, rate: 1 }]), /quantity/);
  assert.throws(() => calculateInvoice([{ quantity: 1, rate: -1 }]), /negative/);
  assert.throws(
    () => calculateInvoice([{ quantity: 1, rate: 1, taxRate: 101 }], 'GST'),
    /between 0 and 100/,
  );
});

test('receipt allocation applies oldest invoices first', () => {
  const result = allocateReceipt(1200, [
    { _id: 'old', dueAmount: 1000 },
    { _id: 'new', dueAmount: 800 },
  ]);
  assert.deepEqual(result.allocations, [
    { invoiceId: 'old', amount: 1000 },
    { invoiceId: 'new', amount: 200 },
  ]);
  assert.equal(result.unallocatedAmount, 0);
  assert.throws(
    () => allocateReceipt(1801, [{ _id: 'one', dueAmount: 1800 }]),
    /cannot exceed/,
  );
});

test('stock movement adds, deducts and prevents negative stock', () => {
  assert.equal(stockAfterMovement(10, 4, 'PURCHASE').newQuantity, 14);
  assert.equal(stockAfterMovement(10, 4, 'CONSUMPTION').newQuantity, 6);
  assert.equal(stockAfterMovement(10, 4, 'TRANSFER_OUT').newQuantity, 6);
  assert.throws(() => stockAfterMovement(2, 3, 'ISSUE'), /Insufficient/);
  assert.throws(() => stockAfterMovement(2, 0, 'PURCHASE'), /greater than zero/);
});

test('role middleware permits only configured roles', () => {
  let passed = false;
  allowRoles('OWNER')({ auth: { role: 'OWNER' } }, {}, () => {
    passed = true;
  });
  assert.equal(passed, true);
  let error;
  allowRoles('OWNER')({ auth: { role: 'CUSTOMER' } }, {}, (value) => {
    error = value;
  });
  assert.equal(error.status, 403);
  assert.equal(error.code, 'FORBIDDEN');
});

test('branch and customer scopes isolate restricted users', () => {
  const staff = {
    auth: {
      companyId: 'company',
      branchId: 'branch-a',
      allBranches: false,
      role: 'TECHNICIAN',
    },
  };
  assert.deepEqual(branchScope(staff, 'branch-b'), {
    companyId: 'company',
    branchId: 'branch-a',
  });
  assert.equal(writeBranch(staff, 'branch-b'), 'branch-a');
  const owner = {
    auth: { companyId: 'company', allBranches: true, role: 'OWNER' },
  };
  assert.deepEqual(branchScope(owner, 'branch-b'), {
    companyId: 'company',
    branchId: 'branch-b',
  });
  assert.deepEqual(
    customerDataScope({ auth: { role: 'CUSTOMER', customerId: 'customer-a' } }),
    { customerId: 'customer-a' },
  );
});

test('workflow, password and pagination policies are enforced', () => {
  assert.doesNotThrow(() =>
    assertTransition('Active', 'Paused', { Active: ['Paused'] }, 'Contract'),
  );
  assert.throws(
    () => assertTransition('Cancelled', 'Active', { Cancelled: [] }, 'Contract'),
    /cannot move/,
  );
  assert.doesNotThrow(() => assertStrongPassword('Sathiya@123'));
  assert.throws(() => assertStrongPassword('password'), /uppercase/);
  assert.deepEqual(pagination({ page: '-2', limit: '500' }), {
    page: 1,
    limit: 100,
    skip: 0,
  });
});
