"""Notification wire schema ( OfficerNotification in notifications/-components/data.ts)."""

from app.common.schemas import CamelModel


class NotificationOut(CamelModel):
    id: str  # "N-{kind}-{workId}" — deterministic
    kind: str  # high-risk | stall | uc | overdue
    title: str
    description: str
    work_id: str
    age_days: int
