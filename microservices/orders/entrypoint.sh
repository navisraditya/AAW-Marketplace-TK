#!/bin/bash

echo "🚀 Starting the Orders microservice"

# Wait for database to be ready
echo "⏳ Waiting for database to be available..."
MAX_RETRIES=30
count=0

while [ $count -lt $MAX_RETRIES ]
do
  # Attempt to connect to the database
  nc -z $DB_HOST $DB_PORT
  result=$?
  
  if [ $result -eq 0 ]; then
    echo "✅ Database is available, proceeding with migration"
    break
  fi
  
  echo "⏳ Database not ready yet, waiting... ($((count+1))/$MAX_RETRIES)"
  count=$((count+1))
  sleep 2
done

if [ $count -eq $MAX_RETRIES ]; then
  echo "❌ Database connection timed out after $MAX_RETRIES attempts"
  exit 1
fi

echo "🔄 Running database migrations"
tsx dist/src/db/migrate.js

if [ $? -ne 0 ]; then
  echo "❌ Database migration failed"
  exit 1
fi

echo "🚀 Starting service"
node dist/src/server.js
