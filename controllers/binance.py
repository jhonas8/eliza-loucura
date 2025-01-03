from utils.http_method import http_method
import services.binance as binance_service


async def scan_binance_listings() -> dict:
    count = await http_method(
        lambda: binance_service.scan_binance_listings()
    )
    return {"processed_listings": count}
