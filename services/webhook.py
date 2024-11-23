from fastapi import Request
from clients.firebase.notification import FirebaseNotificationClient


async def cryptocurrencyalert_new_coin(request: Request):
    # Get the JSON data from the request
    data = await request.json()

    # Save notification
    notification_client = FirebaseNotificationClient()
    await notification_client.save_notification(data)

    return {"message": "Webhook received"}
