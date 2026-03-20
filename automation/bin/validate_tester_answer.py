#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

REQUIRED_HEADERS = [
    "[ВЕРДИКТ]",
    "[ЧТО ПРОВЕРИТЬ]",
    "[ТЕСТ-КЕЙСЫ]",
    "[ВОЗМОЖНЫЕ РЕГРЕССИИ]",
    "[ЧТО ВЕРНУТЬ CODER/ARCHITECT]",
]

FORBIDDEN_SNIPPETS = [
    "Ниже результат Coder и реальный context snapshot.",
    "Верни строго блоки:",
    "=== CONTEXT ===",
    "=== CODER RESULT ===",
    "...вставь настоящий ответ Tester...",
]

if len(sys.argv) != 2:
    print("usage: validate_tester_answer.py <tester_answer.txt>", file=sys.stderr)
    sys.exit(2)

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
stripped = text.strip()

if not stripped:
    print("INVALID")
    print(f"file: {path}")
    print("reason: empty file")
    sys.exit(1)

if stripped.startswith("<") and stripped.endswith(">"):
    print("INVALID")
    print(f"file: {path}")
    print("reason: looks like wrapped prompt/template, not an answer")
    sys.exit(1)

first_nonempty = next((line.strip() for line in text.splitlines() if line.strip()), "")
if first_nonempty != "[ВЕРДИКТ]":
    print("INVALID")
    print(f"file: {path}")
    print(f"reason: first non-empty line must be [ВЕРДИКТ], got: {first_nonempty!r}")
    sys.exit(1)

missing = [h for h in REQUIRED_HEADERS if re.search(rf"(?m)^{re.escape(h)}\s*$", text) is None]
if missing:
    print("INVALID")
    print(f"file: {path}")
    print("missing headers:")
    for h in missing:
        print(f"  {h}")
    sys.exit(1)

found_forbidden = [s for s in FORBIDDEN_SNIPPETS if s in text]
if found_forbidden:
    print("INVALID")
    print(f"file: {path}")
    print("reason: contains prompt/template markers")
    for s in found_forbidden:
        print(f"  {s}")
    sys.exit(1)

for line in text.splitlines():
    s = line.strip()
    if s == "..." or s.startswith("...") or s.endswith("..."):
        print("INVALID")
        print(f"file: {path}")
        print(f"reason: placeholder content detected: {s!r}")
        sys.exit(1)

sections = {}
for i, header in enumerate(REQUIRED_HEADERS):
    start = re.search(rf"(?m)^{re.escape(header)}\s*$", text)
    if start is None:
        continue
    start_idx = start.end()
    end_idx = len(text)
    for next_header in REQUIRED_HEADERS[i + 1:]:
        nxt = re.search(rf"(?m)^{re.escape(next_header)}\s*$", text[start_idx:])
        if nxt is not None:
            end_idx = start_idx + nxt.start()
            break
    body = text[start_idx:end_idx].strip()
    sections[header] = body

for header, body in sections.items():
    if not body:
        print("INVALID")
        print(f"file: {path}")
        print(f"reason: empty section body for {header}")
        sys.exit(1)
    if body in {"...", "…"}:
        print("INVALID")
        print(f"file: {path}")
        print(f"reason: placeholder-only section body for {header}")
        sys.exit(1)

print("VALID")
print(path)
