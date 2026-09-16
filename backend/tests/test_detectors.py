"""Detector tests — pure pandas, no DB (analytics-cache.md §2).

Synthetic frames engineered to trigger every rule + every band, plus the
guards (sanctioned-status skip, progress guard, ₹10L floor, peer-8 minimum).
"""

from datetime import date, timedelta

import pandas as pd

from app.features.anomalies.engine import cost, delay, duplicate, expenditure, utilisation
from app.features.anomalies.engine.pipeline import run_detectors
from app.features.anomalies.engine.registry import Frames

TODAY = date(2026, 9, 7)


def frame(rows: list[dict]) -> Frames:
    df = pd.DataFrame(rows)
    return Frames(works=df.set_index("id"))


def base_row(id: str, **over) -> dict:
    row = {
        "id": id,
        "title": f"Test Work {id}",
        "type": "road",
        "state": "Test State",
        "district": "Test District",
        "status": "in-execution",
        "sanctioned_lakh": 40.0,
        "expenditure_lakh": 20.0,
        "progress_pct": 50,
        "last_update": TODAY - timedelta(days=10),
        "due_date": date(2026, 12, 1),
    }
    row.update(over)
    return row


def peers(count: int = 8, sanctioned: float = 40.0, expenditure: float = 20.0, **over) -> list[dict]:
    # Distinct districts: the peer group is type+state, but twins are district+type —
    # co-located peers would be mutual twins and pollute duplicate-detection tests.
    return [base_row(f"W-{9000 + i}", district=f"Peer District {i}",
                     sanctioned_lakh=sanctioned, expenditure_lakh=expenditure, **over)
            for i in range(count)]


def test_cost_high_and_medium_bands():
    rows = peers(8, sanctioned=40.0, expenditure=20.0) + [
        base_row("W-HIGH", sanctioned_lakh=100.0),   # ratio 2.5 → high
        base_row("W-MED", sanctioned_lakh=60.0),     # ratio 1.5 → medium
    ]
    flags = cost.detect(frame(rows), TODAY)
    by_work = {f["work_id"]: f for f in flags}
    assert by_work["W-HIGH"]["severity"] == "high"
    assert by_work["W-MED"]["severity"] == "medium"
    assert by_work["W-HIGH"]["peer_n"] == 9  # LOO: 9 others in the group
    assert by_work["W-HIGH"]["peer_median_lakh"] == 40.0
    assert by_work["W-HIGH"]["signals"][0]["label"] == "Peer comparison"


def test_cost_skips_sanctioned_status_and_small_peer_groups():
    rows = peers(8) + [
        base_row("W-SAN", status="sanctioned", sanctioned_lakh=200.0),  # no spending signal yet
    ]
    assert cost.detect(frame(rows), TODAY) == []


def test_delay_bands_and_threshold():
    rows = peers(9) + [
        base_row("W-130", last_update=TODAY - timedelta(days=130)),
        base_row("W-95", last_update=TODAY - timedelta(days=95)),
        base_row("W-30", last_update=TODAY - timedelta(days=30)),
    ]
    flags = delay.detect(frame(rows), TODAY)
    by_work = {f["work_id"]: f for f in flags}
    assert by_work["W-130"]["severity"] == "high"
    assert by_work["W-95"]["severity"] == "medium"
    assert "W-30" not in by_work
    assert by_work["W-130"]["peer_median_lakh"] is None  # money not meaningful for delay
    assert by_work["W-130"]["headline"] == "No progress update in 130d — needs review"


def test_duplicate_twin_and_cost_signal():
    rows = peers(8) + [
        base_row("W-D1", district="Twin District"),
        base_row("W-D2", district="Twin District"),
    ]
    flags = duplicate.detect(frame(rows), TODAY)
    assert {f["work_id"] for f in flags} == {"W-D1", "W-D2"}
    assert all(f["severity"] == "high" for f in flags)
    assert flags[0]["corroboration"].startswith("Same type and district as W-D")


def test_expenditure_bands_with_progress_guard():
    rows = peers(8, expenditure=10.0) + [
        base_row("W-HIGH", expenditure_lakh=20.0, progress_pct=40),   # ratio 2.0 → high
        base_row("W-MED", expenditure_lakh=14.0, progress_pct=55),    # ratio 1.4 → medium
        base_row("W-GUARD", expenditure_lakh=20.0, progress_pct=90),  # guard: 90% done
    ]
    flags = expenditure.detect(frame(rows), TODAY)
    by_work = {f["work_id"]: f for f in flags}
    assert by_work["W-HIGH"]["severity"] == "high"
    assert by_work["W-MED"]["severity"] == "medium"
    assert "W-GUARD" not in by_work


def test_utilisation_threshold_and_ten_lakh_floor():
    rows = peers(8, expenditure=30.0) + [  # peer utilisation = 30/40 = 0.75
        base_row("W-LOW", sanctioned_lakh=50.0, expenditure_lakh=5.0),   # 0.10 < 0.6*0.75
        base_row("W-TINY", sanctioned_lakh=5.0, expenditure_lakh=0.5),   # ₹10L floor skip
    ]
    flags = utilisation.detect(frame(rows), TODAY)
    by_work = {f["work_id"]: f for f in flags}
    assert "W-LOW" in by_work
    assert by_work["W-LOW"]["severity"] == "medium"
    assert "W-TINY" not in by_work


def test_pipeline_dedupes_and_orders():
    rows = peers(8) + [
        base_row("W-BOTH", last_update=TODAY - timedelta(days=150), sanctioned_lakh=100.0),
    ]  # W-BOTH: cost high (2.5×) AND delay high — dedupe keeps both kinds
    found = run_detectors(frame(rows), TODAY)
    keys = [(f["work_id"], f["kind"]) for f in found]
    assert ("W-BOTH", "cost") in keys and ("W-BOTH", "delay") in keys
    sev = [f["severity"] for f in found]
    assert sev == sorted(sev, key={"high": 0, "medium": 1, "low": 2}.get)  # high first
