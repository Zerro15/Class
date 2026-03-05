#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pushd "$ROOT_DIR/backend" >/dev/null
python -m ruff check .
python -m pytest -q
popd >/dev/null

pushd "$ROOT_DIR/frontend" >/dev/null
npm run lint
npm run typecheck
npm run build
popd >/dev/null

if command -v docker >/dev/null 2>&1; then
  pushd "$ROOT_DIR" >/dev/null
  docker compose config >/dev/null
  popd >/dev/null
else
  echo "[warn] docker is not installed; skipping docker compose smoke check"
fi
