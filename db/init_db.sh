#!/bin/bash

# Load environment variables from .env.local
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL is not set in .env.local"
    exit 1
fi

# Mask the password for logging
MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:[^:@]*@/:****@/')
echo "Connecting to: $MASKED_URL"

echo "Initializing database..."
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/recurring_sessions.sql
psql "$DATABASE_URL" -f db/session_instances.sql

if [ $? -eq 0 ]; then
    echo "Database initialized successfully!"
else 
    echo "Failed to initialize database."
    exit 1
fi
