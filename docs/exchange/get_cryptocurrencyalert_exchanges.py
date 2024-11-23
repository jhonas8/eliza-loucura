from typing import List
from dtos.exchange import ExchangeResponse
from application_types.tags import Tags

get_cryptocurrencyalert_exchanges_doc = {
    "summary": "Get CryptocurrencyAlert exchanges",
    "description": "Retrieve list of all supported exchanges for CryptocurrencyAlert",
    "response_model": List[ExchangeResponse],
    "tags": [Tags.EXCHANGES],
    "responses": {
        200: {
            "description": "List of exchanges retrieved successfully",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "exchange1",
                            "name": "Binance",
                            "url": "https://www.binance.com/pt-BR"
                        }
                    ]
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {"detail": "Error processing request: {error_message}"}
                }
            }
        }
    }
}
