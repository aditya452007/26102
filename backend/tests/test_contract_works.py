"""Works contract tests — response shapes + scoping law (api-reference.md)."""

from tests.conftest import auth


def test_ledger_envelope_and_row_shape(client, ministry_token):
    r = client.get("/api/v1/works?pageSize=2", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "total", "page", "pageSize"}
    assert body["total"] == 40
    assert body["pageSize"] == 2
    row = body["items"][0]
    assert set(row) == {
        "id", "title", "agency", "type", "district", "state",
        "sanctionedLakh", "progressPct", "status", "lastUpdate",
        "severity", "kind",
    }


def test_ledger_defaults_sort_asc_by_id(client, ministry_token):
    # api-reference.md: `order` defaults to desc only for amount/updated; id → asc
    r = client.get("/api/v1/works?pageSize=2", headers=auth(ministry_token))
    ids = [row["id"] for row in r.json()["items"]]
    assert ids == ["W-1001", "W-1002"]


def test_ledger_explicit_desc_and_amount_sort(client, ministry_token):
    r = client.get("/api/v1/works?sort=id&order=desc&pageSize=2", headers=auth(ministry_token))
    assert [row["id"] for row in r.json()["items"]] == ["W-1040", "W-1039"]

    r = client.get("/api/v1/works?sort=amount&pageSize=40", headers=auth(ministry_token))
    amounts = [row["sanctionedLakh"] for row in r.json()["items"]]
    assert amounts == sorted(amounts, reverse=True)  # amount defaults desc


def test_ledger_q_filter_and_lens(client, ministry_token):
    r = client.get("/api/v1/works?q=W-1014", headers=auth(ministry_token))
    assert [row["id"] for row in r.json()["items"]] == ["W-1014"]
    r = client.get("/api/v1/works?lens=high-risk&pageSize=100", headers=auth(ministry_token))
    body = r.json()
    assert body["total"] == 5  # seed: 5 high-severity flags
    assert all(row["severity"] == "high" for row in body["items"])


def test_work_detail_full_contract(client, ministry_token):
    r = client.get("/api/v1/works/W-1014", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {
        "id", "title", "type", "state", "district", "agency", "status",
        "sanctionedLakh", "expenditureLakh", "progressPct", "sanctionDate",
        "dueDate", "lastUpdate", "lat", "lon", "tenderHolder", "tenderAwardedBy",
        "department", "labourDeployed", "demandedDays", "returnedLakh",
    }
    assert body["sanctionedLakh"] == 58.9
    assert body["sanctionDate"] == "2024-11-20"


def test_work_detail_404_unknown_and_out_of_scope(client, ministry_token, district_token):
    assert client.get("/api/v1/works/W-9999", headers=auth(ministry_token)).status_code == 404
    # ministry sees it; a Bhopal district officer must NOT see a Patna work
    r = client.get("/api/v1/works/W-1005", headers=auth(district_token))
    assert r.status_code == 404  # scope reads 404, never 403 (don't confirm existence)


def test_dossier_bundle_shape(client, ministry_token):
    r = client.get("/api/v1/works/W-1014/dossier", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    # peers block deliberately absent: the dossier UI reads peer stats from the
    # stored anomalies; real computation lives in /works/{id}/peers (ADR-031)
    assert set(body) == {"work", "anomalies", "evidence", "activity", "decision"}
    a = body["anomalies"][0]
    assert set(a) == {
        "id", "workId", "kind", "severity", "headline", "peerN",
        "peerMedianLakh", "actualLakh", "unit", "corroboration", "signals",
    }
    assert a["peerN"] == 18 and a["peerMedianLakh"] == 24.6  # seeded demo fiction, parity-pinned
    assert body["decision"] is None  # no decisions recorded for W-1014 yet


def test_peers_table_shape(client, ministry_token):
    r = client.get("/api/v1/works/W-1014/peers", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert body["workId"] == "W-1014"
    # REAL computed peer group (type + state, excluding self): 1 for W-1014 (W-1037).
    # The mock's peerN:18 is generator narrative — see ADR-031.
    assert body["peerN"] == 1
    assert body["members"][0]["id"] == "W-1037"
    assert [row["metric"] for row in body["rows"]] == ["expenditure", "progress", "stallDays"]
    assert all(set(m) == {"id", "title", "sanctionedLakh"} for m in body["members"])
