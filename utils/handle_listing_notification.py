from typing import Dict, Any, Optional
from datetime import datetime
from utils.get_env_var import get_environment
from clients.auto_sniper.send_order import send_open_position_order_prod, send_open_position_order_stg
from clients.coingecko.get_coin_info import get_coin_info
from utils.check_for_repetition_by_token import check_for_repetition_by_token
import pytz
import time


async def handle_listing_notification(listing: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Simplified notification handler specifically for exchange listings"""
    try:
        # Add timestamp
        timestamp = datetime.now(pytz.UTC)
        created_at = str(int(time.time()))

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

        # Get necessary data for order
        token_address = notification["currency"]["address"]
        chain = notification["blockchain"].lower()
        exchange = notification["exchange"]["name"].lower().replace(' ', '-')

        # Check for repetition
        repeated_notification = await check_for_repetition_by_token(
            token_address=token_address,
            days_ago=7
        )

        if repeated_notification:
            print(
                f"Notification for {token_address} already sent in the last 7 days")
            return None

        # Get coin info from CoinGecko
        coin_info = get_coin_info(token_address, chain)
        print(f"Coin info: {coin_info}")

        if not coin_info.get('data'):
            print(f"No data found for {token_address} on {chain}")
            return notification  # Return notification even if no additional data found

        # Extract market cap
        market_cap = str(coin_info['data'][0].get(
            'attributes', {}).get('fdv_usd', '0'))

        # Extract socials (empty for now as per original implementation)
        socials: Dict[str, str | None] = {"ws": "", "x": "", "tg": ""}

        # Send order based on environment
        if get_environment() == "PRODUCTION":
            print('Sending order to production')
            send_open_position_order_prod(
                chain=chain,
                token_address=token_address,
                trading_decision="buy",
                created_at=created_at,
                model="lx1",
                socials=socials,
                market_cap=market_cap,
                exchange=exchange
            )
        else:
            send_open_position_order_stg(
                chain=chain,
                token_address=token_address,
                trading_decision="buy",
                created_at=created_at,
                model="lx1",
                socials=socials,
                market_cap=market_cap,
                exchange=exchange
            )

        return notification

    except Exception as e:
        print(f"Error processing listing notification: {str(e)}")
        return None
