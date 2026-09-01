import test from 'node:test';
import assert from 'node:assert/strict';
import { invoiceReminderStage } from '../src/services/reminderService.js';

test('invoice reminder stages are limited to the scheduled follow-up windows', () => {
  const today = new Date('2026-08-30T12:00:00Z');
  assert.equal(invoiceReminderStage('2026-09-06T00:00:00Z', today), 'DUE_7');
  assert.equal(invoiceReminderStage('2026-09-02T00:00:00Z', today), 'DUE_3');
  assert.equal(invoiceReminderStage('2026-08-31T00:00:00Z', today), 'DUE_1');
  assert.equal(invoiceReminderStage('2026-08-30T00:00:00Z', today), 'DUE_TODAY');
  assert.equal(invoiceReminderStage('2026-08-29T00:00:00Z', today), null);
  assert.equal(invoiceReminderStage('2026-09-10T00:00:00Z', today), null);
});
