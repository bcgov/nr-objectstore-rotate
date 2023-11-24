export const CRON_ROTATE = process.env.CRON_ROTATE ?? '59 23 * * *';
export const CRON_COMPRESS = process.env.CRON_COMPRESS ?? '*/10 * * * *';
export const CRON_BACKUP = process.env.CRON_BACKUP ?? '*/10 * * * *';
export const CRON_JANITOR = process.env.CRON_JANITOR ?? '*/10 * * * *';

export const LOGROTATE_DIRECTORY = process.env.LOGS_DIRECTORY ?? 'logs';
export const LOGROTATE_STATUSFILE =
  process.env.LOGROTATE_STATUSFILE ?? 'cron.db';

export const LOGROTATE_SUFFIX = process.env.LOGROTATE_SUFFIX ?? 'log';
export const LOGROTATE_POSTROTATE_COMMAND =
  process.env.LOGROTATE_POSTROTATE_COMMAND ?? '';
export const JANITOR_COPIES = Number.parseInt(
  process.env.JANITOR_COPIES ?? '0',
);

// Object storage - required
export const OBJECT_STORAGE_END_POINT =
  process.env.OBJECT_STORAGE_END_POINT ?? '';
export const OBJECT_STORAGE_ACCESS_KEY =
  process.env.OBJECT_STORAGE_ACCESS_KEY ?? '';
export const OBJECT_STORAGE_BUCKET = process.env.OBJECT_STORAGE_BUCKET ?? '';
export const OBJECT_STORAGE_SECRET_KEY =
  process.env.OBJECT_STORAGE_SECRET_KEY ?? '';

// Optional - Fetch OBJECT_STORAGE_SECRET_KEY from Vault using NR Broker
export const BROKER_URL =
  process.env.BROKER_URL ?? 'https://nr-broker.apps.silver.devops.gov.bc.ca/';
export const BROKER_JWT = process.env.BROKER_JWT ?? '';
export const BROKER_USER =
  process.env.BROKER_USER ?? 'objectstore-backup@internal';

export const ENV_LONG_TO_SHORT: { [key: string]: string } = {
  development: 'dev',
  test: 'test',
  production: 'prod',
};
export const BROKER_PROJECT = process.env.BROKER_PROJECT ?? '';
export const BROKER_SERVICE = process.env.BROKER_SERVICE ?? '';
export const BROKER_ENVIRONMENT = process.env.BROKER_ENVIRONMENT ?? '';
export const VAULT_CRED_PATH =
  process.env.VAULT_CRED_PATH ??
  `/apps/${ENV_LONG_TO_SHORT[BROKER_ENVIRONMENT]}/${BROKER_PROJECT}/${BROKER_SERVICE}/rotatebackup`;

export const VAULT_CRED_KEY = process.env.VAULT_CRED_KEY ?? 'secret_key';
export const VAULT_URL =
  process.env.VAULT_URL ?? 'https://knox.io.nrs.gov.bc.ca';

export enum DB_FILE_STATUS {
  Moved,
  Rotated,
  Compressed,
  CopiedToObjectStore,
}
