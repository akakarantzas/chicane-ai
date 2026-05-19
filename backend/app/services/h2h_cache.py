import os
import time
from dataclasses import dataclass
from typing import Callable

DEFAULT_H2H_CACHE_TTL_SECONDS = 6 * 60 * 60


@dataclass
class CacheEntry:
    rows: list[dict]
    loaded_at: float


_season_cache: dict[int, CacheEntry] = {}


def get_h2h_cache_ttl_seconds() -> int:
    try:
        ttl = int(os.getenv("H2H_CACHE_TTL_SECONDS", ""))
    except ValueError:
        return DEFAULT_H2H_CACHE_TTL_SECONDS

    if ttl <= 0:
        return DEFAULT_H2H_CACHE_TTL_SECONDS
    return ttl


def clear_h2h_cache() -> None:
    _season_cache.clear()


def get_cached_season_results(
    year: int,
    loader: Callable[..., list[dict]],
    *,
    strict: bool = True,
) -> list[dict]:
    now = time.monotonic()
    ttl = get_h2h_cache_ttl_seconds()
    entry = _season_cache.get(year)

    if entry and now - entry.loaded_at < ttl:
        return list(entry.rows)

    rows = loader(year, strict=strict)
    if rows:
        _season_cache[year] = CacheEntry(rows=list(rows), loaded_at=now)
    return rows
