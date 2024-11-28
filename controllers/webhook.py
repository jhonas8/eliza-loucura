from fastapi import Request
from dtos.webhook_endpoint import WebhookEndpointCreate, WebhookEndpointResponse
import services.webhook as webhook_service
from utils.http_method import http_method


async def cryptocurrencyalert_new_coin(request: Request):
    return await http_method(
        lambda: webhook_service.cryptocurrencyalert_new_coin(request)
    )


async def create_webhook_endpoint(endpoint: WebhookEndpointCreate) -> WebhookEndpointResponse:
    return await http_method(
        lambda: webhook_service.create_webhook_endpoint(endpoint)
    )
