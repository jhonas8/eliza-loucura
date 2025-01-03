import time

from typing import Dict, Any, Optional
from datetime import datetime
from clients.coingecko.get_coin_info import get_coin_info
from clients.auto_sniper.send_order import send_open_position_order_prod, send_open_position_order_stg
from clients.dextools.get_information_from_scanner import get_information_from_dexscreener
from utils.check_for_repetition_by_token import check_for_repetition_by_token
from utils.get_env_var import get_environment


def is_solana_chain(notification: Dict[str, Any]) -> bool:
    chain = notification.get('blockchain', '').lower()
    if not chain:
        chain = notification.get('chain', '').lower()

    return chain == 'solana'


def extract_socials_from_coingecko(coin_info: Dict[str, Any]) -> Dict[str, Optional[str]]:
    socials: Dict[str, Optional[str]] = {"ws": None, "x": None, "tg": None}

    if not coin_info.get('data') or not coin_info['data']:
        return {k: "" for k, v in socials.items()}

    # Get base token ID from relationships
    base_token_id = coin_info['data'][0].get('relationships', {}).get(
        'base_token', {}).get('data', {}).get('id')

    if not base_token_id:
        return {k: "" for k, v in socials.items()}

    # TODO: You'll need to make another API call to get token details using base_token_id
    # For now, returning empty strings as per API requirement
    return {k: "" for k, v in socials.items()}


def get_market_cap(coin_info: Dict[str, Any]) -> str:
    if not coin_info.get('data'):
        return "0"

    attributes = coin_info['data'][0].get('attributes', {})
    # Use fdv_usd (Fully Diluted Valuation) as market cap
    market_cap = attributes.get('fdv_usd', '0')
    return str(market_cap)


def get_chain(notification_data: Dict[str, Any]) -> str:
    chain = notification_data.get('blockchain', 'solana')

    return chain


def treat_exchange(exchange: str) -> str:
    return exchange.lower().replace(' ', '-')


def treat_chain(chain: str) -> str:
    return chain.lower()


def treat_notification_data(notification_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize notification data to a consistent format"""
    normalized_data = {
        "alert_condition_id": notification_data.get("alert_condition_id"),
        "listing_type": notification_data.get("listing_type"),
        "type": notification_data.get("type"),
        "blockchain": notification_data.get("blockchain"),
    }

    # Handle currency information
    if isinstance(notification_data.get("currency"), dict):
        # New format with nested currency object
        currency_data = notification_data["currency"]
        normalized_data.update({
            "currency": currency_data.get("symbol"),
            "currency_name": currency_data.get("name"),
            "currency_address": currency_data.get("address")
        })
    else:
        # Old format with flat structure
        normalized_data.update({
            "currency": notification_data.get("currency"),
            "currency_name": notification_data.get("currency_name"),
            "currency_address": notification_data.get("currency_address")
        })

    # Handle exchange information
    if isinstance(notification_data.get("exchange"), dict):
        # New format with nested exchange object
        exchange_data = notification_data["exchange"]
        normalized_data.update({
            "exchange": exchange_data.get("name"),
            "trading_pair_url": exchange_data.get("trading_pair_url")
        })
    else:
        # Old format with flat structure
        normalized_data.update({
            "exchange": notification_data.get("exchange"),
            "trading_pair_url": notification_data.get("trading_pair_url")
        })

    # Handle message
    if not notification_data.get("message"):
        # Create message if not present
        normalized_data["message"] = f"{normalized_data['currency_name']} ({normalized_data['currency']}) has been listed on {normalized_data['exchange']}!"
    else:
        normalized_data["message"] = notification_data["message"]

    return normalized_data


async def handle_notification(notification_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Treat notification data
    treated_notification_data = treat_notification_data(notification_data)

    # Extract token address
    token_address = treated_notification_data.get('currency_address')

    dextools_address = get_information_from_dexscreener(token_address)
    print(f"Dextools address: {dextools_address}")

    token_address = dextools_address if dextools_address else token_address

    if not token_address:
        print("No token address found in notification")
        return

    try:
        chain = get_chain(treated_notification_data)
        # Get additional details from CoinGecko
        coin_info = get_coin_info(token_address, chain.lower())
        print(f"Coin info: {coin_info}")
        if not coin_info.get('data'):
            print(f"No data found for {token_address} on {chain}")
            return

        # Extract socials and market cap
        socials = extract_socials_from_coingecko(coin_info)
        market_cap = get_market_cap(coin_info)
        exchange = treat_notification_data.get('exchange', '')

        print(f"Socials: {socials}")
        print(f"Market cap: {market_cap}")
        print(f"Exchange: {exchange}")

        exchange = treat_exchange(exchange)
        chain = treat_chain(chain)

        # Create timestamp
        created_at = str(int(time.time()))

        repeated_notification_for_token_in_last_week = await check_for_repetition_by_token(
            token_address=token_address,
            days_ago=7
        )

        if repeated_notification_for_token_in_last_week:
            print(
                f"Notification for {token_address} already sent in the last 7 days")
            return None

        # Send order

        if get_environment() == "PRODUCTION":
            print('Sending order to production')
            # send_open_position_order_prod(
            #     chain=chain,
            #     token_address=token_address,
            #     trading_decision="buy",
            #     created_at=created_at,
            #     model="lx1",
            #     socials=socials,
            #     market_cap=market_cap,
            #     exchange=exchange
            # )
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

        print(f"Successfully processed notification for token {token_address}")

        return {**treated_notification_data, "currency_address": token_address}

    except Exception as e:
        print(f"Error processing notification: {str(e)}")
