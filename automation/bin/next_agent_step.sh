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

if [ -f "$RUN_DIR/04_tester_answer.txt" ]; then
  echo "Стадия: chain complete"
  echo "Следующий шаг:"
  echo "1. Открой $RUN_DIR/04_tester_answer.txt"
  echo "2. На его основе уже делай локальный patch/apply_patch в проект"
  exit 0
fi

if [ -f "$RUN_DIR/04_tester_prompt.txt" ]; then
  echo "Стадия: waiting tester answer"
  echo "Следующий шаг:"
  echo "1. Открой файл: $RUN_DIR/04_tester_prompt.txt"
  echo "2. Отправь его в Tester"
  echo "3. Сохрани полный ответ в: $RUN_DIR/04_tester_answer.txt"
  exit 0
fi

if [ -f "$RUN_DIR/03_coder_answer.txt" ]; then
  echo "Стадия: ready to build tester prompt"
  echo "Следующий шаг:"
  echo "1. Запусти: automation/bin/continue_after_coder.sh $RUN_DIR"
  exit 0
fi

if [ -f "$RUN_DIR/03_coder_prompt.txt" ]; then
  echo "Стадия: waiting coder answer"
  echo "Следующий шаг:"
  echo "1. Открой файл: $RUN_DIR/03_coder_prompt.txt"
  echo "2. Отправь его в Coder"
  echo "3. Сохрани полный ответ в: $RUN_DIR/03_coder_answer.txt"
  echo "4. Потом запусти: automation/bin/continue_after_coder.sh $RUN_DIR"
  exit 0
fi

if [ -f "$RUN_DIR/02_architect_answer.txt" ]; then
  echo "Стадия: ready to build coder prompt"
  echo "Следующий шаг:"
  echo "1. Запусти: automation/bin/continue_after_architect.sh $RUN_DIR"
  exit 0
fi

echo "Стадия: waiting architect answer"
echo "Следующий шаг:"
echo "1. Открой файл: $RUN_DIR/02_architect_prompt.txt"
echo "2. Отправь его в Architect"
echo "3. Сохрани полный ответ в: $RUN_DIR/02_architect_answer.txt"
echo "4. Потом запусти: automation/bin/continue_after_architect.sh $RUN_DIR"
