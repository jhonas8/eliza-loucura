from dtos.notification import PaginatedNotificationsResponse
import services.notification as notification_service
from utils.http_method import http_method


async def get_notifications(page: int = 1, size: int = 10) -> PaginatedNotificationsResponse:
    return await http_method(
        lambda: notification_service.get_notifications(page, size)
    )
