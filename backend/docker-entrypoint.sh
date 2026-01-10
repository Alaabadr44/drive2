#!/bin/sh
set -e

# Run database seed
if [ "$SKIP_SEED" = "false" ]; then
    echo "🔥 detected SKIP_SEED=false. Running database seed (Replacing Data)..."
    node dist/scripts/seed.js
else
    echo "🛡️  SKIP_SEED is set to '${SKIP_SEED}'. Skipping database seed to preserve data."
fi

# Start the application
echo "Starting application..."
npm start
