import requests


def get_information_from_dexscreener(token_address):
    url = f"https://api.dexscreener.com/latest/dex/search?q={token_address}"
    print(f'trying to get information from dexscreener for {token_address}')
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        # print(data)
        if data and 'pairs' in data and len(data['pairs']) > 0:
            base_token_address = data['pairs'][0]['baseToken']['address']
            return base_token_address
        else:
            print(f"No pair found for the token provided: {token_address}")
            return None
    except requests.RequestException as e:
        print(f"Error fetching information from DexScreener: {e}")
        return None
