#!/usr/bin/env bash
set -euo pipefail

cd /home/zerro/projects/Class

TASK_FILE="${1:-automation/state/current_task.txt}"
RUN_ID="${2:-$(date +%Y%m%d_%H%M%S)}"

automation/bin/orchestrate_task.sh "$TASK_FILE" "$RUN_ID" >/tmp/classflow_start_run.out

RUN_DIR="automation/artifacts/run_${RUN_ID}"

echo "RUN_DIR=$RUN_DIR"
echo
echo "Следующий шаг:"
echo "1. Открой файл: $RUN_DIR/02_architect_prompt.txt"
echo "2. Отправь его в Architect"
echo "3. Сохрани полный ответ в: $RUN_DIR/02_architect_answer.txt"
echo "4. Потом запусти:"
echo "   automation/bin/from_architect_to_coder.sh $RUN_DIR"
echo
echo "Файлы run dir:"
find "$RUN_DIR" -maxdepth 1 -type f | sort
