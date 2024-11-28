import requests
from utils.get_env_var import get_env_var
from typing import Dict, Any


def get_coin_info(token_address: str, chain: str = 'solana') -> Dict[str, Any]:
    url = f"https://pro-api.coingecko.com/api/v3/onchain/networks/{chain}/tokens/{token_address}/pools"

    api_key = get_env_var('COINGECKO_API_KEY')

    headers = {
        "accept": "application/json",
        "x-cg-pro-api-key": api_key
    }

    response = requests.get(url, headers=headers)

    return response.json()
