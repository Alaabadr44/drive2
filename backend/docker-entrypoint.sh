#!/bin/sh
set -e

# Run database seed
if [ "$SKIP_SEED" != "true" ]; then
    echo "Running database seed..."
    node dist/scripts/seed.js
else
    echo "Skipping database seed (SKIP_SEED=true)..."
fi

# Start the application
echo "Starting application..."
npm start
