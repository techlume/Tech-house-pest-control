import { Router } from 'express';
import { z } from 'zod';
import { authenticate, allowRoles } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import { integrations } from '../config/integrations.js';
import { IntegrationEvent } from '../models/IntegrationEvent.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { sendEmail } from '../services/emailService.js';
import { emailTemplates } from '../services/emailTemplates.js';

const r = Router();
r.use(authenticate, allowRoles(ROLES.OWNER, ROLES.ADMIN));

r.get('/status', (_req, res) =>
  res.json({
    integrations: Object.fromEntries(
      Object.entries(integrations).map(([key, value]) => [
        key,
        { enabled: value.enabled, provider: value.provider, configured: value.enabled && Boolean(value.apiKey || value.host || value.keyId || value.clientId) },
      ]),
    ),
  }),
);

r.get(
  '/events',
  asyncHandler(async (req, res) =>
    res.json({ items: await IntegrationEvent.find({ companyId: req.auth.companyId }).select('-payload -response').sort({ createdAt: -1 }).limit(100) }),
  ),
);

r.post(
  '/test-email',
  allowRoles(ROLES.OWNER),
  validate(
    z.object({
      body: z.object({ to: z.email().optional() }),
      params: z.object({}),
      query: z.object({}),
    }),
  ),
  asyncHandler(async (req, res) => {
    const owner = await User.findById(req.auth.userId).select('name email');
    const company = await Company.findById(req.auth.companyId).select('name legalName');
    const recipient = req.validated.body.to || owner.email;
    const template = emailTemplates.test({ companyName: company?.legalName || company?.name, recipientName: recipient, senderName: owner.name });
    await sendEmail({ to: recipient, subject: 'Tech House Pest Control SMTP test', text: template.text, html: template.html });
    res.json({ message: 'Test email sent', to: recipient });
  }),
);

export default r;
