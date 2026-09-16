"""Versioned lru_cache — TTL + one-call invalidation, no cache library.

Mechanism (analytics-cache.md §4.1): the memo key gains a version component and
a time bucket; `bump_version()` after any mutation makes every entry unreachable
at once (lru_cache then evicts them naturally), and the TTL bucket bounds drift.

Rules:
- Cache **Pydantic models / plain data**, never Pony entities — entities detach
  when their `db_session` closes and a cache hit would raise DetachedObjectError.
- Scope args are part of the key: scoping happens BEFORE caching, so a district
  officer and a ministry officer can never share an entry.
"""

import time
from collections.abc import Callable
from functools import lru_cache, wraps

_version = 1


def current_version() -> int:
    return _version


def bump_version() -> None:
    """Call after any recompute/mutation that changes analytics output."""
    global _version
    _version += 1


def cached(ttl: float = 300, maxsize: int = 128) -> Callable:
    """@cached(ttl=300) — memoize per (version, time-bucket, args)."""

    def deco(fn: Callable):
        @lru_cache(maxsize=maxsize)
        def _versioned(version: int, ts_bucket: int, *args, **kwargs):
            return fn(*args, **kwargs)

        @wraps(fn)
        def wrapper(*args, **kwargs):
            return _versioned(current_version(), int(time.time() // ttl), *args, **kwargs)

        wrapper.bust = _versioned.cache_clear  # belt-and-braces for tests
        return wrapper

    return deco
