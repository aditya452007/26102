"""Auth tests (Feature_docs/01-login/backend.md acceptance criteria)."""

from tests.conftest import auth

LOGIN = "/api/v1/auth/login"
ME = "/api/v1/auth/me"


def test_login_returns_token_and_officer(client):
    r = client.post(LOGIN, json={"email": "ministry@demo.gov.in", "password": "demo1234"})
    assert r.status_code == 200
    body = r.json()
    assert body["tokenType"] == "bearer"
    assert body["expiresIn"] == 7 * 24 * 3600
    assert body["officer"]["role"] == "ministry"
    assert body["officer"]["stateScope"] is None
    assert body["officer"]["districtScope"] is None
    assert "nirikshan_session" in r.cookies  # server-fn proxy cookie


def test_login_wrong_password_401(client):
    r = client.post(LOGIN, json={"email": "ministry@demo.gov.in", "password": "nope"})
    assert r.status_code == 401
    assert r.json() == {"detail": "Invalid email or password"}


def test_login_unknown_email_401(client):
    r = client.post(LOGIN, json={"email": "ghost@demo.gov.in", "password": "demo1234"})
    assert r.status_code == 401


def test_me_roundtrip(client, ministry_token):
    r = client.get(ME, headers=auth(ministry_token))
    assert r.status_code == 200
    assert r.json()["email"] == "ministry@demo.gov.in"


def test_me_without_token_401(client):
    r = client.get(ME)
    assert r.status_code == 401


def test_me_with_garbage_token_401(client):
    r = client.get(ME, headers=auth("not-a-jwt"))
    assert r.status_code == 401


def test_me_via_cookie(client):
    """The server-fn proxy path: cookie alone authenticates."""
    client.post(LOGIN, json={"email": "ministry@demo.gov.in", "password": "demo1234"})
    r = client.get(ME)  # TestClient persists the session cookie
    assert r.status_code == 200
