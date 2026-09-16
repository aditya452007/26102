"""Seed parity test — the tripwire (seed-generator.md §8).

Proves the Python port (app/seed/generate.py) reproduces the TS mock dataset
key-for-key. The TS fixture is committed; regenerate it with
`admin-dashboard/scripts/dump-ts-fixture.ts` whenever mplads-mock.ts changes
(same commit + new ADR).
"""

import json
from pathlib import Path

import pytest

from app.seed.generate import build_demo_dataset
from app.seed.rng import mulberry32

FIXTURE = Path(__file__).parent / "fixtures" / "ts-demo-dataset.json"

# mulberry32 vectors (seed-generator.md §1) — guard the port itself
V_26102 = [0.1417788703, 0.7273318286, 0.5826761411, 0.3812258046, 0.3712489000]
V_26602 = [0.3361864095, 0.1342250074, 0.6942306196, 0.1894840100, 0.7805237325]


def test_mulberry32_matches_node_vectors():
    rng = mulberry32(26102)
    assert [round(rng(), 10) for _ in range(5)] == V_26102
    rng = mulberry32(26602)
    assert [round(rng(), 10) for _ in range(5)] == V_26602


def test_dataset_counts():
    data = build_demo_dataset()
    assert len(data["works"]) == 40
    assert len(data["anomalies"]) == 12
    assert len(data["evidences"]) == 6
    assert len(data["activities"]) == 33
    assert len(data["geoRollup"]) == 6


@pytest.fixture(scope="module")
def ts_fixture() -> dict:
    if not FIXTURE.exists():
        pytest.skip(
            "TS fixture missing — run `npx -y tsx scripts/dump-ts-fixture.ts` "
            "from admin-dashboard/ to generate it"
        )
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_works_parity(ts_fixture: dict):
    py = build_demo_dataset()["works"]
    ts = ts_fixture["works"]
    assert py == ts  # key-for-key deep equality, 40 works × 21 fields


def test_anomalies_parity(ts_fixture: dict):
    py = build_demo_dataset()["anomalies"]
    ts = ts_fixture["anomalies"]
    assert py == ts


def test_evidences_parity(ts_fixture: dict):
    py = build_demo_dataset()["evidences"]
    ts = ts_fixture["evidences"]
    assert py == ts


def test_activities_parity(ts_fixture: dict):
    py = build_demo_dataset()["activities"]
    ts = ts_fixture["activities"]
    assert py == ts


def test_geo_rollup_parity(ts_fixture: dict):
    py = build_demo_dataset()["geoRollup"]
    ts = ts_fixture["geoRollup"]
    assert py == ts


def test_flagship_pinned_values():
    data = build_demo_dataset()
    w = next(w for w in data["works"] if w["id"] == "W-1014")
    assert w["sanctionedLakh"] == 58.9
    assert w["expenditureLakh"] == 41.2
    assert w["progressPct"] == 62
    assert w["status"] == "stalled"
    assert w["lastUpdate"] == "2026-06-03"
    a = data["anomalies"][0]
    assert a["id"] == "A-1" and a["workId"] == "W-1014"
    assert a["peerN"] == 18 and a["peerMedianLakh"] == 24.6
    assert a["signals"][0]["value"] == (
        "₹58.9L vs ₹24.6L median across 18 similar community-hall works in Bhopal"
    )
