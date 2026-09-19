#!/bin/sh
set -e

echo "[entrypoint] Checking startup tasks..."

# Antes das migrações: o Nginx do web sobe em paralelo e lê este volume
# com outro uid. Sem o+rX, /media/themes/ responde 403 com o tema ativo.
mkdir -p /app/media/themes
if ! gosu appuser test -w /app/media/themes 2>/dev/null; then
    echo "[entrypoint] Fixing media and theme permissions..."
    chown -R appuser:appuser /app/media 2>/dev/null || true
fi
chmod -R a+rX /app/media 2>/dev/null || true

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

# PRIVATE_MEDIA_ROOT guarda pacotes LGPD: fora de /app/media e sem leitura para outros.
mkdir -p /app/private
chmod 700 /app/private 2>/dev/null || true
if ! gosu appuser test -w /app/private 2>/dev/null; then
    echo "[entrypoint] Fixing private storage permissions..."
    chown -R appuser:appuser /app/private 2>/dev/null || true
fi

echo "[entrypoint] Starting application..."
exec gosu appuser "$@"
