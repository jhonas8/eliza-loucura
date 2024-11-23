from datetime import datetime
from typing import Dict, Any, List
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    data: Dict[str, Any]
    created_at: datetime


class PaginatedNotificationsResponse(BaseModel):
    items: List[NotificationResponse]
    total: int
    page: int
    size: int
    has_more: bool
