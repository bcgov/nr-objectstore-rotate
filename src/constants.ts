export const CRON_ROTATE = process.env.CRON_ROTATE ?? '59 23 * * *';
export const CRON_COMPRESS = process.env.CRON_COMPRESS ?? '*/10 * * * *';
export const CRON_BACKUP = process.env.CRON_BACKUP ?? '*/20 * * * *';
export const CRON_JANITOR = process.env.CRON_JANITOR ?? '*/10 * * * *';

export const LOGROTATE_DIRECTORY = process.env.LOGROTATE_DIRECTORY ?? 'logs';
export const LOGROTATE_STATUSFILE =
  process.env.LOGROTATE_STATUSFILE ?? 'cron.db';

export const LOGROTATE_FILESIZE_MIN = process.env.LOGROTATE_FILESIZE_MIN
  ? Number.parseInt(process.env.LOGROTATE_FILESIZE_MIN)
  : 1;
export const LOGROTATE_AGE_MAX = process.env.LOGROTATE_AGE_MAX
  ? Number.parseInt(process.env.LOGROTATE_AGE_MAX)
  : 0;

export const LOGROTATE_SUFFIX = process.env.LOGROTATE_SUFFIX ?? 'log';
export const LOGROTATE_COPYTRUNCATE_SUFFIXES =
  process.env.LOGROTATE_COPYTRUNCATE_SUFFIXES?.split(',') ?? [];
export const LOGROTATE_POSTROTATE_COMMAND =
  process.env.LOGROTATE_POSTROTATE_COMMAND ?? '';
export const JANITOR_COPIES = Number.parseInt(
  process.env.JANITOR_COPIES ?? '0',
);

// Object storage - required
export const OBJECT_STORAGE_ENABLED =
  process.env.OBJECT_STORAGE_ENABLED !== undefined
    ? process.env.OBJECT_STORAGE_ENABLED == 'true'
    : true;
export const OBJECT_STORAGE_END_POINT =
  process.env.OBJECT_STORAGE_END_POINT ?? '';
export const OBJECT_STORAGE_ACCESS_KEY =
  process.env.OBJECT_STORAGE_ACCESS_KEY ?? '';
export const OBJECT_STORAGE_SECRET_KEY =
  process.env.OBJECT_STORAGE_SECRET_KEY ?? '';
export const OBJECT_STORAGE_BUCKET = process.env.OBJECT_STORAGE_BUCKET ?? '';
export const OBJECT_STORAGE_FILENAME_PREFIX = process.env
  .OBJECT_STORAGE_FILENAME_PREFIX
  ? `${process.env.OBJECT_STORAGE_FILENAME_PREFIX}.`
  : '';
// Optional key/value JSON object with metadata
export const OBJECT_STORAGE_METADATA =
  process.env.OBJECT_STORAGE_METADATA ?? '';

// Optional - Fetch OBJECT_STORAGE_SECRET_KEY from Vault using NR Broker
export const BROKER_URL =
  process.env.BROKER_URL ?? 'https://nr-broker.apps.silver.devops.gov.bc.ca/';
export const BROKER_JWT = process.env.BROKER_JWT ?? '';
export const BROKER_USER =
  process.env.BROKER_USER ?? 'objectstore-backup@internal';
export const BROKER_ROLE_ID = process.env.BROKER_ROLE_ID ?? null;

export const ENV_LONG_TO_SHORT: { [key: string]: string } = {
  development: 'dev',
  test: 'test',
  production: 'prod',
};
export const BROKER_PROJECT = process.env.BROKER_PROJECT ?? '';
export const BROKER_SERVICE = process.env.BROKER_SERVICE ?? '';
export const BROKER_ENVIRONMENT = process.env.BROKER_ENVIRONMENT ?? '';
// Path to the Object storage credentials in Vault
export const VAULT_CRED_PATH =
  process.env.VAULT_CRED_PATH ??
  `apps/data/${
    ENV_LONG_TO_SHORT[BROKER_ENVIRONMENT]
  }/${BROKER_PROJECT}/${BROKER_SERVICE}${
    process.env.VAULT_CRED_PATH_SUFFIX
      ? `/${process.env.VAULT_CRED_PATH_SUFFIX}`
      : ''
  }`;
// If VAULT_CRED_KEYS_* is set, the value from VAULT_CRED_PATH replaces OBJECT_STORAGE_*
// Example: VAULT_CRED_KEYS_SECRET_KEY="secret_key" would replace OBJECT_STORAGE_SECRET_KEY
//          with the value of the key 'secret_key' at the path VAULT_CRED_PATH in Vault.
export const VAULT_CRED_KEYS_END_POINT =
  process.env.VAULT_CRED_KEYS_END_POINT ?? '';
export const VAULT_CRED_KEYS_ACCESS_KEY =
  process.env.VAULT_CRED_KEYS_ACCESS_KEY ?? '';
export const VAULT_CRED_KEYS_SECRET_KEY =
  process.env.VAULT_CRED_KEYS_SECRET_KEY ?? '';
export const VAULT_CRED_KEYS_BUCKET = process.env.VAULT_CRED_KEYS_BUCKET ?? '';
export const VAULT_URL =
  process.env.VAULT_URL ?? 'https://knox.io.nrs.gov.bc.ca/';

export enum DB_FILE_STATUS {
  Moved,
  Rotated,
  Compressed,
  CopiedToObjectStore,
}
