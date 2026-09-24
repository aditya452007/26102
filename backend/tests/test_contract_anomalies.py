"""Anomalies contract tests (api-reference.md §anomalies).

Note on recompute: a REAL detector run on the 40-work demo dataset finds no
flags — real peer groups (type+state ≥ 8 works) barely exist at demo scale.
The 12 seeded flags are generator-authored demo fiction (ADR-031); recompute
replaces them with the honest (empty) computation, so this test restores the
seed afterward for the rest of the suite.
"""

from tests.conftest import auth, reseed_demo


def test_list_shape_and_seed_total(client, ministry_token):
    r = client.get("/api/v1/anomalies", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "total"}
    assert body["total"] == 24
    a = body["items"][0]  # ordered high→medium→low: A-1 first
    assert a["id"] == "A-1"
    assert set(a) == {
        "id", "workId", "kind", "severity", "headline", "peerN",
        "peerMedianRs", "actualRs", "unit", "corroboration", "signals",
    }
    assert a["signals"][0]["value"] == (
        "₹1.90 Cr vs ₹0.78 Cr median across 18 similar community-hall works in Bhopal"
    )


def test_list_filters(client, ministry_token):
    r = client.get("/api/v1/anomalies?severity=high", headers=auth(ministry_token))
    assert r.json()["total"] == 8
    r = client.get("/api/v1/anomalies?kind=utilisation", headers=auth(ministry_token))
    assert r.json()["total"] == 4  # FLAG_PLAN: 2× (utilisation/medium + utilisation/low)
    r = client.get("/api/v1/anomalies?workId=W-1014", headers=auth(ministry_token))
    items = r.json()["items"]
    assert len(items) == 1 and items[0]["kind"] == "cost"


def test_explain_shape(client, ministry_token):
    r = client.get("/api/v1/anomalies/A-1", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"anomaly", "work"}
    assert body["work"]["id"] == "W-1014"
    assert set(body["work"]) == {
        "id", "title", "district", "state", "sanctionedRs", "progressPct",
    }


def test_explain_unknown_404(client, ministry_token):
    assert client.get("/api/v1/anomalies/A-999", headers=auth(ministry_token)).status_code == 404


def test_list_is_scoped_for_district_officer(client, ministry_token, district_token):
    all_ids = {
        a["id"] for a in client.get("/api/v1/anomalies?limit=200", headers=auth(ministry_token)).json()["items"]
    }
    scoped = client.get("/api/v1/anomalies?limit=200", headers=auth(district_token))
    assert scoped.status_code == 200
    scoped_ids = {a["id"] for a in scoped.json()["items"]}
    assert scoped_ids
    assert scoped_ids < all_ids  # strictly scoped, never the full set
    outside = next(iter(all_ids - scoped_ids))
    r = client.get(f"/api/v1/anomalies/{outside}", headers=auth(district_token))
    assert r.status_code == 404  # scope reads 404 (don't confirm existence)


def test_recompute_ministry_only_and_restore(client, ministry_token, district_token):
    # District officer cannot recompute
    r = client.post("/api/v1/detectors/recompute", headers=auth(district_token))
    assert r.status_code == 403

    # Ministry runs the real pipeline — honest result at demo scale: no peer
    # groups ≥ 8 → no flags (documents the seed-fiction gap, ADR-031).
    r = client.post("/api/v1/detectors/recompute", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"run", "detectorVersion", "anomaliesCreated"}
    assert body["detectorVersion"] == "rules-1.0"
    assert body["anomaliesCreated"] == 0
    assert client.get("/api/v1/anomalies", headers=auth(ministry_token)).json()["total"] == 0

    # Restore the demo seed so the rest of the suite sees the pinned dataset.
    # (insert_demo_data owns its transactions — never wrap it in db_session.)
    from app.core.db import bind_database

    bind_database()
    reseed_demo()
    assert client.get("/api/v1/anomalies", headers=auth(ministry_token)).json()["total"] == 24
