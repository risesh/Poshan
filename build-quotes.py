#!/usr/bin/env python3
"""Generate web/lib/quotes.json from Quotes.txt.

Quotes.txt is the human-editable source (one quote per line:
"Quote text" - Author, curly quotes/em dash or straight ones both fine).
web/app/components/Footer.tsx picks one at random on each page load for the
footer banner.

Run this after editing Quotes.txt so the site stays in sync:

    python3 build-quotes.py
"""
import json
import re
from pathlib import Path

SRC = Path(__file__).parent / "Quotes.txt"
OUT = Path(__file__).parent / "web" / "lib" / "quotes.json"

LINE_RE = re.compile(r'^[“"](.+?)[”"’]+\s*[-–—]\s*(.+?)\s*$')

quotes = []
for lineno, raw in enumerate(SRC.read_text(encoding="utf-8").splitlines(), start=1):
    line = raw.strip()
    if not line:
        continue
    m = LINE_RE.match(line)
    if not m:
        raise SystemExit(f"Quotes.txt:{lineno}: could not parse line: {raw!r}")
    text, author = m.group(1).strip(), m.group(2).strip()
    quotes.append({"text": text, "author": author})

OUT.write_text(json.dumps(quotes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(quotes)} quotes -> {OUT}")
