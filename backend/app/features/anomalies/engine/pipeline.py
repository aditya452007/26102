"""The detector pipeline — the ONLY writer of anomalies/anomaly_signals.

run() → load frames → detectors (pure) → dedupe → persist (replace-in-tx) →
bump cache version. A failed detector aborts the whole recompute: no partial
generations, ever (analytics-cache.md §5).
"""

import logging
from datetime import date, datetime, timezone

import pandas as pd
from pony import orm

from app.common.caching import bump_version
from app.common.mathutil import one_decimal
from app.core.db import Activity, Anomaly, AnomalySignal, Work
from app.features.anomalies.engine import (
    cost,
    delay,
    duplicate,
    expenditure,
    utilisation,
)
from app.features.anomalies.engine.registry import DETECTOR_VERSION, DetectorFn, Frames

log = logging.getLogger(__name__)

DETECTORS: list[DetectorFn] = [
    cost.detect,
    delay.detect,
    duplicate.detect,
    expenditure.detect,
    utilisation.detect,
]

SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}


def load_frames() -> Frames:
    with orm.db_session:
        rows = [
            {
                "id": w.id,
                "title": w.title,
                "type": w.type,
                "state": w.state,
                "district": w.district,
                "status": w.status,
                "sanctioned_lakh": float(w.sanctioned_lakh),
                "expenditure_lakh": float(w.expenditure_lakh),
                "progress_pct": w.progress_pct,
                "last_update": w.last_update,
                "due_date": w.due_date,
            }
            for w in Work.select()
        ]
    df = pd.DataFrame(rows)
    if df.empty:
        return Frames(works=pd.DataFrame(columns=[
            "title", "type", "state", "district", "status", "sanctioned_lakh",
            "expenditure_lakh", "progress_pct", "last_update", "due_date",
        ]).set_index(pd.Index([], name="id")))
    return Frames(works=df.set_index("id"))


def run_detectors(frames: Frames, today: date) -> list[dict]:
    """All detectors over shared frames → deduped, ordered detection dicts."""
    found: dict[tuple[str, str], dict] = {}
    for detector in DETECTORS:
        for flag in detector(frames, today):
            key = (flag["work_id"], flag["kind"])  # dedupe: one per (work, kind)
            cur = found.get(key)
            if cur is None or SEVERITY_RANK[flag["severity"]] < SEVERITY_RANK[cur["severity"]]:
                found[key] = flag
    ordered = sorted(
        found.values(),
        key=lambda f: (SEVERITY_RANK[f["severity"]], f["work_id"]),
    )
    return ordered


def persist(found: list[dict], actor: str = "NIRIKSHAN engine") -> int:
    """Replace-in-transaction: delete old generation, insert new, append activity
    for NEW flags (work_id + kind not previously flagged). Returns count."""
    with orm.db_session(serializable=True):
        previous = {(a.work.id, a.kind) for a in Anomaly.select()}
        orm.delete(s for s in AnomalySignal)
        orm.delete(a for a in Anomaly)
        for index, flag in enumerate(found):
            work = Work[flag["work_id"]]
            anomaly = Anomaly(
                id=f"A-{index + 1}",
                work=work,
                kind=flag["kind"],
                severity=flag["severity"],
                headline=flag["headline"],
                peer_n=flag["peer_n"],
                peer_median_lakh=(
                    None if flag["peer_median_lakh"] is None
                    else one_decimal(flag["peer_median_lakh"])
                ),
                actual_lakh=(
                    None if flag["actual_lakh"] is None else one_decimal(flag["actual_lakh"])
                ),
                unit="₹L",
                corroboration=flag["corroboration"],
                detector_version=DETECTOR_VERSION,
                detector_inputs=flag["detector_inputs"],
            )
            for pos, s in enumerate(flag["signals"]):
                AnomalySignal(anomaly=anomaly, label=s["label"], value=s["value"], position=pos)
            if (flag["work_id"], flag["kind"]) not in previous:
                Activity(
                    work=work,
                    at=datetime.now(timezone.utc),
                    actor=actor,
                    action="Flag raised — needs review",
                    note=flag["headline"],
                )
        return len(found)


def run(today: date) -> dict:
    """Full recompute; returns the PipelineReport for /detectors/recompute."""
    import time as _time

    started = _time.perf_counter()
    frames = load_frames()
    found = run_detectors(frames, today)
    count = persist(found)
    bump_version()
    report = {
        "detectorVersion": DETECTOR_VERSION,
        "anomaliesCreated": count,
        "perDetector": {
            fn.__module__.rsplit(".", 1)[-1]: len(fn(frames, today))
            for fn in DETECTORS
        },
        "durationMs": round((_time.perf_counter() - started) * 1000, 1),
    }
    log.info("detector recompute: %s", report)
    return report
