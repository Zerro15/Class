#!/bin/sh
set -e
export PYTHONPATH=/app

echo "Waiting for DB..."

python - <<'PY'
import os, time
import psycopg2

url = os.environ["DATABASE_URL"].replace("postgresql+psycopg2://", "postgresql://")

for i in range(60):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print("DB is ready")
        break
    except Exception as e:
        print(f"DB not ready ({i+1}/60): {e}")
        time.sleep(1)
else:
    raise SystemExit("DB not ready after 60s")
PY

echo "Running migrations..."
alembic upgrade head

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
c