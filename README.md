# NR Object Store Rotate

Sidecar for rotating log files to objectstore.

## Testing

1. Copy `setenv-tmpl.sh` to `setenv-local.sh`.
2. Modify cron to run every minute ("*/1 * * * *").
3. Change LOGROTATE_DIRECTORY to "logs". Add your OBJECT_STORAGE_ secrets.
4. Start sidecar: `npm run start`
5. Create sample log files: `./test/create-log-files.sh`
6. View DB as cron executes: `sqlite3 ./logs/cron.db 'select * from logs'`
7. Use https://min.io/docs/minio/linux/reference/minio-mc.html# to view files
8. Stop and delete test files in objectstore

# License

See: [LICENSE](./LICENSE)
