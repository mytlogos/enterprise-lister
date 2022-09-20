#!/bin/bash
set -o allexport
source ./migrate.env
set +o allexport
shift
node scripts/migrateMariadbToPostgresql.mjs