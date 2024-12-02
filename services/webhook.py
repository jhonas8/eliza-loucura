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

    await notification_client.save_notification(data)

    # Handle notification for internal processing
    await handle_notification(data)

    # Forward notification to registered webhooks
    await send_notification(data)

    return {"message": "Webhook received and processed"}


async def create_webhook_endpoint(endpoint: WebhookEndpointCreate) -> WebhookEndpointResponse:
    client = FirebaseWebhookEndpointClient()
    created = await client.create_endpoint(str(endpoint.url), endpoint.description)
    return WebhookEndpointResponse(**created)
