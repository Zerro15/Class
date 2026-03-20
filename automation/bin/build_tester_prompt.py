#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

if len(sys.argv) != 4:
    print("usage: build_tester_prompt.py <template.txt> <coder_answer.txt> <output.txt>", file=sys.stderr)
    sys.exit(2)

template = Path(sys.argv[1]).read_text(encoding="utf-8")
coder_answer = Path(sys.argv[2]).read_text(encoding="utf-8").strip()
output = Path(sys.argv[3])

result = template.replace("<PASTE_CODER_RESULT_HERE>", coder_answer)
output.write_text(result + ("\n" if not result.endswith("\n") else ""), encoding="utf-8")
print(output)
