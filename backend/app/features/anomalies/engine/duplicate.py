"""Rule 3 — near-duplicate (anomaly-engine.md §Rule 3).

Trigger: another work with the same district AND type (twin). Severity always
high. Peer law still applies: the (type, state) peer group must be ≥ 8 and its
size is reported as peer_n (the contract invariant "every flag carries peerN ≥ 8").
"""

from app.common.text import format_money_rs
from app.features.anomalies.engine.registry import Frames, MIN_PEERS


def detect(frames: Frames, today) -> list[dict]:
    works = frames.works
    stats = frames.works.join(
        _peer_n_only(works)
    )
    out: list[dict] = []
    for _, row in stats.iterrows():
        if row["peer_n"] < MIN_PEERS:
            continue
        twins = works[
            (works["district"] == row["district"])
            & (works["type"] == row["type"])
            & (works.index != row.name)
        ]
        if twins.empty:
            continue
        twin = twins.sort_index().iloc[0]
        out.append(
            {
                "work_id": row.name,
                "kind": "duplicate",
                "severity": "high",
                "headline": f"Possible overlapping scope with a nearby {row['type']} work — needs review",
                "peer_n": int(row["peer_n"]),
                "peer_median_rs": None,
                "actual_rs": int(row["sanctioned_rs"]),
                "corroboration": (
                    f"Same type and district as {twin.name} ({twin['title']}); "
                    "site extents need a joint review."
                ),
                "signals": [
                    {
                        "label": "Near-duplicate",
                        "value": f"{twin.name} — {twin['title']} in {twin['district']}",
                    },
                    {"label": "Sanctioned cost", "value": format_money_rs(int(row["sanctioned_rs"]))},
                ],
                "detector_inputs": {
                    "twin": str(twin.name),
                    "matched_on": "type + district",
                    "peer_n": int(row["peer_n"]),
                },
            }
        )
    return out


def _peer_n_only(works):
    from app.features.anomalies.engine.peers import peer_stats

    return peer_stats(Frames(works))[["peer_n"]]
