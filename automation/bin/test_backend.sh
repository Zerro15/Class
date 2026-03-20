#!/usr/bin/env bash
set -euo pipefail

cd /home/zerro/projects/Class/backend
. .venv/bin/activate
PYTHONPATH=. pytest "$@"
