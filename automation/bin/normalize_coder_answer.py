#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 3:
    print(
        "usage: normalize_coder_answer.py <coder_answer.txt> <normalized_coder_answer.txt>",
        file=sys.stderr,
    )
    sys.exit(2)

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

text = src.read_text(encoding="utf-8")

bad_tokens = [
    "NestJS",
    "@UseGuards",
    "JwtAuthGuard",
    "JwtStrategy",
    "@nestjs",
    "PassportStrategy",
    "AuthGuard",
    "controllers/auth.controller.ts",
    "auth.module.ts",
    "dto/get-me-response.dto.ts",
    "GetMeResponseDto",
]

cleaned: list[str] = []
for raw_line in text.splitlines():
    line = raw_line.strip()
    if not line:
        cleaned.append("")
        continue
    if any(token in line for token in bad_tokens):
        continue
    cleaned.append(raw_line.rstrip())

# убрать хвостовые пустые строки
while cleaned and cleaned[-1] == "":
    cleaned.pop()

if not cleaned:
    cleaned = [
        "[ЧТО СДЕЛАТЬ]",
        "Проверить и описать реальные изменения только для FastAPI-проекта.",
        "",
        "[ИЗМЕНЕНИЯ ПО ФАЙЛАМ]",
        "backend/app/api/v1/auth.py",
        "backend/app/api/deps.py",
        "backend/app/core/security.py",
        "backend/app/schemas/auth.py",
        "backend/tests/test_auth.py",
        "",
        "[PATCH PLAN]",
        "Сфокусироваться на get_current_user, /auth/me и auth-тестах.",
        "",
        "[ЧТО ПРОВЕРИТЬ]",
        "auth/me success/401 cases и смежные тесты.",
        "",
        "[РИСКИ И ОГРАНИЧЕНИЯ]",
        "Не менять стек и не придумывать несуществующие слои.",
    ]

dst.write_text("\n".join(cleaned) + "\n", encoding="utf-8")
print(dst)
