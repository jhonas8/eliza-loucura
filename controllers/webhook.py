from fastapi import Request
import services.webhook as webhook_service


async def cryptocurrencyalert_new_coin(request: Request):
    return await webhook_service.cryptocurrencyalert_new_coin(request)
