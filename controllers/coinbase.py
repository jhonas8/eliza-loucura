from utils.http_method import http_method
import services.coinbase as coinbase_service


async def scan_coinbase_listings() -> dict:
    count = await http_method(
        lambda: coinbase_service.scan_coinbase_listings()
    )
    return {"processed_listings": count}
