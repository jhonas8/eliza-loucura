from fastapi import APIRouter
import controllers.binance as binance_controller
from docs.binance import scan_binance_listings_doc

router = APIRouter()


@router.get("/binance/scan-listings", **scan_binance_listings_doc)
async def scan_binance_listings() -> dict:
    return await binance_controller.scan_binance_listings()
