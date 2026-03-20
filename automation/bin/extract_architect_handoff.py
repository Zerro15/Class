#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path

if len(sys.argv) != 3:
    print("usage: extract_architect_handoff.py <architect_answer.txt> <output.txt>", file=sys.stderr)
    sys.exit(2)

src = Path(sys.argv[1])
dst = Path(sys.argv[2])

text = src.read_text(encoding="utf-8")

pattern = re.compile(
    r"^\[ЧТО ПЕРЕДАТЬ CODER\]\s*(.*?)(?=^\[[^\n]+\]|\Z)",
    re.DOTALL | re.MULTILINE,
)
m = pattern.search(text)
if not m:
    print("Could not find [ЧТО ПЕРЕДАТЬ CODER] block", file=sys.stderr)
    sys.exit(1)

handoff = m.group(1).strip()
dst.write_text(handoff + "\n", encoding="utf-8")
print(dst)
