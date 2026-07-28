#!/usr/bin/env python3
"""List clickable UI nodes from a uiautomator XML file."""
from __future__ import annotations

import re
import sys
from pathlib import Path


def main() -> int:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "/dev/stdin")
    xml = path.read_text(encoding="utf-8", errors="replace")
    seen: set[str] = set()
    patterns = [
        r'clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*content-desc="([^"]*)"[^>]*text="([^"]*)"',
        r'clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*text="([^"]*)"[^>]*content-desc="([^"]*)"',
        r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*clickable="true"[^>]*content-desc="([^"]*)"[^>]*text="([^"]*)"',
        r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*clickable="true"[^>]*text="([^"]*)"[^>]*content-desc="([^"]*)"',
        r'clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*content-desc="([^"]*)"',
        r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*clickable="true"[^>]*content-desc="([^"]*)"',
        r'clickable="true"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*text="([^"]*)"',
        r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*clickable="true"[^>]*text="([^"]*)"',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, xml):
            groups = match.groups()
            key = ",".join(groups[:4])
            if key in seen:
                continue
            seen.add(key)
            labels = " | ".join(g for g in groups[4:] if g)
            print(f"{groups[0]} {groups[1]} {groups[2]} {groups[3]} :: {labels}")

    print("--- small top-right candidates ---")
    for match in re.finditer(
        r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',
        xml,
    ):
        x1, y1, x2, y2 = map(int, match.groups())
        if x1 >= 880 and 900 <= y1 <= 1700 and (x2 - x1) <= 160 and (y2 - y1) <= 160:
            start = max(0, match.start() - 80)
            chunk = xml[start : match.end() + 80].replace("\n", " ")
            print(f"{x1} {y1} {x2} {y2} :: {chunk[:160]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
