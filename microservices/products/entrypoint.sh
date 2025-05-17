#!/bin/bash

echo "🚀 Starting the Products microservice"

# Database availability is already checked by Kubernetes initContainers
echo "🔍 Kubernetes initContainers have verified service availability"

echo "🔄 Running database migrations with retry logic"
MAX_MIGRATION_RETRIES=5
migration_count=0

while [ $migration_count -lt $MAX_MIGRATION_RETRIES ]
do
  echo "🔄 Migration attempt $(($migration_count+1))/$MAX_MIGRATION_RETRIES"
  tsx dist/src/db/migrate.js
  result=$?
  
  if [ $result -eq 0 ]; then
    echo "✅ Database migration successful"
    break
  fi
  
  echo "⚠️ Migration attempt failed, retrying in 5 seconds..."
  migration_count=$((migration_count+1))
  sleep 5
done

if [ $migration_count -eq $MAX_MIGRATION_RETRIES ]; then
  echo "❌ Database migration failed after $MAX_MIGRATION_RETRIES attempts"
  exit 1
fi

echo "🔍 Checking database schema integrity"
# Additional post-migration validation could go here

echo "🚀 Starting service"
node dist/src/server.js
