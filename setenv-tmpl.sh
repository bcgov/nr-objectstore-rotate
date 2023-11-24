# export CRON_ROTATE="59 23 * * *"
# export CRON_COMPRESS="*/10 * * * *"
# export CRON_BACKUP="*/10 * * * *"
# export CRON_JANITOR="*/10 * * * *"

export LOGROTATE_DIRECTORY="/logs"
export JANITOR_COPIES=3
# export LOGROTATE_SUFFIX="log"
# export LOGROTATE_POSTROTATE_COMMAND=""
# export LOGROTATE_STATUSFILE="cron.db"

# Required
export OBJECT_STORAGE_END_POINT=""
export OBJECT_STORAGE_ACCESS_KEY=""
export OBJECT_STORAGE_BUCKET=""
# Required (if not using NR Broker & Vault)
export OBJECT_STORAGE_SECRET_KEY=""

# Required (if using NR Broker)
export BROKER_JWT=""
export BROKER_PROJECT=""
export BROKER_SERVICE=""
export BROKER_ENVIRONMENT=""
