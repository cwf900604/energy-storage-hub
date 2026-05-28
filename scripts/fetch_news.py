#!/usr/bin/env python3
"""Fetch energy storage news from RSS feeds and output JSON."""

import json
import sys
import hashlib
from datetime import datetime, timezone
from pathlib import Path

import feedparser
import requests

# ── RSS Sources ──────────────────────────────────────────────────────
SOURCES = [
    {
        "name": "Energy Storage News",
        "url": "https://www.energy-storage.news/feed/",
        "lang": "en",
        "filter": None,
    },
    {
        "name": "PV Magazine",
        "url": "https://www.pv-magazine.com/feed/",
        "lang": "en",
        "filter": ["storage", "battery", "bess", "energy storage"],
    },
    {
        "name": "CleanTechnica",
        "url": "https://cleantechnica.com/feed/",
        "lang": "en",
        "filter": ["storage", "battery", "bess", "energy storage", "lithium", "grid"],
    },
    {
        "name": "Utility Dive — Energy Storage",
        "url": "https://www.utilitydive.com/feeds/news/",
        "lang": "en",
        "filter": ["storage", "battery", "bess"],
    },
]

REQUEST_TIMEOUT = 15
MAX_SUMMARY_LEN = 300
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
OUTPUT_FILE = DATA_DIR / "news.json"


def matches_filter(title: str, summary: str, keywords: list[str] | None) -> bool:
    """If keywords provided, entry must contain at least one of them."""
    if not keywords:
        return True
    text = (title + " " + summary).lower()
    return any(kw in text for kw in keywords)


def clean_summary(text: str) -> str:
    """Strip HTML tags and truncate."""
    import re
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:MAX_SUMMARY_LEN] + ("…" if len(text) > MAX_SUMMARY_LEN else "")


def parse_date(entry) -> str:
    """Extract ISO-format date from a feed entry."""
    for field in ("published_parsed", "updated_parsed"):
        t = entry.get(field)
        if t:
            try:
                dt = datetime(*t[:6], tzinfo=timezone.utc)
                return dt.isoformat()
            except Exception:
                continue
    # fallback
    for key in ("published", "updated"):
        val = entry.get(key)
        if val:
            return val
    return datetime.now(timezone.utc).isoformat()


def fetch_source(src: dict) -> list[dict]:
    """Fetch and parse a single RSS source. Returns list of news items."""
    items = []
    print(f"  Fetching {src['name']} ({src['url']}) ...", end=" ")
    try:
        resp = requests.get(src["url"], timeout=REQUEST_TIMEOUT, headers={
            "User-Agent": "EnergyHubBot/1.0 (+https://github.com/cwf900604/energy-storage-hub)"
        })
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
        if feed.bozo and not feed.entries:
            print(f"parse error: {feed.bozo_exception}")
            return items

        for entry in feed.entries:
            title = entry.get("title", "").strip()
            link = entry.get("link", "").strip()
            published = parse_date(entry)
            summary = entry.get("summary", "") or entry.get("description", "")
            summary = clean_summary(summary)

            # ── mandatory field check ──
            if not title or not link:
                continue
            if not link.startswith("http"):
                continue
            if not matches_filter(title, summary, src.get("filter")):
                continue

            items.append({
                "id": hashlib.md5(link.encode()).hexdigest()[:12],
                "title": title,
                "url": link,
                "published": published,
                "source": src["name"],
                "lang": src["lang"],
                "summary": summary,
            })
        print(f"{len(items)} items")
    except requests.RequestException as e:
        print(f"HTTP error: {e}")
    except Exception as e:
        print(f"error: {e}")
    return items


def load_existing() -> dict[str, dict]:
    """Load existing news.json keyed by url."""
    existing = {}
    if OUTPUT_FILE.exists():
        try:
            data = json.loads(OUTPUT_FILE.read_text(encoding="utf-8"))
            for item in data.get("items", []):
                existing[item["url"]] = item
        except (json.JSONDecodeError, KeyError):
            pass
    return existing


def main() -> int:
    print("=" * 60)
    print(f"Energy Storage News Fetcher — {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    existing = load_existing()
    print(f"  Loaded {len(existing)} existing items from news.json")

    all_new = 0
    skipped_dup = 0

    for src in SOURCES:
        new_items = fetch_source(src)
        for item in new_items:
            if item["url"] not in existing:
                existing[item["url"]] = item
                all_new += 1
            else:
                skipped_dup += 1

    merged = sorted(existing.values(), key=lambda x: x.get("published", ""), reverse=True)
    print(f"\n  Total items in index: {len(merged)}")
    print(f"  New this run: {all_new}")
    print(f"  Duplicates skipped: {skipped_dup}")

    output = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "count": len(merged),
        "items": merged,
    }
    OUTPUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  Wrote {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
