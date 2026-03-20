#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <run_dir>" >&2
  exit 2
fi

RUN_DIR="$1"

CODER_ANSWER="$RUN_DIR/03_coder_answer.txt"
TESTER_TEMPLATE="$RUN_DIR/04_tester_prompt_template.txt"
TESTER_PROMPT="$RUN_DIR/04_tester_prompt.txt"

if [ ! -f "$CODER_ANSWER" ]; then
  echo "missing file: $CODER_ANSWER" >&2
  exit 1
fi

if [ ! -f "$TESTER_TEMPLATE" ]; then
  echo "missing file: $TESTER_TEMPLATE" >&2
  exit 1
fi

python3 automation/bin/build_tester_prompt.py "$TESTER_TEMPLATE" "$CODER_ANSWER" "$TESTER_PROMPT"

echo "ready:"
echo "  $TESTER_PROMPT"
echo
sed -n '1,260p' "$TESTER_PROMPT"
