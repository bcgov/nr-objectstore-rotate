# export CRON_ROTATE="59 23 * * *"
# export CRON_COMPRESS="*/10 * * * *"
# export CRON_BACKUP="*/20 * * * *"
# export CRON_JANITOR="*/10 * * * *"
# export RUN_ONCE="true"

export LOGROTATE_DIRECTORY="/logs"
# export LOGROTATE_STATUSFILE="cron.db"
# export LOGROTATE_FILESIZE_MIN="1024"
# export LOGROTATE_AGE_MAX="86400"
# export LOGROTATE_SUFFIX="log"
# export LOGROTATE_POSTROTATE_COMMAND="echo 'rotated!'"
export JANITOR_COPIES=3

# Required
# export OBJECT_STORAGE_ENABLED="true"
export OBJECT_STORAGE_END_POINT=""
export OBJECT_STORAGE_ACCESS_KEY=""
export OBJECT_STORAGE_SECRET_KEY=""
export OBJECT_STORAGE_BUCKET=""
# export OBJECT_STORAGE_FILENAME_PREFIX=""

# Set BROKER_* and VAULT_* values to use NR Broker and Vault
# export BROKER_URL=""
# export BROKER_JWT=""
# export BROKER_USER=""
# export BROKER_PROJECT=""
# export BROKER_SERVICE=""
# export BROKER_ENVIRONMENT=""

# export VAULT_CRED_PATH=""
# If VAULT_CRED_KEYS_* is set, the value from VAULT_CRED_PATH replaces OBJECT_STORAGE_*
# Example: VAULT_CRED_KEYS_SECRET_KEY="secret_key" would replace OBJECT_STORAGE_SECRET_KEY
#          with the value of the key 'secret_key' at the path VAULT_CRED_PATH in Vault.
# export VAULT_CRED_KEYS_END_POINT=""
# export VAULT_CRED_KEYS_ACCESS_KEY=""
# export VAULT_CRED_KEYS_BUCKET=""
# export VAULT_CRED_KEYS_SECRET_KEY=""
# export VAULT_URL=""
