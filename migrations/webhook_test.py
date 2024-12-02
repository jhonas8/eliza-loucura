from typing import List, Dict, Any
import asyncio
from services.webhook import cryptocurrencyalert_new_coin
from fastapi import Request

SAMPLE_NOTIFICATIONS: List[Dict[str, Any]] = [
    {
        "id": "aXQVZGtit4qfuaaZ9q0l",
        "data": {
            "alert_condition_id": 2040394,
            "listing_type": "listing",
            "message": "YouLive Coin (UC) has been listed on LBank!",
            "type": "new_coin",
            "trading_pair_url": "https://lbank.com/trade/uc_usdt/",
            "currency_address": "0xf84df2db2c87dd650641f8904af71ebfc3dde0ea",
            "currency": "UC",
            "currency_name": "YouLive Coin",
            "blockchain": "Ethereum",
            "exchange": "LBank"
        },
        "created_at": "2024-11-24T09:54:16.438438Z"
    },
    {
        "id": "SuKrZq1nr5xFmsHOi3OZ",
        "data": {
            "alert_condition_id": 2040394,
            "listing_type": "listing",
            "message": "Kirby Inu (KIRBY) has been listed on Biconomy Exchange!",
            "type": "new_coin",
            "trading_pair_url": "https://www.biconomy.com/exchange?coin=KIRBY_USDT",
            "currency_address": "0x1fd7e8c718c153fa97a5525c227a098007dcfdda",
            "currency": "KIRBY",
            "currency_name": "Kirby Inu",
            "blockchain": "Ethereum",
            "exchange": "Biconomy Exchange"
        },
        "created_at": "2024-11-24T09:35:25.308977Z"
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
