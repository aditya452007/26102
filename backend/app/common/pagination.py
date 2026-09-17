"""Shared pagination query params (api-reference.md: page/pageSize, 1–100)."""

from dataclasses import dataclass

from fastapi import Query


@dataclass
class PageParams:
    page: int = Query(1, ge=1, description="1-based page number")
    page_size: int = Query(20, alias="pageSize", ge=1, le=100)
