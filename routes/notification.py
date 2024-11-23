from fastapi import APIRouter, Query
from dtos.notification import PaginatedNotificationsResponse
import controllers.notification as notification_controller
from docs.notification import get_notifications_doc

router = APIRouter()


@router.get("/notifications", **get_notifications_doc)
async def get_notifications(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Items per page")
) -> PaginatedNotificationsResponse:
    return await notification_controller.get_notifications(page, size)
