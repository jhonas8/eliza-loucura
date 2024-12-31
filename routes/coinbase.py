from fastapi import APIRouter
import controllers.coinbase as coinbase_controller
from docs.coinbase import scan_coinbase_listings_doc

router = APIRouter()


@router.get("/coinbase/scan-listings", **scan_coinbase_listings_doc)
async def scan_coinbase_listings() -> dict:
    return await coinbase_controller.scan_coinbase_listings()
