#!/usr/bin/env python3
"""从 index.html 提取各 .opc-view 的 <main> 内容，写入 shared/views/*.html。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
VIEWS = ROOT / "shared" / "views"

VIEW_PATTERN = re.compile(
    r'<div class="opc-view" data-route="(\w+)"[^>]*>\s*(<main\b[\s\S]*?</main>)',
    re.MULTILINE,
)


def main() -> int:
    if not INDEX.is_file():
        print(f"找不到 {INDEX}", file=sys.stderr)
        return 1

    html = INDEX.read_text(encoding="utf-8")
    matches = list(VIEW_PATTERN.finditer(html))
    if not matches:
        print("未在 index.html 中找到 .opc-view 区块", file=sys.stderr)
        return 1

    VIEWS.mkdir(parents=True, exist_ok=True)
    for match in matches:
        route = match.group(1)
        main_html = match.group(2).strip() + "\n"
        out = VIEWS / f"{route}.html"
        out.write_text(main_html, encoding="utf-8", newline="\n")
        print(f"  {route}.html")

    print(f"已同步 {len(matches)} 个视图片段 → {VIEWS.relative_to(ROOT)}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
