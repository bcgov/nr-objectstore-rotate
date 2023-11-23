export const CRON_BACKUP = process.env.CRON_BACKUP ?? '0 8 * * *';
export const CRON_ROTATE = process.env.CRON_ROTATE ?? '59 23 * * *';

export const LOGS_DIRECTORY = process.env.LOGS_DIRECTORY ?? 'logs';
export const LOGROTATE_STATUSFILE =
  process.env.LOGROTATE_STATUSFILE ?? 'cron.db';

export const LOGS_ROTATE_SUFFIX = process.env.LOGS_ROTATE_SUFFIX ?? 'log';
export const LOGROTATE_POSTROTATE_COMMAND =
  process.env.LOGROTATE_POSTROTATE_COMMAND ?? '';
export const LOGROTATE_COPIES = Number.parseInt(
  process.env.LOGROTATE_COPIES ?? '0',
);

export const OBJECT_STORAGE_URL = process.env.OBJECT_STORAGE_URL ?? '';

export const OBJECT_STORAGE_ACCESS_KEY =
  process.env.OBJECT_STORAGE_ACCESS_KEY ?? '';
export const OBJECT_STORAGE_SECRET_KEY =
  process.env.OBJECT_STORAGE_SECRET_KEY ?? '';
export const OBJECT_STORAGE_BUCKET = process.env.OBJECT_STORAGE_BUCKET ?? '';

export const BROKER_URL = process.env.BROKER_URL ?? '';
export const VAULT_URL = process.env.VAULT_URL ?? '';
