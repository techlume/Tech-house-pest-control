import { Invoice } from '../models/Invoice.js';
import { ReminderDispatch } from '../models/ReminderDispatch.js';
import { sendDocumentEmail } from './documentEmailService.js';

const DAY = 24 * 60 * 60 * 1000;
const STAGE_LABELS = {
  DUE_7: 'in 7 days',
  DUE_3: 'in 3 days',
  DUE_1: 'tomorrow',
  DUE_TODAY: 'today',
};

const companyNameFor = (company) => company?.legalName || company?.name || 'Tech House Pest Control';
const toId = (value) => String(value?._id || value || '');
const dayStart = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const dayDiff = (from, to) => Math.round((dayStart(to) - dayStart(from)) / DAY);

export function invoiceReminderStage(dueDate, referenceDate = new Date()) {
  const days = dayDiff(referenceDate, new Date(dueDate));
  if (days === 7) return 'DUE_7';
  if (days === 3) return 'DUE_3';
  if (days === 1) return 'DUE_1';
  if (days === 0) return 'DUE_TODAY';
  return null;
}

async function dispatchInvoiceReminder({ invoice, stage, createdBy }) {
  const companyId = toId(invoice.companyId);
  const branchId = toId(invoice.branchId);
  const recipient = invoice.customerId?.email;
  const reminderKey = [companyId, invoice._id, stage].join(':');

  if (!recipient) return { skipped: true, reason: 'missing_recipient' };
  if (await ReminderDispatch.exists({ reminderKey })) return { skipped: true, reason: 'already_sent' };

  const companyName = companyNameFor(invoice.companyId);
  const result = await sendDocumentEmail({
    companyId,
    branchId,
    createdBy,
    to: recipient,
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
        ' is ' +
        STAGE_LABELS[stage] +
        ' with an outstanding balance of Rs. ' +
        Number(invoice.dueAmount).toLocaleString('en-IN') +
        '.',
      actionText: 'Open billing',
      actionUrl: '/billing',
    },
  });

  if (result.sent) {
    await ReminderDispatch.create({
      companyId,
      branchId: branchId || undefined,
      reminderKey,
      entityType: 'Invoice',
      entityId: invoice._id,
      stage,
      recipient,
      status: 'SENT',
      createdBy,
    });
  }

  return result;
}

export async function runInvoiceReminderSweep({ companyId = null, createdBy = null } = {}) {
  const now = new Date();
  const next7 = new Date(now);
  next7.setDate(next7.getDate() + 7);

  const filter = {
    dueAmount: { $gt: 0 },
    dueDate: { $gte: now, $lte: next7 },
  };
  if (companyId) filter.companyId = companyId;

  const invoices = await Invoice.find(filter)
    .populate('customerId', 'name email')
    .populate('companyId', 'name legalName')
    .populate('branchId', 'name')
    .lean();

  const summary = { sent: 0, skipped: 0, total: invoices.length };
  for (const invoice of invoices) {
    const stage = invoiceReminderStage(invoice.dueDate, now);
    if (!stage) {
      summary.skipped += 1;
      continue;
    }
    const result = await dispatchInvoiceReminder({ invoice, stage, createdBy });
    if (result.sent) summary.sent += 1;
    else summary.skipped += 1;
  }
  return summary;
}

let reminderTimer = null;
export function startReminderScheduler({ companyId, intervalMinutes = 360 } = {}) {
  if (!companyId) {
    console.warn('Reminder scheduler is disabled because no companyId was provided.');
    return null;
  }
  if (reminderTimer) return reminderTimer;
  reminderTimer = setInterval(() => {
    runInvoiceReminderSweep({ companyId }).catch((error) => {
      console.error('Invoice reminder sweep failed', error);
    });
  }, Math.max(15, Number(intervalMinutes || 360)) * 60 * 1000);
  reminderTimer.unref?.();
  runInvoiceReminderSweep({ companyId }).catch((error) => {
    console.error('Invoice reminder sweep failed', error);
  });
  return reminderTimer;
}

export function stopReminderScheduler() {
  if (!reminderTimer) return;
  clearInterval(reminderTimer);
  reminderTimer = null;
}
