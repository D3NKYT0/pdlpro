#!/bin/sh
set -e

echo "[entrypoint] Checking startup tasks..."

if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "[entrypoint] Running database migrations..."
    gosu appuser python manage.py migrate --noinput
else
    echo "[entrypoint] Skipping database migrations (RUN_MIGRATIONS=false)."
fi

if [ "$RUN_COLLECTSTATIC" != "false" ]; then
    if [ -d "/app/static" ] && [ -n "$(ls -A /app/static 2>/dev/null)" ]; then
        echo "[entrypoint] Collecting static files into STATIC_ROOT..."
        python manage.py collectstatic --noinput
        chown -R appuser:appuser /app/staticfiles 2>/dev/null || true
    fi
else
    echo "[entrypoint] Skipping static collection (RUN_COLLECTSTATIC=false)."
fi

if ! gosu appuser test -w /app/media 2>/dev/null; then
    echo "[entrypoint] Fixing media permissions..."
    chown -R appuser:appuser /app/media 2>/dev/null || true
fi

echo "[entrypoint] Starting application..."
exec gosu appuser "$@"
