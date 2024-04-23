# NR Object Storage Rotate

A sidecar container for rotating, compressing and backing up log files to object storage.

## Architecture

The container is a Typescipt Node.js application that uses a SQLite database to track the files as they are stepped through each stage. The stages run independantely on a configurable cron schedule.

Configurable environment variables will be shown like `ENV_VAR` below.

### Stage 0 - Log file generated

The application logs to disk. Files to be rotated must end with `LOGROTATE_SUFFIX`.

### Stage 1 - Rotate log file

The environment variable `CRON_ROTATE` is used to schedule the rotation of the files. The `LOGROTATE_DIRECTORY` is examined for files with the `LOGROTATE_SUFFIX` (default: log).

If any files are rotated then, optionally, `LOGROTATE_POSTROTATE_COMMAND` is called. It can be necessary to signal the application that the rotation occurred so it can open a new file.

Files are normally just renamed. You can set `LOGROTATE_COPYTRUNCATE_SUFFIXES` to instead copy and then truncate the file. Some files, like redirected output, can't be renamed and then deleted.

Rotated files are appended with the file's change date and the current UTC timestamp. See: https://nodejs.org/api/fs.html#stat-time-values

### Stage 2 - Compress log file

The environment variable `CRON_COMPRESS` is used to schedule the compression of the rotated files. The each file is compressed into a 'tgz' archive.

This stage can run frequently with little cost. If you wish to skip this stage, set the environment variable `COMPRESS_SKIP` to be true.

### Stage 3 - Backup log file

The environment variable `CRON_BACKUP` is used to schedule the backup of the compressed files to object storage.

If you have massive files or slow connectivity, increase the cron settings period. Otherwise, this stage can run frequently with little cost.

Any arbitrary metadata can be set by setting `OBJECT_STORAGE_METADATA` to be a key/value JSON string.

If you are sending similarly named files from multiple sources (OpenShift/Kubernetes nodes), then it is recommended that you set `OBJECT_STORAGE_FILENAME_PREFIX` to identify the source and avoid collisions.

If you set `OBJECT_STORAGE_ENABLED` to anything but the default of 'true' then the backup to object storage is skipped.

#### Required Configuration

The following are the environment variables that need to be set for the tool to use object storage.

* `OBJECT_STORAGE_END_POINT`
* `OBJECT_STORAGE_ACCESS_KEY`
* `OBJECT_STORAGE_BUCKET`
* `OBJECT_STORAGE_SECRET_KEY`

### Stage 4 - Janitor

The environment variable `CRON_JANITOR` is used to schedule the janitor which removes files after they have been backed up. The number of log files to retain can be configured by setting `JANITOR_COPIES`.

This stage can run frequently with little cost.

## SQLite Database

The SQLite database can be viewed by running a command like:

`sqlite3 ./logs/cron.db 'select * from logs'`

### Missing Files

Prior to each stage, the database and the file system are compared. Any file missing from the file system will be logged and deleted from the database.

### Moving the Log Directory

If you are moving the location of the files, you will need to update the path column of the logs table in the SQLite database. As well, you should take care not to trigger the missing files process.

## Object Storage Lifecycle Policies

This tool does not manage the lifecycle policies for the bucket the data is uploaded to. Please refer to the documentation for the object storage service you are using to setup a bucket lifecycle.

## Rotation Setups

The default rotates files once every day. If you change the cron to run hourly, then it will rotate hourly. The minimum file size environment variable can be set to skip rotating files until they grow larger enough. The age maximum can ensure files don't remain on the server indefinitely.

#### LOGROTATE_FILESIZE_MIN

The minimum file size (in bytes) before the file is rotated. Empty files are always skipped. If you set the minimum and run cron frequently, you will prevent files from growing much larger than this size. Default: 0

#### LOGROTATE_AGE_MAX

The maximum age (in milliseconds) of a file before it is rotated (even if the minimum file size is not met). Values less than 1 are ignored. Default: 0

### Integration with NR Broker

The backup stage can read credentials from NR Vault and report the backed up files to NR Broker if the NR Broker environment variables (`BROKER_*`) are set.

The required environment variables to set are:

* `BROKER_JWT`
* `BROKER_PROJECT`
* `BROKER_SERVICE`
* `BROKER_ENVIRONMENT`

This will set it up to read secrets from the standard key/value credential location in NR Vault for the service. The `VAULT_CRED_PATH_SUFFIX` variable can be set to include a path from the service's root.

The key/value document read from NR Vault will do nothing by default. The `VAULT_CRED_KEYS_*` variables replace the equivalent `OBJECT_STORAGE_*` with the value of the key read from Vault.

* VaultDoc[`VAULT_CRED_KEYS_END_POINT`] -> `OBJECT_STORAGE_END_POINT`
* VaultDoc[`VAULT_CRED_KEYS_ACCESS_KEY`] -> `OBJECT_STORAGE_ACCESS_KEY`
* VaultDoc[`VAULT_CRED_KEYS_SECRET_KEY`] -> `OBJECT_STORAGE_SECRET_KEY`
* VaultDoc[`VAULT_CRED_KEYS_BUCKET`] -> `OBJECT_STORAGE_BUCKET`

You are free to set as many (or as few) of the `VAULT_CRED_KEYS_*`.

## Local Testing

1. Copy `setenv-tmpl.sh` to `setenv-local.sh`.
2. Modify cron to run every minute ("*/1 * * * *").
3. Change LOGROTATE_DIRECTORY to "logs". Add your OBJECT_STORAGE_ secrets.
4. Source env: `source ./setenv-local.sh`
5. Start sidecar: `npm run start`
6. Create sample log files: `./test/create-log-files.sh`
7. View DB as cron executes: `sqlite3 ./logs/cron.db 'select * from logs'`
8. Use https://min.io/docs/minio/linux/reference/minio-mc.html# to view files
9. Stop and delete test files in objectstore

# License

See: [LICENSE](./LICENSE)
