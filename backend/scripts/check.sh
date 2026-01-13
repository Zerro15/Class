#!/usr/bin/env bash
set -euo pipefail

echo "== Backend: ruff =="
cd backend
python -m ruff check .
python -m ruff format --check .

echo "== Backend: mypy =="
python -m mypy app || true
# (если не готов к строгим типам — оставь || true на первое время)

echo "== Backend: pytest =="
python -m pytest -q --disable-warnings --maxfail=1
