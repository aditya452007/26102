"""Detector registry — the plugin seam (implementation-plan §1, §8).

Adding a detector = new `engine/<name>.py` with a `detect(frames, today) ->
list[dict]` function + one entry in DETECTORS + a DETECTOR_VERSION bump.
The pipeline never changes.
"""

from collections.abc import Callable
from typing import NamedTuple

import pandas as pd

DETECTOR_VERSION = "rules-1.0"
MIN_PEERS = 8  # contract minimum: every flag must carry peerN >= 8


class Frames(NamedTuple):
    """Everything a detector may look at — loaded once by the pipeline."""

    works: pd.DataFrame  # indexed by id, one row per work


DetectorFn = Callable[[Frames, object], list[dict]]
