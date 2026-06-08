#!/usr/bin/env python3
"""Internal link + CTA validation for creativekidsdigit.github.io.

Checks:
  1. Every internal href resolves to an existing file (or in-page anchor that exists).
  2. No remaining dead `href="#"` button-class CTAs.
  3. Every Payhip URL matches the canonical allow-list.

Run:  python3 scripts/validate_links.py
Exits 0 on PASS, 1 on FAIL.
"""

import html
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent

# Canonical Payhip URLs (the only ones that should appear in CTAs)
PAYHIP_ALLOW = {
    "https://payhip.com/creativekidsdigit",
    "https://payhip.com/b/i2x1W",
    "https://payhip.com/b/iCIH8",
}

A_TAG = re.compile(r"<a\b[^>]*\shref\s*=\s*\"([^\"]+)\"[^>]*>", re.IGNORECASE)
CLASS_RE = re.compile(r"\sclass\s*=\s*\"([^\"]*)\"", re.IGNORECASE)
ID_RE = re.compile(r'\sid\s*=\s*"([^"]+)"', re.IGNORECASE)
NAME_RE = re.compile(r'\sname\s*=\s*"([^"]+)"', re.IGNORECASE)

HTML_FILES = sorted(p for p in ROOT.rglob("*.html") if ".git" not in p.parts)

errors = []
warnings = []
totals = {
    "files": 0, "anchors": 0, "internal_ok": 0, "external_ok": 0,
    "dead_hash": 0, "broken_internal": 0, "non_canonical_payhip": 0,
}

id_cache: dict = {}


def get_ids(path: Path) -> set:
    if path not in id_cache:
        text = path.read_text(encoding="utf-8", errors="ignore")
        ids = set(ID_RE.findall(text))
        ids.update(NAME_RE.findall(text))
        id_cache[path] = ids
    return id_cache[path]


for html_file in HTML_FILES:
    totals["files"] += 1
    rel = html_file.relative_to(ROOT)
    text = html_file.read_text(encoding="utf-8", errors="ignore")
    file_ids = get_ids(html_file)

    for m in A_TAG.finditer(text):
        href_raw = html.unescape(m.group(1).strip())
        totals["anchors"] += 1
        full_tag = m.group(0)
        cls_match = CLASS_RE.search(full_tag)
        classes = cls_match.group(1) if cls_match else ""
        is_button = "btn" in classes

        if href_raw.startswith(("mailto:", "tel:", "javascript:", "data:")):
            totals["external_ok"] += 1
            continue

        if href_raw.startswith(("http://", "https://")):
            if "payhip.com" in href_raw:
                clean = href_raw.rstrip(").,;")
                if clean not in PAYHIP_ALLOW:
                    totals["non_canonical_payhip"] += 1
                    errors.append(f"[NON-CANONICAL PAYHIP] {rel}: {href_raw}")
                else:
                    totals["external_ok"] += 1
            else:
                totals["external_ok"] += 1
            continue

        if href_raw.startswith("#"):
            anchor = href_raw[1:]
            if anchor == "":
                totals["dead_hash"] += 1
                if is_button:
                    errors.append(f'[DEAD CTA href="#"] {rel}: classes={classes!r}')
                else:
                    warnings.append(f'[empty #] {rel}: classes={classes!r}')
            elif anchor not in file_ids:
                totals["broken_internal"] += 1
                errors.append(f"[BROKEN ANCHOR] {rel}: #{anchor}")
            else:
                totals["internal_ok"] += 1
            continue

        split = urlsplit(href_raw)
        target_path = unquote(split.path)
        fragment = split.fragment

        if target_path.startswith("/"):
            resolved = ROOT / target_path.lstrip("/")
        else:
            resolved = (html_file.parent / target_path).resolve()

        if target_path.endswith("/") or target_path == "":
            resolved = resolved / "index.html"

        if not resolved.exists():
            totals["broken_internal"] += 1
            errors.append(
                f"[BROKEN INTERNAL] {rel}: href={href_raw!r} -> {resolved}"
            )
            continue

        if fragment and resolved.suffix.lower() in {".html", ".htm"}:
            target_ids = get_ids(resolved)
            if fragment not in target_ids:
                totals["broken_internal"] += 1
                errors.append(
                    f"[BROKEN FRAGMENT] {rel}: href={href_raw!r} "
                    f"(#{fragment} not found in {resolved.relative_to(ROOT)})"
                )
                continue

        totals["internal_ok"] += 1


print("=" * 70)
print("LINK VALIDATION REPORT")
print("=" * 70)
print(f"Scanned: {totals['files']} HTML files")
print(f"Total anchors: {totals['anchors']}")
print(f"  Internal OK: {totals['internal_ok']}")
print(f"  External OK: {totals['external_ok']}")
print(f"  Dead href=\"#\": {totals['dead_hash']}")
print(f"  Broken internal: {totals['broken_internal']}")
print(f"  Non-canonical Payhip: {totals['non_canonical_payhip']}")
print()

if errors:
    print(f"ERRORS ({len(errors)}):")
    for e in errors:
        print(f"  {e}")
    print()

if warnings:
    print(f"WARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"  {w}")
    print()

if errors:
    print(f"FAIL - {len(errors)} error(s) above.")
    sys.exit(1)
else:
    print("PASS - no broken links, no dead CTAs, all Payhip URLs canonical.")
    sys.exit(0)
