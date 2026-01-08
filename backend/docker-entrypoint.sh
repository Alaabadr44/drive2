#!/bin/sh
set -e

# Run database seed
echo "Running database seed..."
node dist/scripts/seed.js

# Start the application
echo "Starting application..."
npm start
