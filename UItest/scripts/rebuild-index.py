#!/usr/bin/env python3
"""从 shared/views/*.html 重建 index.html 中的 opc-view 区域（修复重复片段污染）。"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
VIEWS = ROOT / "shared" / "views"

ROUTES = [
    "home",
    "model",
    "models",
    "model-library",
    "real",
    "free",
    "gallery",
    "square",
    "square-detail",
    "square-publish",
    "profile",
]

VIEWPORT_OPEN = re.compile(
    r'(<div id="opc-viewport" class="flex-1 w-full min-w-0">\s*)',
    re.MULTILINE,
)
FOOTER_OPEN = re.compile(
    r'\n\s*<nav id="opc-global-bottom-nav"',
    re.MULTILINE,
)


def build_views_block() -> str:
    parts: list[str] = []
    for route in ROUTES:
        view_path = VIEWS / f"{route}.html"
        if not view_path.is_file():
            print(f"  [缺失] {view_path.name}", file=sys.stderr)
            continue
        content = view_path.read_text(encoding="utf-8").strip()
        parts.append(
            f'    <div class="opc-view" data-route="{route}" hidden>\n{content}\n    </div>\n'
        )
    return "\n".join(parts) + "\n"


def main() -> int:
    if not INDEX.is_file():
        print(f"找不到 {INDEX}", file=sys.stderr)
        return 1

    html = INDEX.read_text(encoding="utf-8")
    vp_match = VIEWPORT_OPEN.search(html)
    ft_match = FOOTER_OPEN.search(html)
    if not vp_match or not ft_match:
        print("无法在 index.html 中定位 opc-viewport 或底部导航", file=sys.stderr)
        return 1

    head = html[: vp_match.end()]
    footer = "\n    </div>\n  </div>\n" + html[ft_match.start() :]
    views_block = build_views_block()
    rebuilt = head + views_block + footer

    INDEX.write_text(rebuilt, encoding="utf-8", newline="\n")
    print(f"已重建 index.html（{len(ROUTES)} 个视图片段）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
