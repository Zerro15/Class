#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 4:
    print("usage: build_coder_prompt.py <template.txt> <handoff.txt> <output.txt>", file=sys.stderr)
    sys.exit(2)

template = Path(sys.argv[1]).read_text(encoding="utf-8")
handoff = Path(sys.argv[2]).read_text(encoding="utf-8").strip()
output = Path(sys.argv[3])

result = template.replace("<PASTE_ARCHITECT_HANDOFF_HERE>", handoff)
output.write_text(result + ("\n" if not result.endswith("\n") else ""), encoding="utf-8")
print(output)
