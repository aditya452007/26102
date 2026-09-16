"""Smoke test — the app factory assembles with every feature router mounted."""


def test_app_factory_boots():
    from app.main import app

    assert app.title == "NIRIKSHAN-AI API"
    paths = {getattr(r, "path", "") for r in app.router.routes}
    assert "/healthz" in paths


def test_all_feature_routers_import():
    # Every feature package imports cleanly (router.py present) — stubs included.
    from importlib import import_module

    for feature in (
        "auth", "works", "anomalies", "evidence",
        "decisions", "notifications", "overview", "copilot",
    ):
        module = import_module(f"app.features.{feature}.router")
        assert hasattr(module, "router")
