from fastapi import Request
import services.webhook as webhook_service
from utils.http_method import http_method


async def cryptocurrencyalert_new_coin(request: Request):
    return await http_method(
        lambda: webhook_service.cryptocurrencyalert_new_coin(request)
    )
