import { CronJob } from 'cron';
import { flushTrackedTime } from '../helpers/time-tracking';
import { logger } from '../logger';
import { cleanupFiles } from './cleanup-files';

enum CRON_TIMES {
  EVERY_MINUTE = '* * * * *',
  EVERY_15_MINUTES = '*/15 * * * *'
}

const loadCrons = () => {
  logger.debug('Loading crons...');

  new CronJob(
    CRON_TIMES.EVERY_15_MINUTES,
    cleanupFiles,
    null,
    true,
    'Europe/Lisbon',
    null,
    true
  );

  new CronJob(
    CRON_TIMES.EVERY_MINUTE,
    flushTrackedTime,
    null,
    true,
    'Europe/Lisbon',
    null,
    false
  );
};

export { loadCrons };
