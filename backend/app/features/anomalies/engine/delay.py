"""Rule 2 — delay / stall (anomaly-engine.md §Rule 2).

days = today − last_update; high ≥ 120, medium ≥ 90. Independent of status.
The peerN ≥ 8 contract invariant still applies: works in tiny peer groups are
skipped (the check enforces the DB CHECK; see ADR-031 notes).
"""

from app.common.text import format_work_date
from app.features.anomalies.engine.peers import peer_stats
from app.features.anomalies.engine.registry import Frames, MIN_PEERS

REVIEW_THRESHOLD = 90
HIGH_THRESHOLD = 120


def detect(frames: Frames, today) -> list[dict]:
    works = frames.works.join(peer_stats(frames))
    out: list[dict] = []
    for _, row in works.iterrows():
        if row["peer_n"] < MIN_PEERS:
            continue
        days = (today - row["last_update"]).days
        if days < REVIEW_THRESHOLD:
            continue
        severity = "high" if days >= HIGH_THRESHOLD else "medium"
        out.append(
            {
                "work_id": row.name,
                "kind": "delay",
                "severity": severity,
                "headline": f"No progress update in {days}d — needs review",
                "peer_n": int(row["peer_n"]),
                "peer_median_rs": None,
                "actual_rs": None,
                "corroboration": (
                    f"Last field update was {days}d ago against a "
                    f"{format_work_date(row['due_date'])} due date."
                ),
                "signals": [
                    {
                        "label": "Stall duration",
                        "value": f"{days}d without update (review threshold 90d)",
                    },
                    {
                        "label": "Due date",
                        "value": f"{format_work_date(row['due_date'])} at {row['progress_pct']}% progress",
                    },
                ],
                "detector_inputs": {
                    "days": days,
                    "threshold": REVIEW_THRESHOLD if severity == "medium" else HIGH_THRESHOLD,
                },
            }
        )
    return out
