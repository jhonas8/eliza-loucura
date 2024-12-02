from typing import List, Dict, Any
import asyncio
from services.webhook import cryptocurrencyalert_new_coin
from fastapi import Request

SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "04jp5K771F6nKFDpmMgQ",
        "data": {
            "alert_condition_id": 2040394,
            "listing_type": "listing",
            "message": "dogwifhat",
            "type": "new_coin",
            "trading_pair_url": "https://www.coingecko.com/en/coins/dogwifhat/",
            "currency_address": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
            "currency": "DOGWIFHAT",
            "currency_name": "Dogwifhat",
            "blockchain": "solana",
            "exchange": "Binance"
        },
        "created_at": "2024-11-24T08:49:26.074960Z"
    }
]


class MockRequest(Request):
    """Mock Request class to simulate FastAPI request"""

    def __init__(self, json_data: Dict[str, Any]):
        self._json = json_data
        super().__init__(scope={"type": "http"})

    async def json(self) -> Dict[str, Any]:
        return self._json


async def test_webhook_notifications():
    """Test webhook notifications processing"""
    print("\nStarting webhook notification tests...")

    for notification in SAMPLE_NOTIFICATIONS:
        print(
            f"\nProcessing notification for {notification['data']['currency_name']}...")

        # Create mock request with notification data
        mock_request = MockRequest(notification['data'])

        try:
            # Process notification through the webhook endpoint
            result = await cryptocurrencyalert_new_coin(mock_request)
            print(f"Result: {result}")

        except Exception as e:
            print(f"Error processing notification: {str(e)}")

        # Add small delay between notifications
        await asyncio.sleep(1)

    print("\nWebhook notification tests completed")
