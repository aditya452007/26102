"""Evidence + decisions contract tests (api-reference.md §evidence, §decisions)."""

from tests.conftest import auth


def test_evidence_list_seed_rows(client, ministry_token):
    r = client.get("/api/v1/works/W-1014/evidence", headers=auth(ministry_token))
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"items", "total"}
    for e in body["items"]:
        assert set(e) == {"id", "workId", "kind", "name", "sizeKb", "uploadedAt", "by"}
        assert e["uploadedAt"].endswith("Z")


def test_evidence_upload_download_roundtrip(client, ministry_token):
    payload = b"%PDF-1.4 fake-pdf-bytes"
    r = client.post(
        "/api/v1/works/W-1014/evidence",
        headers=auth(ministry_token),
        files={"file": ("inspection.pdf", payload, "application/pdf")},
        data={"kind": "report"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["kind"] == "report" and body["name"] == "inspection.pdf"
    assert body["workId"] == "W-1014"
    assert body["sizeKb"] >= 1

    # Download roundtrip
    r = client.get(f"/api/v1/evidence/{body['id']}/file", headers=auth(ministry_token))
    assert r.status_code == 200
    assert r.content == payload

    # Seed rows have storage_path NULL → 404
    r = client.get("/api/v1/evidence/E-1/file", headers=auth(ministry_token))
    assert r.status_code == 404


def test_evidence_upload_rejects_bad_type_and_kind(client, ministry_token):
    r = client.post(
        "/api/v1/works/W-1014/evidence",
        headers=auth(ministry_token),
        files={"file": ("evil.exe", b"MZ", "application/x-msdownload")},
        data={"kind": "report"},
    )
    assert r.status_code == 403  # allowlist violation
    r = client.post(
        "/api/v1/works/W-1014/evidence",
        headers=auth(ministry_token),
        files={"file": ("doc.pdf", b"%PDF", "application/pdf")},
        data={"kind": "meme"},
    )
    assert r.status_code == 422  # kind pattern


def test_evidence_upload_out_of_scope_403(client, district_token):
    """Bhopal officer cannot attach evidence to an Indore work."""
    r = client.post(
        "/api/v1/works/W-1007/evidence",
        headers=auth(district_token),
        files={"file": ("note.pdf", b"%PDF", "application/pdf")},
        data={"kind": "doc"},
    )
    assert r.status_code == 403  # scope writes 403 (deliberate)


def test_decision_creates_with_activity_same_tx(client, ministry_token):
    r = client.post(
        "/api/v1/works/W-1014/decision",
        headers=auth(ministry_token),
        json={"status": "verified", "note": "Site inspected; variance explained."},
    )
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"id", "workId", "status", "note", "at", "by"}
    # Live-verification regression: unflushed auto PKs serialized as "id": "None".
    assert body["id"] not in ("", "None", None) and body["id"].isdigit()
    assert body["at"].startswith("20")
    assert body["status"] == "verified"
    assert body["workId"] == "W-1014"

    # Activity row appended in the same transaction
    feed = client.get("/api/v1/works/W-1014/activity", headers=auth(ministry_token)).json()
    top = feed["items"][0]  # at DESC → the decision is newest
    assert top["action"] == "Decision recorded — verified"
    assert top["actor"] == "Ministry Officer (demo)"
    assert set(top) == {"id", "workId", "at", "actor", "action", "note"}
    assert top["id"].startswith("T-")


def test_decision_422_bad_status(client, ministry_token):
    r = client.post(
        "/api/v1/works/W-1014/decision",
        headers=auth(ministry_token),
        json={"status": "chaos", "note": ""},
    )
    assert r.status_code == 422


def test_decision_out_of_scope_403_and_activity_404(client, district_token):
    r = client.post(
        "/api/v1/works/W-1002/decision",  # Patna work — outside Bhopal scope
        headers=auth(district_token),
        json={"status": "dismissed", "note": ""},
    )
    assert r.status_code == 403
    # out-of-scope activity read: 404 (never confirm existence)
    r = client.get("/api/v1/works/W-1002/activity", headers=auth(district_token))
    assert r.status_code == 404
