"""Rule 4 — expenditure pattern (anomaly-engine.md §Rule 4).

ratio = expenditure / median(peer expenditure); high ≥ 1.6, medium ≥ 1.2.
Guard: progress_pct ≤ 60 (spending fast while physically behind is the
suspicious pattern; a 95%-done work naturally has high cumulative spend).
"""

import pandas as pd

from app.common.mathutil import one_decimal
from app.common.text import compare_sentence, format_lakh
from app.features.anomalies.engine.peers import peer_stats
from app.features.anomalies.engine.registry import Frames, MIN_PEERS

HEADLINE = "Front-loaded spending pattern — needs review"


def detect(frames: Frames, today) -> list[dict]:
    works = frames.works
    stats = peer_stats(frames)
    j = works.join(stats)
    eligible = j[(j["peer_n"] >= MIN_PEERS) & (j["progress_pct"] <= 60)].copy()
    eligible["ratio"] = eligible["expenditure_lakh"] / eligible["median_expenditure"]
    flagged = eligible[eligible["ratio"] >= 1.2]

    out: list[dict] = []
    for _, row in flagged.iterrows():
        severity = "high" if row["ratio"] >= 1.6 else "medium"
        peer_median = one_decimal(row["median_expenditure"])
        expenditure = float(row["expenditure_lakh"])
        out.append(
            {
                "work_id": row.name,
                "kind": "expenditure",
                "severity": severity,
                "headline": HEADLINE,
                "peer_n": int(row["peer_n"]),
                "peer_median_lakh": peer_median,
                "actual_lakh": expenditure,
                "corroboration": (
                    f"Released {format_lakh(expenditure)} against "
                    f"{int(row['progress_pct'])}% physical progress."
                ),
                "signals": [
                    {
                        "label": "Peer comparison",
                        "value": compare_sentence(
                            expenditure, peer_median,
                            int(row["peer_n"]), row["type"], row["district"],
                        ),
                    },
                    {
                        "label": "Progress vs spend",
                        "value": f"{int(row['progress_pct'])}% progress at {format_lakh(expenditure)} released",
                    },
                ],
                "detector_inputs": {
                    "ratio": round(float(row["ratio"]), 3),
                    "peer_median": peer_median,
                    "peer_n": int(row["peer_n"]),
                    "progress_guard": int(row["progress_pct"]),
                    "threshold": 1.2 if severity == "medium" else 1.6,
                },
            }
        )
    return out
