#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 3:
    print(
        "usage: normalize_architect_handoff.py <raw_handoff.txt> <normalized_handoff.txt>",
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
    "Swagger",
    "OpenAPI",
    "ApiBearerAuth",
    "ApiResponse",
    "ApiOperation",
    "src/",
]

cleaned: list[str] = []
for line in text.splitlines():
    s = line.strip()
    if not s:
        continue
    if any(token in s for token in bad_tokens):
        continue
    cleaned.append(s)

if not cleaned:
    cleaned = [
        "- Проверить реальную FastAPI-реализацию /api/v1/auth/me и get_current_user.",
        "- Усилить валидацию JWT без смены стека и без выдуманных guard.",
        "- Добавить или уточнить тесты на auth/me и некорректные токены.",
    ]

dst.write_text("\n".join(cleaned) + "\n", encoding="utf-8")
print(dst)
