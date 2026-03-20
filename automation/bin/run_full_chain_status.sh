#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <run_dir>" >&2
  exit 2
fi

RUN_DIR="$1"
test -d "$RUN_DIR"

echo "RUN_DIR=$RUN_DIR"
echo

for f in \
  01_supervisor_prompt.txt \
  02_architect_prompt.txt \
  02_architect_answer.txt \
  03_coder_prompt.txt \
  03_coder_answer.txt \
  04_tester_prompt.txt \
  04_tester_answer.txt
do
  if [ -f "$RUN_DIR/$f" ]; then
    echo "[OK]   $f"
  else
    echo "[MISS] $f"
  fi
done

echo
automation/bin/next_agent_step.sh "$RUN_DIR"
