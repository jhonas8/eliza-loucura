from fastapi import APIRouter, Request, HTTPException
import controllers.webhook as webhook_controller
import docs.webhook as webhook_docs

router = APIRouter()


@router.post("/webhook/cryptocurrencyalert/new_coin", **webhook_docs.cryptocurrentalert_new_coin_doc)
async def cryptocurrencyalert_new_coin(request: Request):
    return await webhook_controller.cryptocurrencyalert_new_coin(request)
