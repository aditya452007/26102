"""Peer statistics — leave-one-out medians per (type, state) group.

Peer group law (anomaly-engine.md): same type AND same state, excluding the
work itself. Exact leave-one-out medians via a groupby-apply (groups are small;
O(m²) per group is negligible at MPLADS district scale).
"""

import numpy as np
import pandas as pd

from app.features.anomalies.engine.registry import Frames


def peer_stats(frames: Frames) -> pd.DataFrame:
    """DataFrame indexed by work id: peer_n, median_sanctioned, median_expenditure,
    peer_utilisation (median of peers' expenditure/sanctioned ratios)."""
    works = frames.works
    parts: list[pd.DataFrame] = []
    for _, group in works.groupby(["type", "state"], sort=False):
        parts.append(_group_leave_one_out(group))
    return pd.concat(parts) if parts else pd.DataFrame(
        columns=["peer_n", "median_sanctioned", "median_expenditure", "peer_utilisation"]
    )


def _group_leave_one_out(group: pd.DataFrame) -> pd.DataFrame:
    sanctioned = group["sanctioned_rs"].to_numpy(dtype=float)
    expenditure = group["expenditure_rs"].to_numpy(dtype=float)
    utilisation = np.divide(
        expenditure, sanctioned, out=np.zeros_like(sanctioned), where=sanctioned > 0
    )
    n = len(group)
    rows = []
    for i in range(n):
        others = np.ones(n, dtype=bool)
        others[i] = False
        if others.any():
            rows.append(
                {
                    "peer_n": int(others.sum()),
                    "median_sanctioned": float(np.median(sanctioned[others])),
                    "median_expenditure": float(np.median(expenditure[others])),
                    "peer_utilisation": float(np.median(utilisation[others])),
                }
            )
        else:
            rows.append(
                {"peer_n": 0, "median_sanctioned": np.nan,
                 "median_expenditure": np.nan, "peer_utilisation": np.nan}
            )
    out = pd.DataFrame(rows, index=group.index)
    return out
