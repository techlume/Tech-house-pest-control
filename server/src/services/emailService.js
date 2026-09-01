import nodemailer from 'nodemailer';
import { integrations } from '../config/integrations.js';
import { AppError } from '../utils/AppError.js';
let transporter;
export async function sendEmail({ to, subject, text, html }) {
  const config = integrations.email;
  if (!config.enabled || !config.host || !config.user || !config.password)
    throw new AppError(
      503,
      'Email service is not configured yet',
      'EMAIL_NOT_CONFIGURED',
    );
  transporter ||= nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
  });
  return transporter.sendMail({
    from: config.from || config.user,
    to,
    subject,
    text,
    html,
  });
}
