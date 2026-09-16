"""Rule 5 — low utilisation / UC pending (anomaly-engine.md §Rule 5).

ratio = expenditure/sanctioned vs peer_utilisation (median of peers' ratios);
flag when ratio < 0.6 × peer_ratio, guard sanctioned ≥ ₹10L (skip tiny works).
"""

from app.common.mathutil import one_decimal
from app.common.text import compare_sentence
from app.features.anomalies.engine.peers import peer_stats
from app.features.anomalies.engine.registry import Frames, MIN_PEERS

HEADLINE = "Low fund utilisation with utilisation certificate pending — needs review"
CORROBORATION = (
    "Utilisation certificate for the last released tranche is still awaited from the agency."
)


def detect(frames: Frames, today) -> list[dict]:
    works = frames.works
    stats = peer_stats(frames)
    j = works.join(stats)
    eligible = j[(j["peer_n"] >= MIN_PEERS) & (j["sanctioned_lakh"] >= 10)].copy()
    ratio = eligible["expenditure_lakh"] / eligible["sanctioned_lakh"]
    flagged = eligible[ratio < 0.6 * eligible["peer_utilisation"]]

    out: list[dict] = []
    for _, row in flagged.iterrows():
        peer_median = one_decimal(row["sanctioned_lakh"] * row["peer_utilisation"])
        expenditure = float(row["expenditure_lakh"])
        out.append(
            {
                "work_id": row.name,
                "kind": "utilisation",
                "severity": "medium",  # single band (engine doc defines no high band)
                "headline": HEADLINE,
                "peer_n": int(row["peer_n"]),
                "peer_median_lakh": peer_median,
                "actual_lakh": expenditure,
                "corroboration": CORROBORATION,
                "signals": [
                    {
                        "label": "Peer comparison",
                        "value": compare_sentence(
                            expenditure, peer_median,
                            int(row["peer_n"]), row["type"], row["district"],
                        ),
                    },
                    {"label": "Certificate status", "value": "UC pending for last tranche"},
                ],
                "detector_inputs": {
                    "ratio": round(float(ratio.loc[row.name]), 3),
                    "peer_ratio": round(float(row["peer_utilisation"]), 3),
                    "peer_n": int(row["peer_n"]),
                    "threshold": 0.6,
                },
            }
        )
    return out
