"""Shared display strings — the exact sentence templates the frontend renders.

The seed's copies (app/seed/rng.py) are parity-locked; this module is the
engine-side source. Keep them character-identical.
"""

from datetime import date

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def format_money_rs(rs: int) -> str:
    """TS formatMoneyRs: `₹1.90 Cr` at/above ₹1 Cr, else `₹78.0L`."""
    if rs >= 10_000_000:
        return f"₹{rs / 10_000_000:.2f} Cr"
    return f"₹{rs / 100_000:.1f}L"


def compare_sentence(actual: int, median: int, peer_n: int, wtype: str, district: str) -> str:
    return (
        f"{format_money_rs(actual)} vs {format_money_rs(median)} median across "
        f"{peer_n} similar {wtype} works in {district}"
    )


def format_work_date(day: date) -> str:
    """TS `format(date, "d MMM yyyy")` → `15 Oct 2025`."""
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"
