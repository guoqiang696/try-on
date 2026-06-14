#!/usr/bin/env python3
"""
patch-index.py — 将 shared/views/*.html 同步到 index.html 中对应的 opc-view 区域

用法:
    python scripts/patch-index.py
"""
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
VIEWS_DIR = BASE / "shared" / "views"
INDEX_PATH = BASE / "index.html"

NEXT_VIEW = re.compile(r'\n\s*<div class="opc-view"\s+data-route="')
NEXT_FOOTER = re.compile(r'\n\s*<nav id="opc-global-bottom-nav"')


def patch_view_into_index(view_path: Path):
    """将单个 view 文件内容插入 index.html 中对应的 opc-view 区域。"""
    route = view_path.stem
    content = view_path.read_text(encoding="utf-8").strip()

    index_html = INDEX_PATH.read_text(encoding="utf-8")

    open_tag_pattern = re.compile(
        rf'(<div\s+class="opc-view"\s+data-route="{re.escape(route)}"\s+hidden>\s*)'
    )
    open_match = open_tag_pattern.search(index_html)
    if not open_match:
        print(f'  [跳过] 未在 index.html 中找到 data-route="{route}" 的 opc-view 区域')
        return

    start = open_match.end()
    next_view = NEXT_VIEW.search(index_html, start)
    next_footer = NEXT_FOOTER.search(index_html, start)
    end_candidates = [m.start() for m in (next_view, next_footer) if m]
    if not end_candidates:
        print(f'  [跳过] 未找到 data-route="{route}" 的结束边界')
        return

    end = min(end_candidates)
    boundary = index_html[end:]

    if NEXT_FOOTER.search(index_html, start):
        closing = "    </div>\n\n    </div>\n  </div>\n\n  "
    else:
        closing = "    </div>\n\n    "

    new_html = index_html[:start] + content + "\n" + closing + boundary.lstrip()
    INDEX_PATH.write_text(new_html, encoding="utf-8")
    print(f'  [已同步] {view_path.name} -> index.html (data-route="{route}")')


def main():
    if not INDEX_PATH.exists():
        print(f"错误：找不到 {INDEX_PATH}")
        sys.exit(1)

    view_files = sorted(VIEWS_DIR.glob("*.html"))
    if not view_files:
        print("没有需要同步的 view 文件")
        return

    print(f"开始同步 {len(view_files)} 个 view 文件到 index.html...\n")
    for view_file in view_files:
        patch_view_into_index(view_file)

    print("\n同步完成。请刷新浏览器查看效果。")


if __name__ == "__main__":
    main()
