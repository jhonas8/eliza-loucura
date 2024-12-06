import time

from typing import Dict, Any, Optional
from datetime import datetime
from clients.coingecko.get_coin_info import get_coin_info
from clients.auto_sniper.send_order import send_open_position_order_prod, send_open_position_order_stg
from clients.dextools.get_information_from_scanner import get_information_from_dexscreener
from utils.check_for_repetition_by_token import check_for_repetition_by_token


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


async def handle_notification(notification_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Extract token address
    token_address = notification_data.get('currency_address')

    dextools_address = get_information_from_dexscreener(token_address)
    print(f"Dextools address: {dextools_address}")

    token_address = dextools_address if dextools_address else token_address

    if not token_address:
        print("No token address found in notification")
        return

    try:
        chain = get_chain(notification_data)
        # Get additional details from CoinGecko
        coin_info = get_coin_info(token_address, chain.lower())
        print(f"Coin info: {coin_info}")
        if not coin_info.get('data'):
            print(f"No data found for {token_address} on {chain}")
            return

        # Extract socials and market cap
        socials = extract_socials_from_coingecko(coin_info)
        market_cap = get_market_cap(coin_info)
        exchange = notification_data.get('exchange', '')

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

        return {**notification_data, "currency_address": token_address}

    except Exception as e:
        print(f"Error processing notification: {str(e)}")
