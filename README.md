# NR Object Store Rotate

Sidecar for rotating log files to objectstore.

## Testing

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
