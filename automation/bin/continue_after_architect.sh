#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <run_dir>" >&2
  exit 2
fi

RUN_DIR="$1"

automation/bin/from_architect_to_coder.sh "$RUN_DIR" >/tmp/classflow_after_architect.out

echo "Следующий шаг:"
echo "1. Открой файл: $RUN_DIR/03_coder_prompt.txt"
echo "2. Отправь его в Coder"
echo "3. Сохрани полный ответ в: $RUN_DIR/03_coder_answer.txt"
echo "4. Потом запусти:"
echo "   automation/bin/continue_after_coder.sh $RUN_DIR"
echo
echo "Готовый coder prompt:"
sed -n '1,260p' "$RUN_DIR/03_coder_prompt.txt"
