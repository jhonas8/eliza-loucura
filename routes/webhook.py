from fastapi import APIRouter, Request, HTTPException
import controllers.webhook as webhook_controller
import docs.webhook as webhook_docs
from dtos.webhook_endpoint import WebhookEndpointCreate, WebhookEndpointResponse

router = APIRouter()


@router.post("/webhook/cryptocurrencyalert/new_coin", **webhook_docs.cryptocurrentalert_new_coin_doc)
async def cryptocurrencyalert_new_coin(request: Request):
    return await webhook_controller.cryptocurrencyalert_new_coin(request)


@router.post("/webhook/endpoint", **webhook_docs.create_webhook_endpoint_doc)
async def create_webhook_endpoint(endpoint: WebhookEndpointCreate) -> WebhookEndpointResponse:
    return await webhook_controller.create_webhook_endpoint(endpoint)
