#!/usr/bin/env python3
"""Find UI node bounds by text or content-desc substring. Reads UI XML from stdin."""
from __future__ import annotations

import re
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: find-bounds.py NEEDLE", file=sys.stderr)
        return 2
    needle = sys.argv[1]
    xml = sys.stdin.read()
    for attr in ("content-desc", "text"):
        pattern = (
            rf'{attr}="([^"]*{re.escape(needle)}[^"]*)"[^>]*'
            rf'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'
        )
        match = re.search(pattern, xml)
        if match:
            print(
                match.group(2),
                match.group(3),
                match.group(4),
                match.group(5),
                match.group(1),
            )
            return 0
        pattern = (
            rf'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*'
            rf'{attr}="([^"]*{re.escape(needle)}[^"]*)"'
        )
        match = re.search(pattern, xml)
        if match:
            print(
                match.group(1),
                match.group(2),
                match.group(3),
                match.group(4),
                match.group(5),
            )
            return 0
    print("NOTFOUND")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
