"""Alembic environment — reads DATABASE_URL from app settings, no autogenerate.

Migrations are hand-written SQL (implementation-plan §6): autogenerate needs
SQLAlchemy metadata, and this project's entities are Pony.
"""

from alembic import context
from sqlalchemy import create_engine

from app.core.config import get_settings

config = context.config


def run_migrations_offline() -> None:
    context.configure(
        url=get_settings().database_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(get_settings().database_url)
    with engine.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
