"""Read-model contract tests: notifications, overview, copilot tools."""

import json
from pathlib import Path

from tests.conftest import auth

FIXTURE = Path(__file__).parent / "fixtures" / "ts-demo-dataset.json"


def test_notifications_shape_and_derivation(client, ministry_token):
    r = client.get("/api/v1/notifications", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "total"}
    kinds = [i["kind"] for i in body["items"]]
    rank = {"high-risk": 0, "stall": 1, "uc": 2, "overdue": 3}
    assert kinds == sorted(kinds, key=lambda k: rank[k])  # kind rank ordering
    for item in body["items"]:
        assert set(item) == {"id", "kind", "title", "description", "workId", "ageDays"}
        # deterministic ids: the frontend uses `N-high-{id}` for high-risk items
        expected_prefix = "N-high-" if item["kind"] == "high-risk" else f"N-{item['kind']}-"
        assert item["id"].startswith(expected_prefix)
    counts = {k: kinds.count(k) for k in set(kinds)}
    assert counts["high-risk"] == 8  # eight high-severity seed anomalies
    assert counts["uc"] == 4  # four utilisation seed anomalies (doubled plan)


def test_geo_rollup_matches_ts_fixture(client, ministry_token):
    """Backend geo (real query over stored data) must equal the TS generator rollup."""
    r = client.get("/api/v1/overview/geo", headers=auth(ministry_token))
    assert r.status_code == 200
    backend = r.json()["items"]
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))["geoRollup"]
    assert backend == fixture  # same keys, same order, same counts


def test_queue_ranks_severity_then_stall(client, ministry_token):
    r = client.get("/api/v1/overview/queue?limit=8", headers=auth(ministry_token))
    assert r.status_code == 200
    items = r.json()["items"]
    assert items[0]["severity"] == "high"  # all high flags first…
    high_stalls = [i["id"] for i in items if i["severity"] == "high"]
    assert "W-1014" in high_stalls  # …ordered by stall days among themselves
    assert all(i["severity"] is not None for i in items)


def test_kpis_static_snapshot(client, ministry_token):
    r = client.get("/api/v1/overview/kpis", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert body == {
        "totalWorks": 28410,
        "underExecution": 9120,
        "delayed": 1140,
        "highRisk": 214,
        "overrunExposureRs": 1284000000,
    }


def test_geo_is_scoped(client, district_token):
    r = client.get("/api/v1/overview/geo", headers=auth(district_token))
    items = r.json()["items"]
    assert [row["state"] for row in items] == ["Madhya Pradesh"]  # Bhopal officer sees MP only


def test_copilot_search_and_aliases(client, ministry_token):
    r = client.get("/api/v1/copilot/search?q=W-1014", headers=auth(ministry_token))
    assert r.status_code == 200
    assert [row["id"] for row in r.json()["items"]] == ["W-1014"]

    r = client.get("/api/v1/copilot/compare/W-1014", headers=auth(ministry_token))
    assert r.status_code == 200
    assert r.json()["workId"] == "W-1014"

    r = client.get("/api/v1/copilot/explain/A-1", headers=auth(ministry_token))
    assert r.status_code == 200
    assert r.json()["anomaly"]["id"] == "A-1"


def test_copilot_missing_gaps(client, ministry_token):
    # W-1014 has a photo but no `report` evidence → "No recent measurement" fires
    r = client.get("/api/v1/copilot/missing/W-1014", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert body["workId"] == "W-1014"
    labels = {g["label"] for g in body["gaps"]}
    assert "No recent measurement" in labels
    assert labels <= {"UC pending", "No recent measurement"}

    # The utilisation-flagged work must show the UC pending gap
    flags = client.get(
        "/api/v1/anomalies?kind=utilisation", headers=auth(ministry_token)
    ).json()["items"]
    uc_work = flags[0]["workId"]
    r = client.get(f"/api/v1/copilot/missing/{uc_work}", headers=auth(ministry_token))
    assert "UC pending" in {g["label"] for g in r.json()["gaps"]}
