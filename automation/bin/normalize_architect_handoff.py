#!/usr/bin/env python3
from __future__ import annotations

import re
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

bad_patterns = [
    r".*NestJS.*",
    r".*@UseGuards.*",
    r".*JwtAuthGuard.*",
    r".*JwtStrategy.*",
    r".*@nestjs.*",
    r".*PassportStrategy.*",
    r".*AuthGuard.*",
    r".*controllers/auth\.controller\.ts.*",
    r".*auth\.module\.ts.*",
    r".*dto/get-me-response\.dto\.ts.*",
    r".*Swagger.*",
    r".*OpenAPI.*",
    r".*Logger.*NestJS.*",
    r".*src/.*",
]

cleaned: list[str] = []
for line in text.splitlines():
    s = line.strip()
    if not s:
        continue
    if any(re.fullmatch(pattern, s) for pattern in bad_patterns):
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
