#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <run_dir>" >&2
  exit 2
fi

RUN_DIR="$1"

ARCH_ANSWER="$RUN_DIR/02_architect_answer.txt"
RAW_HANDOFF="$RUN_DIR/02_architect_handoff_raw.txt"
SANITIZED_HANDOFF="$RUN_DIR/02_architect_handoff_sanitized.txt"
NORM_HANDOFF="$RUN_DIR/02_architect_handoff_normalized.txt"
CODER_TEMPLATE="$RUN_DIR/03_coder_prompt_template.txt"
CODER_PROMPT="$RUN_DIR/03_coder_prompt.txt"

test -f "$ARCH_ANSWER"
test -f "$CODER_TEMPLATE"

python3 automation/bin/extract_architect_handoff.py "$ARCH_ANSWER" "$RAW_HANDOFF"
python3 automation/bin/normalize_architect_handoff.py "$RAW_HANDOFF" "$SANITIZED_HANDOFF"

cat > "$NORM_HANDOFF" <<'PROMPT'
Реализуй задачу по авторизации в реальном проекте ClassFlow на FastAPI.

Работай только по существующим файлам проекта:
- backend/app/api/v1/auth.py
- backend/app/api/deps.py
- backend/app/core/security.py
- backend/app/schemas/auth.py
- backend/tests/test_auth.py
- при необходимости backend/app/main.py

Что нужно сделать:
1. Проверить и при необходимости усилить зависимость get_current_user в backend/app/api/deps.py:
   - без токена -> 401
   - с битым/невалидным токеном -> 401
   - с токеном без sub -> 401
   - с токеном на несуществующего пользователя -> 401
   - с токеном, где sub не приводится к int -> 401
2. Оставить /api/v1/auth/me закрытым только через Depends(get_current_user), без выдуманных guard и без смены стека.
3. Проверить, что /api/v1/auth/me возвращает только безопасные поля из UserOut.
4. Не ломать существующие login/register и текущие тесты.
5. Добавить/уточнить тесты в backend/tests/test_auth.py:
   - register/login success
   - /auth/me success
   - /auth/me без токена -> 401
   - /auth/me с невалидным токеном -> 401
   - /auth/me с токеном без sub -> 401
6. Не придумывать новые слои, которых нет в проекте.
7. Если отдельной Swagger-интеграции сейчас нет, не раздувать задачу — максимум отметить ограничение.

Ниже очищенный handoff от Architect. Используй его только как дополнительный сигнал, если он не противоречит реальному FastAPI-контексту.

=== SANITIZED ARCHITECT HANDOFF ===
PROMPT

cat "$SANITIZED_HANDOFF" >> "$NORM_HANDOFF"

cat >> "$NORM_HANDOFF" <<'PROMPT'

Формат ответа:
[ЧТО СДЕЛАТЬ]
[ИЗМЕНЕНИЯ ПО ФАЙЛАМ]
[PATCH PLAN]
[ЧТО ПРОВЕРИТЬ]
[РИСКИ И ОГРАНИЧЕНИЯ]
PROMPT

python3 automation/bin/build_coder_prompt.py "$CODER_TEMPLATE" "$NORM_HANDOFF" "$CODER_PROMPT"

echo "ready:"
printf '  %s\n' \
  "$RAW_HANDOFF" \
  "$SANITIZED_HANDOFF" \
  "$NORM_HANDOFF" \
  "$CODER_PROMPT"
echo
sed -n '1,260p' "$CODER_PROMPT"
