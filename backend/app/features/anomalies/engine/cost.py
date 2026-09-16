"""Rule 1 — cost outlier (anomaly-engine.md §Rule 1).

ratio = sanctioned / median(peer sanctioned); high ≥ 2.0, medium ≥ 1.4.
Trigger: not `sanctioned` status (no spending signal yet) AND peer_n ≥ 8.
"""

import pandas as pd

from app.common.mathutil import one_decimal
from app.common.text import compare_sentence
from app.features.anomalies.engine.peers import peer_stats
from app.features.anomalies.engine.registry import Frames, MIN_PEERS

HEADLINE = "Sanctioned cost above peer median — needs review"
CORROBORATION = (
    "Single-estimate sanction with limited comparative quotes corroborates the variance."
)


def detect(frames: Frames, today) -> list[dict]:
    works = frames.works
    stats = peer_stats(frames)
    j = works.join(stats)
    eligible = j[(j["status"] != "sanctioned") & (j["peer_n"] >= MIN_PEERS)].copy()
    eligible["ratio"] = eligible["sanctioned_lakh"] / eligible["median_sanctioned"]
    flagged = eligible[eligible["ratio"] >= 1.4]

    out: list[dict] = []
    for _, row in flagged.iterrows():
        severity = "high" if row["ratio"] >= 2.0 else "medium"
        peer_median = one_decimal(row["median_sanctioned"])
        out.append(
            {
                "work_id": row.name,
                "kind": "cost",
                "severity": severity,
                "headline": HEADLINE,
                "peer_n": int(row["peer_n"]),
                "peer_median_lakh": peer_median,
                "actual_lakh": float(row["sanctioned_lakh"]),
                "corroboration": CORROBORATION,
                "signals": [
                    {
                        "label": "Peer comparison",
                        "value": compare_sentence(
                            float(row["sanctioned_lakh"]), peer_median,
                            int(row["peer_n"]), row["type"], row["district"],
                        ),
                    },
                    {"label": "Corroborating signal", "value": "Estimate variance beyond peer band"},
                ],
                "detector_inputs": {
                    "ratio": round(float(row["ratio"]), 3),
                    "peer_median": peer_median,
                    "peer_n": int(row["peer_n"]),
                    "threshold": 1.4 if severity == "medium" else 2.0,
                },
            }
        )
    return out
