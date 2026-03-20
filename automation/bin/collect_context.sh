#!/usr/bin/env bash
set -euo pipefail

cd /home/zerro/projects/Class

TASK_FILE="${1:-}"
OUT="${2:-automation/artifacts/context_snapshot.txt}"

{
  echo "## PWD"
  pwd
  echo

  echo "## GIT STATUS"
  git status --short
  echo

  echo "## BACKEND TREE"
  find backend/app -maxdepth 3 -type f | sort
  echo

  echo "## AUTH SEARCH"
  rg -n "auth/me|get_current_user|JWT|jwt|login|register|Bearer|HTTPBearer" backend -S || true
  echo

  echo "## AUTH FILES"
  sed -n '1,240p' backend/app/api/v1/auth.py || true
  echo
  sed -n '1,240p' backend/app/api/deps.py || true
  echo
  sed -n '1,240p' backend/app/core/security.py || true
  echo
  sed -n '1,240p' backend/app/schemas/auth.py || true
  echo
  sed -n '1,240p' backend/tests/test_auth.py || true
  echo

  if [[ -n "$TASK_FILE" && -f "$TASK_FILE" ]]; then
    echo "## TASK"
    cat "$TASK_FILE"
    echo
  fi
} > "$OUT"

echo "saved: $OUT"
