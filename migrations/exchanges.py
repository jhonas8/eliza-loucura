from typing import List, Tuple
from clients.firebase.exchange import FirebaseExchangeClient

EXCHANGES_DATA: List[Tuple[str, str]] = [
    ("Coinbase", "https://www.coinbase.com/en-br/"),
    ("Kraken", "https://www.kraken.com/pt-br"),
    ("AscendEX", "https://ascendex.com/en"),
    ("Bitget", "https://www.bitget.com/pt/"),
    ("BitMEX", "https://www.bitmex.com/"),
    ("Bybit", "https://www.bybit.com/en/"),
    ("CoinEx", "https://www.coinex.com/pt"),
    ("Gemini", "https://www.gemini.com/"),
    ("Kraken Futures", "https://www.kraken.com/features/futures"),
    ("Okcoin", "https://www.okcoin.com/"),
    ("PancakeSwap", "https://pancakeswap.finance/"),
    ("Upbit", "https://upbit.com/home"),
    ("Binance", "https://www.binance.com/pt-BR"),
    ("Kucoin", "https://www.kucoin.com/pt"),
    ("Biconomy Exchange", "https://www.biconomy.com/en"),
    ("Bithumb", "https://www.bithumb.com/"),
    ("Bitrue", "https://www.bitrue.com/"),
    ("Bybit Futures", "https://www.bybit.com/derivatives/en/derivatives-home"),
    ("CoinSpot", "https://www.coinspot.com.au/"),
    ("HitBTC", "https://hitbtc.com"),
    ("LBank", "https://www.lbank.com/"),
    ("OKX", "https://www.okx.com/"),
    ("Phemex", "https://phemex.com"),
    ("Uphold", "https://uphold.com/"),
    ("Binance Futures", "https://www.binance.com/pt/futures"),
    ("Robinhood", "https://robinhood.com/"),
    ("Bitfinex", "https://www.bitfinex.com/"),
    ("Bitkub", "https://www.bitkub.com/"),
    ("Bitstamp", "https://www.bitstamp.net/"),
    ("Coincheck", "https://coincheck.com/"),
    ("Crypto.com Exchange", "https://crypto.com/exchange/otc"),
    ("Huobi", "https://www.htx.com/"),
    ("Mercatox", "https://mercatox.com/"),
    ("OKX Futures", "https://www.okx.com/trade-futures"),
    ("Poloniex", "https://poloniex.com/"),
    ("WazirX", "https://wazirx.com/"),
    ("Binance US", "https://www.binance.us/"),
    ("Uniswap", "https://app.uniswap.org/"),
    ("bitFlyer", "https://bitflyer.com/"),
    ("BitMart", "https://www.bitmart.com/"),
    ("Bitvavo", "https://bitvavo.com/en"),
    ("CoinDCX", "https://coindcx.com/"),
    ("Gate.io", "https://www.gate.io/"),
    ("Indodax", "https://indodax.com/"),
    ("MEXC", "https://www.mexc.com/"),
    ("P2B", "https://p2pb2b.com/"),
    ("SushiSwap", "https://www.sushi.com/swap"),
]


async def populate_exchanges():
    client = FirebaseExchangeClient()

    for name, url in EXCHANGES_DATA:
        await client.create_exchange(name, url)

    print(f"Successfully populated {len(EXCHANGES_DATA)} exchanges")
