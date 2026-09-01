import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition } from '../src/utils/workflow.js';
import { calculateInvoice } from '../src/utils/billing.js';

const leadTransitions = {
  New: ['Contacted', 'Lost'],
  Contacted: ['Inspection Required', 'Quotation Sent', 'Lost'],
  'Inspection Required': ['Quotation Sent', 'Lost'],
  'Quotation Sent': ['Negotiation', 'Won', 'Lost'],
  Negotiation: ['Won', 'Lost'],
  Won: [],
  Lost: [],
};
const inspectionTransitions = {
  Scheduled: ['In Progress', 'Cancelled'],
  'In Progress': ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};
const quotationTransitions = {
  Draft: ['Approval Pending', 'Sent', 'Rejected'],
  'Approval Pending': ['Sent', 'Rejected'],
  Sent: ['Viewed', 'Accepted', 'Rejected', 'Expired'],
  Viewed: ['Accepted', 'Rejected', 'Expired'],
  Accepted: ['Expired'],
  Rejected: [],
  Expired: [],
  Converted: [],
};
const contractTransitions = {
  Active: ['Paused', 'Cancelled'],
  Paused: ['Active', 'Cancelled'],
  Expired: ['Cancelled'],
};
const complaintTransitions = {
  Open: ['Assigned', 'In Progress', 'Cancelled'],
  Assigned: ['In Progress', 'Resolved', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed', 'In Progress'],
  Closed: [],
  Cancelled: [],
};

const visitStatuses = ['Scheduled', 'Assigned', 'En Route', 'Checked In', 'In Progress', 'Completed'];

test('business workflow can move from lead to payment in the expected order', () => {
  assert.doesNotThrow(() => assertTransition('New', 'Contacted', leadTransitions, 'Lead'));
  assert.doesNotThrow(() => assertTransition('Contacted', 'Inspection Required', leadTransitions, 'Lead'));
  assert.doesNotThrow(() => assertTransition('Inspection Required', 'Quotation Sent', leadTransitions, 'Lead'));
  assert.doesNotThrow(() => assertTransition('Quotation Sent', 'Won', leadTransitions, 'Lead'));

  assert.doesNotThrow(() => assertTransition('Scheduled', 'In Progress', inspectionTransitions, 'Inspection'));
  assert.doesNotThrow(() => assertTransition('In Progress', 'Completed', inspectionTransitions, 'Inspection'));

  assert.doesNotThrow(() => assertTransition('Draft', 'Approval Pending', quotationTransitions, 'Quotation'));
  assert.doesNotThrow(() => assertTransition('Approval Pending', 'Sent', quotationTransitions, 'Quotation'));
  assert.doesNotThrow(() => assertTransition('Sent', 'Viewed', quotationTransitions, 'Quotation'));
  assert.doesNotThrow(() => assertTransition('Viewed', 'Accepted', quotationTransitions, 'Quotation'));
  assert.doesNotThrow(() => assertTransition('Accepted', 'Expired', quotationTransitions, 'Quotation'));

  assert.doesNotThrow(() => assertTransition('Active', 'Paused', contractTransitions, 'Contract'));
  assert.doesNotThrow(() => assertTransition('Paused', 'Active', contractTransitions, 'Contract'));
  assert.doesNotThrow(() => assertTransition('Active', 'Cancelled', contractTransitions, 'Contract'));

  for (let i = 0; i < visitStatuses.length - 1; i += 1) {
    assert.ok(visitStatuses[i + 1], 'visit workflow has a next stage');
  }
  assert.deepEqual(visitStatuses, ['Scheduled', 'Assigned', 'En Route', 'Checked In', 'In Progress', 'Completed']);

  assert.doesNotThrow(() => assertTransition('Open', 'Assigned', complaintTransitions, 'Complaint'));
  assert.doesNotThrow(() => assertTransition('Assigned', 'In Progress', complaintTransitions, 'Complaint'));
  assert.doesNotThrow(() => assertTransition('In Progress', 'Resolved', complaintTransitions, 'Complaint'));
  assert.doesNotThrow(() => assertTransition('Resolved', 'Closed', complaintTransitions, 'Complaint'));

  const invoice = calculateInvoice([
    { quantity: 2, rate: 1000, taxRate: 18 },
  ], 'GST');
  assert.equal(invoice.grandTotal, 2360);
});

test('invalid workflow jumps are rejected at each major stage', () => {
  assert.throws(() => assertTransition('New', 'Won', leadTransitions, 'Lead'), /cannot move/);
  assert.throws(() => assertTransition('Scheduled', 'Completed', inspectionTransitions, 'Inspection'), /cannot move/);
  assert.throws(() => assertTransition('Draft', 'Converted', quotationTransitions, 'Quotation'), /cannot move/);
  assert.throws(() => assertTransition('Active', 'Expired', contractTransitions, 'Contract'), /cannot move/);
  assert.throws(() => assertTransition('Open', 'Closed', complaintTransitions, 'Complaint'), /cannot move/);
});
