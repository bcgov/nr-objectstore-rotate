#!/bin/bash

# Define the directory name
dir1="logs"

# Create the directory if it doesn't exist
if [ ! -d "$dir1" ]; then
    mkdir "$dir1"
    echo "Created directory: $dir1"
fi

# Create an audit log file and add it
log_file="$dir1/audit.log"
touch "$log_file"
echo "Log entry 1" >> "$log_file"
echo "Log entry 2" >> "$log_file"
# head -c 10000000 /dev/urandom >"$log_file"

# Create an access log file and add it
log_file="$dir1/access.log"
touch "$log_file"
echo "Log entry 1" >> "$log_file"
echo "Log entry 2" >> "$log_file"
# head -c 10000000 /dev/urandom >"$log_file"
