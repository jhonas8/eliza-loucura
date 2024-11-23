from typing import List
from dtos.exchange import ExchangeResponse
import services.exchange as exchange_service
from utils.http_method import http_method


async def get_cryptocurrencyalert_exchanges() -> List[ExchangeResponse]:
    return await http_method(
        lambda: exchange_service.get_cryptocurrencyalert_exchanges()
    )
