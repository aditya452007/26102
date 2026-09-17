"""Shared test fixtures.

Integration tests (client/token fixtures) run against the compose Postgres and
get **DB isolation**: an autouse fixture force-reseeds the pristine demo dataset
before each DB-backed test (uploads/decisions/recompute from a previous test
must never leak into the next). Pure-unit tests (rng, parity, detectors) are
unaffected — the fixture is a no-op for them.
"""

import pytest
from fastapi.testclient import TestClient

_DB_FIXTURES = {"client", "ministry_token", "district_token"}


def reseed_demo() -> None:
    from app.core.db import bind_database
    from app.seed.insert import insert_demo_data

    bind_database()
    # insert_demo_data owns its transactions — do NOT wrap it in db_session.
    insert_demo_data(force=True)


@pytest.fixture(scope="session")
def client() -> TestClient:
    from app.main import create_app

    with TestClient(create_app()) as c:
        yield c


@pytest.fixture(autouse=True)
def _isolate(request):
    """DB-backed tests start from the pristine demo dataset; cookies never leak."""
    yield
    try:
        if _DB_FIXTURES & set(request.fixturenames):
            reseed_demo()
    finally:
        if _DB_FIXTURES & set(request.fixturenames):
            for fix in ("client",):
                if fix in request.fixturenames:
                    client = request.getfixturevalue(fix)
                    if client is not None:
                        client.cookies.clear()


@pytest.fixture(scope="session")
def ministry_token(client: TestClient) -> str:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "ministry@demo.gov.in", "password": "demo1234"},
    )
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


@pytest.fixture(scope="session")
def district_token(client: TestClient) -> str:
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "district-bhopal@demo.gov.in", "password": "demo1234"},
    )
    assert r.status_code == 200, r.text
    return r.json()["accessToken"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
