FROM python:3.12-slim-bookworm

WORKDIR /app
ENV PYTHONPATH=/app


# Надёжный apt: используем retries + fix-missing и не используем build-essential если не нужно
RUN set -eux; \
    apt-get update -o Acquire::Retries=10 -o Acquire::http::Timeout=30; \
    apt-get install -y --no-install-recommends --fix-missing libpq-dev; \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && sed -i 's/\r$//' /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
