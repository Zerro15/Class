#!/usr/bin/env bash
set -euo pipefail

cd /home/zerro/projects/Class

TASK_FILE="${1:-automation/state/current_task.txt}"
RUN_ID="${2:-$(date +%Y%m%d_%H%M%S)}"
RUN_DIR="automation/artifacts/run_${RUN_ID}"

mkdir -p "$RUN_DIR"

cp "$TASK_FILE" "$RUN_DIR/task.txt"

automation/bin/collect_context.sh "$TASK_FILE" "$RUN_DIR/context_snapshot.txt" >/dev/null

cat > "$RUN_DIR/01_supervisor_prompt.txt" <<'PROMPT'
Ниже задача пользователя и реальный контекст проекта.
Верни строго JSON только с ключами:
route
reason
task_for_first_agent
next_step

=== TASK ===
PROMPT

cat "$TASK_FILE" >> "$RUN_DIR/01_supervisor_prompt.txt"

cat >> "$RUN_DIR/01_supervisor_prompt.txt" <<'PROMPT'

=== REAL PROJECT CONTEXT ===
Смотри snapshot из файла рядом: context_snapshot.txt

Ограничения:
- проект на FastAPI, не на NestJS
- нельзя придумывать src/, guards из другого стека и несуществующие файлы
- route должен быть только одним из:
  Architect
  Coder
  Tester
  Architect->Coder->Tester
PROMPT

cat > "$RUN_DIR/02_architect_prompt.txt" <<'PROMPT'
Ниже задача пользователя и реальный context snapshot проекта.
Работай только по реальным файлам из snapshot.
Не придумывай NestJS, src/, JwtAuthGuard и другие чужие сущности, если их нет в проекте.

Верни строго блоки:
[КРАТКИЙ ВЫВОД]
[ПЛАН]
[ИЗМЕНЕНИЯ В АРХИТЕКТУРЕ]
[РИСКИ]
[ЧТО ПЕРЕДАТЬ CODER]

=== TASK ===
PROMPT

cat "$TASK_FILE" >> "$RUN_DIR/02_architect_prompt.txt"

cat >> "$RUN_DIR/02_architect_prompt.txt" <<'PROMPT'

=== REAL PROJECT CONTEXT ===
Используй файл context_snapshot.txt рядом.
PROMPT

cat > "$RUN_DIR/03_coder_prompt_template.txt" <<'PROMPT'
Ниже реальная задача для Coder на основе ответа Architect.
Работай только по существующим файлам проекта.
Не придумывай новые каталоги и другой стек.

Верни строго блоки:
[ЧТО СДЕЛАТЬ]
[ИЗМЕНЕНИЯ ПО ФАЙЛАМ]
[PATCH PLAN]
[ЧТО ПРОВЕРИТЬ]
[РИСКИ И ОГРАНИЧЕНИЯ]

=== CONTEXT ===
Используй context_snapshot.txt рядом.

=== TASK FROM ARCHITECT ===
<PASTE_ARCHITECT_HANDOFF_HERE>
PROMPT

cat > "$RUN_DIR/04_tester_prompt_template.txt" <<'PROMPT'
Ниже результат Coder и реальный context snapshot.
Проверь решение на корректность относительно реального проекта.

Верни строго блоки:
[ВЕРДИКТ]
[ЧТО ПРОВЕРИТЬ]
[ТЕСТ-КЕЙСЫ]
[ВОЗМОЖНЫЕ РЕГРЕССИИ]
[ЧТО ВЕРНУТЬ CODER/ARCHITECT]

=== CONTEXT ===
Используй context_snapshot.txt рядом.

=== CODER RESULT ===
<PASTE_CODER_RESULT_HERE>
PROMPT

cat > "$RUN_DIR/README.txt" <<EOF2
RUN_DIR=$RUN_DIR

Порядок:
1. Открыть Supervisor и отправить 01_supervisor_prompt.txt
2. Если Supervisor опять тупит — пропускаем его и идём в Architect с 02_architect_prompt.txt
3. Ответ Architect сохранить в 02_architect_answer.txt
4. Из блока [ЧТО ПЕРЕДАТЬ CODER] собрать 03_coder_prompt.txt
5. Ответ Coder сохранить в 03_coder_answer.txt
6. На его основе собрать 04_tester_prompt.txt
7. Ответ Tester сохранить в 04_tester_answer.txt
8. После этого уже строим apply_patch локально, а не руками в UI
EOF2

echo "created run dir: $RUN_DIR"
find "$RUN_DIR" -maxdepth 1 -type f | sort
