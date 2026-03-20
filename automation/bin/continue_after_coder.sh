#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <run_dir>" >&2
  exit 2
fi

RUN_DIR="$1"

automation/bin/from_coder_to_tester.sh "$RUN_DIR" >/tmp/classflow_after_coder.out

echo "Следующий шаг:"
echo "1. Открой файл: $RUN_DIR/04_tester_prompt.txt"
echo "2. Отправь его в Tester"
echo "3. Сохрани полный ответ в: $RUN_DIR/04_tester_answer.txt"
echo
echo "Готовый tester prompt:"
sed -n '1,260p' "$RUN_DIR/04_tester_prompt.txt"
