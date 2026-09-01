import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { startReminderScheduler } from './services/reminderService.js';

let server;
async function start() {
  await connectDatabase();
  if (env.reminderSchedulerEnabled && env.REMINDER_SCHEDULER_COMPANY_ID) {
    startReminderScheduler({
      companyId: env.REMINDER_SCHEDULER_COMPANY_ID,
      intervalMinutes: env.REMINDER_SCHEDULER_INTERVAL_MINUTES,
    });
  } else if (env.reminderSchedulerEnabled) {
    console.warn('Reminder scheduler enabled but REMINDER_SCHEDULER_COMPANY_ID is missing. Scheduler will stay off.');
  }
  server = app.listen(env.PORT, () => console.info(`API listening on ${env.PORT}`));
}
function shutdown(signal) {
  console.info(`${signal}: shutting down`);
  server?.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
start().catch((error) => {
  console.error('API startup failed', error);
  process.exit(1);
});
