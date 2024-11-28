from typing import Dict, Any, Optional
from datetime import datetime
import time
from clients.coingecko.get_coin_info import get_coin_info
from clients.auto_sniper.send_order import send_open_position_order_prod


def is_solana_chain(notification: Dict[str, Any]) -> bool:
    chain = notification.get('blockchain', '').lower()
    if not chain:
        chain = notification.get('chain', '').lower()

    return chain == 'solana'


def extract_socials_from_coingecko(coin_info: Dict[str, Any]) -> Dict[str, Optional[str]]:
    socials: Dict[str, Optional[str]] = {"ws": None, "x": None, "tg": None}

    if not coin_info.get('data'):
        return socials

    for item in coin_info['data']:
        attributes = item.get('attributes', {})

        # Get website
        websites = attributes.get('websites', [])
        if websites:
            socials['ws'] = websites[0]

        # Get Twitter
        twitter = attributes.get('twitter_handle')
        if twitter:
            socials['x'] = f"x.com/{twitter}"

        # Get Telegram
        telegram = attributes.get('telegram_handle')
        if telegram:
            socials['tg'] = telegram

        break  # Use first item only

    # Convert None to empty string for the API requirement
    return {k: v if v is not None else "" for k, v in socials.items()}


def get_market_cap(coin_info: Dict[str, Any]) -> str:
    # This is a placeholder as the sample response doesn't show market cap
    # You might need to adjust this based on actual CoinGecko response
    return "0"


async def handle_notification(notification_data: Dict[str, Any]) -> None:
    # Check if it's a Solana chain notification
    if not is_solana_chain(notification_data):
        print("Skipping non-Solana notification")
        return

    # Extract token address
    token_address = notification_data.get('currency_address')
    if not token_address:
        print("No token address found in notification")
        return

    try:
        # Get additional details from CoinGecko
        coin_info = get_coin_info(token_address)

        # Extract socials and market cap
        socials = extract_socials_from_coingecko(coin_info)
        market_cap = get_market_cap(coin_info)

        # Create timestamp
        created_at = str(int(time.time()))

        # Send order
        send_open_position_order_prod(
            chain="solana",
            token_address=token_address,
            trading_decision="buy",
            created_at=created_at,
            model="lx1",
            socials=socials,
            market_cap=market_cap
        )

        print(f"Successfully processed notification for token {token_address}")

    except Exception as e:
        print(f"Error processing notification: {str(e)}")
