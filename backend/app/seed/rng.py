"""Deterministic RNG utilities — byte-identical port of mplads-mock.ts helpers.

Cardinal rule (seed-generator.md): every draw is load-bearing; call order within
a stream defines the dataset. Test vectors in tests/test_seed_parity.py guard
this module against drift.
"""

import math
from collections.abc import Callable, Iterable
from datetime import date
from typing import TypeVar

_MASK32 = 0xFFFFFFFF

T = TypeVar("T")


def mulberry32(seed: int) -> Callable[[], float]:
    """Byte-identical port of mulberry32 (mplads-mock.ts). Seed is uint32."""
    a = seed & _MASK32

    def rng() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & _MASK32
        t = ((a ^ (a >> 15)) * (1 | a)) & _MASK32
        t = (((t + (((t ^ (t >> 7)) * (61 | t)) & _MASK32)) & _MASK32) ^ t) & _MASK32
        return ((t ^ (t >> 14)) & _MASK32) / 4294967296.0

    return rng


def rand_int(rng: Callable[[], float], lo: int, hi: int) -> int:
    """TS `int(rng, min, max)` = min + floor(rng() * (max - min + 1))."""
    return lo + math.floor(rng() * (hi - lo + 1))


def one_decimal(value: float) -> float:
    """TS `Math.round(x * 10) / 10` — half-up, NOT Python's banker's round().

    All seed values are non-negative, so floor(x*10 + 0.5)/10 is exact.
    """
    return math.floor(value * 10 + 0.5) / 10


def shuffled(rng: Callable[[], float], items: Iterable[T]) -> list[T]:
    """TS Fisher-Yates `shuffled` — copy, i from len-1 down to 1, j = floor(rng*(i+1)).

    Never `random.shuffle` — different algorithm, different draws.
    """
    copy = list(items)
    for i in range(len(copy) - 1, 0, -1):
        j = math.floor(rng() * (i + 1))
        copy[i], copy[j] = copy[j], copy[i]
    return copy


MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def format_work_date(day: date) -> str:
    """TS `format(date, "d MMM yyyy")` → `15 Oct 2025` (locale-independent)."""
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"
