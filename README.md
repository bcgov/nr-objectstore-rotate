# NR Object Storage Rotate

A Sidecar container for rotating, compressing and backing up log files to Object Storage.

## Architecture

The container is a Typescipt Node.js application that uses a SQLite database to track the files as they are stepped through each stage. The stages run independantely on a configurable cron schedule.

COnfigurable environment variables will be shown like `ENV_VAR` below.

### Stage 0 - Log file generated

The application logs to disk. Files to be rotated must end with `LOGROTATE_SUFFIX`.

### Stage 1 - Rotate log file

The environment variable `CRON_ROTATE` is used to schedule the rotation of the files. Matching files are rotated by renaming the files to append a timestamp.

If any files are rotated then, optionally, `LOGROTATE_POSTROTATE_COMMAND` is called. It can be necessary to signal the application that the rotation occurred so it can open a new file.

### Stage 2 - Compress log file

The environment variable `CRON_COMPRESS` is used to schedule the compression of the rotated files.

### Stage 3 - Backup log file

The environment variable `CRON_BACKUP` is used to schedule the back of the compressed files to Object Storage. To identify the source, a prefix can be configured by setting `OBJECT_STORAGE_FILENAME_PREFIX`. Any arbitrary metadata can be set by setting `OBJECT_STORAGE_METADATA` to be a key/value JSON string.

### Stage 4 - Janitor

The environment variable `CRON_JANITOR` is used to schedule the janitor which removes files after they have been backed up. The number of log files to retain can be configured by setting `JANITOR_COPIES`.

## Rotation Setups

The default rotates files once every day. If you change the cron to run hourly, then it will rotate hourly. The minimum file size environment variable can be set to skip rotating files until they grow larger enough. The age maximum can ensure files don't remain on the server indefinitely.

#### LOGROTATE_FILESIZE_MIN

The minimum file size (in bytes) before the file is rotated. Empty files are always skipped. If you set the minimum and run cron frequently, you will prevent files from growing much larger than this size. Default: 0

#### LOGROTATE_AGE_MAX

The maximum age (in milliseconds) of a file before it is rotated (even if the minimum file size is not met). Values less than 1 are ignored. Default: 0

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
