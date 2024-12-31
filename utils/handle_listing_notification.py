from typing import Dict, Any, Optional
from datetime import datetime
import pytz


async def handle_listing_notification(listing: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Simplified notification handler specifically for exchange listings"""
    try:
        # Add timestamp
        timestamp = datetime.now(pytz.UTC)

        # Create notification object with the exact structure needed
        notification = {
            "type": listing["type"],
            "listing_type": listing["listing_type"],
            "message": listing["message"],
            "currency": {
                "symbol": listing["currency"]["symbol"],
                "name": listing["currency"]["name"],
                "address": listing["currency"]["address"]
            },
            "exchange": {
                "name": listing["exchange"]["name"],
                "trading_pair_url": listing["exchange"]["trading_pair_url"]
            },
            "blockchain": listing["blockchain"],
            "alert_condition_id": listing["alert_condition_id"],
            "created_at": timestamp.isoformat(),
            "updated_at": timestamp.isoformat()
        }

        print(
            f"Listing notification processed for: {notification['currency']['symbol']}")
        return notification

    except Exception as e:
        print(f"Error processing listing notification: {str(e)}")
        return None
