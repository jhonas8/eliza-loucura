from fastapi import Request
from clients.firebase.notification import FirebaseNotificationClient
from utils.handle_notification import handle_notification
from utils.send_notification import send_notification
from clients.firebase.webhook_endpoint import FirebaseWebhookEndpointClient
from dtos.webhook_endpoint import WebhookEndpointCreate, WebhookEndpointResponse


async def cryptocurrencyalert_new_coin(request: Request):
    # Get the JSON data from the request
    data = await request.json()

    # Save notification
    notification_client = FirebaseNotificationClient()

    # Handle notification for internal processing
    processed_notification = await handle_notification(data)

    if processed_notification:
        await notification_client.save_notification(
            {**processed_notification, 'currency_address': data['currency_address']})
        print(f"Notification saved: {processed_notification}")

        # Forward notification to registered webhooks
        await send_notification(processed_notification)
        print(f"Notification forwarded to webhooks: {processed_notification}")

    return {"message": "Webhook received and processed"}


async def create_webhook_endpoint(endpoint: WebhookEndpointCreate) -> WebhookEndpointResponse:
    client = FirebaseWebhookEndpointClient()
    created = await client.create_endpoint(str(endpoint.url), endpoint.description)
    return WebhookEndpointResponse(**created)
