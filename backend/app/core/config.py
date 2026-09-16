"""Application settings — the single source of runtime configuration.

pydantic-settings reads environment variables / `.env`. The demo clock
(`demo_today_iso`) exists so the seeded dataset is reproducible; real ingest
replaces the constant, not the code (seed-generator.md).
"""

from datetime import date
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="NIRIKSHAN_",  # no ambient DATABASE_URL leaks from other projects
    )

    # Database
    database_url: str = "postgresql://nirikshan:nirikshan@localhost:5432/nirikshan"

    # Auth — secrets come from env, never code (ssdlc)
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7-day demo session

    # Demo data clock — never date.today() (seed-generator.md)
    demo_today_iso: str = "2026-09-07"

    # Uploads
    upload_dir: str = "./uploads"
    upload_max_mb: int = 5

    # Seed gate: "true" seeds when empty, "force" truncates first, "false" skips
    seed_demo: str = "true"

    @property
    def demo_today(self) -> date:
        return date.fromisoformat(self.demo_today_iso)


@lru_cache
def get_settings() -> Settings:
    return Settings()
