"""Notifications route (api-reference.md §notifications).

Read-state and prefs stay client-side (localStorage) — this feed is items only.
"""

from fastapi import APIRouter

from app.common.schemas import ItemsOut
from app.core.deps import CurrentOfficer
from app.features.notifications import service
from app.features.notifications.schemas import NotificationOut

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=ItemsOut[NotificationOut])
def notifications(officer: CurrentOfficer):
    return service.feed(officer)
