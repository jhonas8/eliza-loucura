from typing import List
from dtos.notification import NotificationResponse, PaginatedNotificationsResponse
from clients.firebase.notification import FirebaseNotificationClient


async def get_notifications(page: int = 1, size: int = 10) -> PaginatedNotificationsResponse:
    client = FirebaseNotificationClient()
    notifications, total = await client.get_notifications(page, size)

    items = [NotificationResponse(**notification)
             for notification in notifications]

    return PaginatedNotificationsResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        has_more=total > (page * size)
    )
