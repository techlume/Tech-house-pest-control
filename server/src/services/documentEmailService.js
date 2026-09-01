import { sendEmail } from './emailService.js';
import { emailTemplates } from './emailTemplates.js';
import { IntegrationEvent } from '../models/IntegrationEvent.js';
import { integrations } from '../config/integrations.js';

export async function sendDocumentEmail({
  companyId,
  branchId,
  createdBy,
  to,
  eventType,
  template,
  subject,
  templateData,
}) {
  if (!to) {
    return { skipped: true };
  }
  const rendered = emailTemplates[template](templateData);
  const event = await IntegrationEvent.create({
    companyId,
    branchId,
    provider: integrations.email.provider,
    channel: 'EMAIL',
    eventType,
    status: 'QUEUED',
    recipient: to,
    payload: { subject, template, templateData },
    createdBy,
  });
  try {
    const response = await sendEmail({
      to,
      subject,
      text: rendered.text,
      html: rendered.html,
    });
    event.status = 'SENT';
    event.externalId = response?.messageId || undefined;
    event.response = { messageId: response?.messageId };
    await event.save();
    return { sent: true };
  } catch (error) {
    event.status = 'FAILED';
    event.lastError = error.message;
    await event.save();
    return { sent: false, error };
  }
}
