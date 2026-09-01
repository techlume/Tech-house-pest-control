import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  CLIENT_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  REMINDER_SCHEDULER_ENABLED: z.enum(['true', 'false']).default('false'),
  REMINDER_SCHEDULER_INTERVAL_MINUTES: z.coerce.number().positive().default(360),
  REMINDER_SCHEDULER_COMPANY_ID: z.string().trim().optional().default(''),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = {
  ...parsed.data,
  cookieSecure: parsed.data.COOKIE_SECURE === 'true',
  reminderSchedulerEnabled: parsed.data.REMINDER_SCHEDULER_ENABLED === 'true',
};
