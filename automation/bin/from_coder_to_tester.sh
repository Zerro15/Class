#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <run_dir>" >&2
  exit 2
fi

RUN_DIR="$1"

CODER_ANSWER="$RUN_DIR/03_coder_answer.txt"
SANITIZED_CODER_ANSWER="$RUN_DIR/03_coder_answer_sanitized.txt"
TESTER_TEMPLATE="$RUN_DIR/04_tester_prompt_template.txt"
TESTER_PROMPT="$RUN_DIR/04_tester_prompt.txt"

test -f "$CODER_ANSWER"
test -f "$TESTER_TEMPLATE"

python3 automation/bin/normalize_coder_answer.py "$CODER_ANSWER" "$SANITIZED_CODER_ANSWER"
python3 automation/bin/build_tester_prompt.py "$TESTER_TEMPLATE" "$SANITIZED_CODER_ANSWER" "$TESTER_PROMPT"

echo "ready:"
printf '  %s\n' \
  "$SANITIZED_CODER_ANSWER" \
  "$TESTER_PROMPT"
echo
sed -n '1,260p' "$TESTER_PROMPT"
