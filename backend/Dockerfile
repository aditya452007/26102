FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Non-root (ssdlc deployment hardening)
RUN useradd -m -u 10001 appuser

WORKDIR /app

# Dependency layer — cached unless the lockfile changes
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

USER appuser
EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
