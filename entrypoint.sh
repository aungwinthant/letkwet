#!/bin/sh
# Entrypoint script for Cloud Run
# Listens on PORT environment variable (default 8080)

PORT=${PORT:-8080}
exec serve -s dist -l $PORT
