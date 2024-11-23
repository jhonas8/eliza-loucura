from typing import List
from dtos.exchange import ExchangeResponse
from clients.firebase.exchange import FirebaseExchangeClient


async def get_cryptocurrencyalert_exchanges() -> List[ExchangeResponse]:
    client = FirebaseExchangeClient()
    exchanges = await client.get_all_exchanges()
    return [ExchangeResponse(**exchange) for exchange in exchanges]
