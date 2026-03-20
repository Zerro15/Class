#!/usr/bin/env bash
set -euo pipefail

cd /home/zerro/projects/Class/backend

echo "== pytest =="
pytest -q

echo
echo "== ruff =="
ruff check .

echo
echo "== mypy =="
mypy app
