"""Money/rounding helpers shared by seed, detectors, and read models.

All money rounding is TS-parity half-up (never Python's banker's round()).
"""

import math
from collections.abc import Iterable, Sequence
from datetime import date
from statistics import median as _py_median


def one_decimal(value: float) -> float:
    """TS `Math.round(x * 10) / 10` — half-up; all values here are non-negative."""
    return math.floor(value * 10 + 0.5) / 10


def round_10k(value: float) -> int:
    """Rupee mirror of one_decimal: nearest ₹10k, half-up (TS `Math.round(x/10000)*10000`).

    Money medians are stored at ₹10k precision — the rupee equivalent of the old
    0.1L rounding, so detector peer numbers stay stable and readable.
    """
    return int(math.floor(value / 10000 + 0.5) * 10000)


def median(values: Iterable[float]) -> float:
    """Median of a non-empty sequence (callers guarantee non-emptiness)."""
    seq: Sequence[float] = list(values)
    return float(_py_median(seq))


def stall_days(last_update: date, today: date) -> int:
    return (today - last_update).days
