from fastapi import APIRouter
from typing import List
from dtos.exchange import ExchangeResponse
import controllers.exchange as exchange_controller
from docs.exchange import get_cryptocurrencyalert_exchanges_doc

router = APIRouter()


@router.get("/exchanges/cryptocurrencyalert", **get_cryptocurrencyalert_exchanges_doc)
async def get_cryptocurrencyalert_exchanges() -> List[ExchangeResponse]:
    return await exchange_controller.get_cryptocurrencyalert_exchanges()
