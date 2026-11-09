#!/usr/bin bash

export DB_DATABASE="neobank-test"
export DB_HOST="localhost"
export DB_PASSWORD="1234"
export DB_PORT="5432"
export DB_USER="postgres"

export LOGGER_LEVEL="debug"
export LOGGER_TYPE="NOOP"

export TZ=UTC

npx jest --detectOpenHandles

# OR USING DOPPLER
# doppler run --command="npx jest --detectOpenHandles"
