from fastapi import APIRouter, Request
import controllers.webhook as webhook_controller

router = APIRouter()


@router.post("/webhook/cryptocurrencyalert/new_coin")
async def cryptocurrencyalert_new_coin(request: Request):
    return await webhook_controller.cryptocurrencyalert_new_coin(request)
