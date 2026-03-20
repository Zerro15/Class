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
  if automation/bin/validate_tester_answer.py "$RUN_DIR/04_tester_answer.txt" >/tmp/classflow_validate_tester_answer.out 2>/tmp/classflow_validate_tester_answer.err; then
    echo "Стадия: chain complete"
    echo "Следующий шаг:"
    echo "1. Открой $RUN_DIR/04_tester_answer.txt"
    echo "2. Возьми блок [ЧТО ВЕРНУТЬ CODER/ARCHITECT]"
    echo "3. На его основе делай локальные правки через apply_patch / cat > file"
    exit 0
  else
    echo "Стадия: tester answer invalid"
    echo "Следующий шаг:"
    echo "1. Открой файл: $RUN_DIR/04_tester_prompt.txt"
    echo "2. Отправь его в Tester"
    echo "3. Сохрани настоящий ответ в: $RUN_DIR/04_tester_answer.txt"
    echo
    echo "Почему ответ не принят:"
    cat /tmp/classflow_validate_tester_answer.out 2>/dev/null || true
    cat /tmp/classflow_validate_tester_answer.err 2>/dev/null || true
    exit 0
  fi
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
  echo "2. Потом отправь $RUN_DIR/04_tester_prompt.txt в Tester"
  exit 0
fi

if [ -f "$RUN_DIR/03_coder_prompt.txt" ]; then
  echo "Стадия: waiting coder answer"
  echo "Следующий шаг:"
  echo "1. Открой файл: $RUN_DIR/03_coder_prompt.txt"
  echo "2. Отправь его в Coder"
  echo "3. Сохрани полный ответ в: $RUN_DIR/03_coder_answer.txt"
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
