FROM python:3.14-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    default-libmysqlclient-dev \
    build-essential \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt && \
    apt-mark manual curl gosu libpq5 >/dev/null && \
    apt-get purge -y --auto-remove build-essential libpq-dev default-libmysqlclient-dev && \
    rm -rf /var/lib/apt/lists/*

COPY . .

RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/logs /app/staticfiles /app/media && \
    chown -R appuser:appuser /app/logs /app/staticfiles /app/media && \
    chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "core.wsgi:application", "-c", "gunicorn.conf.py"]
