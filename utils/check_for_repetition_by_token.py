from clients.firebase.notification import FirebaseNotificationClient


async def check_for_repetition_by_token(token_address: str, days_ago: int) -> bool:
    firebase_notification_client = FirebaseNotificationClient()
    notifications = await firebase_notification_client.check_for_last_notification_by_token(
        token_address=token_address,
        days_ago=days_ago
    )

    print(f'found {len(notifications)} notifications for {token_address} on the last {days_ago} days')

    return bool(notifications)
