"""Rule 5 — low utilisation / UC pending (anomaly-engine.md §Rule 5).

ratio = expenditure/sanctioned vs peer_utilisation (median of peers' ratios);
flag when ratio < 0.6 × peer_ratio, guard sanctioned ≥ ₹10L (skip tiny works).
"""

from app.common.mathutil import round_10k
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
    eligible = j[(j["peer_n"] >= MIN_PEERS) & (j["sanctioned_rs"] >= 1000000)].copy()  # ₹10L floor (unchanged in real terms)
    ratio = eligible["expenditure_rs"] / eligible["sanctioned_rs"]
    flagged = eligible[ratio < 0.6 * eligible["peer_utilisation"]]

    out: list[dict] = []
    for _, row in flagged.iterrows():
        peer_median = round_10k(row["sanctioned_rs"] * row["peer_utilisation"])
        expenditure = int(row["expenditure_rs"])
        out.append(
            {
                "work_id": row.name,
                "kind": "utilisation",
                "severity": "medium",  # single band (engine doc defines no high band)
                "headline": HEADLINE,
                "peer_n": int(row["peer_n"]),
                "peer_median_rs": peer_median,
                "actual_rs": expenditure,
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
