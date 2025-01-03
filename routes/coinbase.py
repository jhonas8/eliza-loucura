from fastapi import APIRouter, HTTPException
import controllers.coinbase as coinbase_controller
from docs.coinbase import scan_coinbase_listings_doc

router = APIRouter()


@router.get("/coinbase/scan-listings", **scan_coinbase_listings_doc)
async def scan_coinbase_listings() -> dict:
    try:
        return await coinbase_controller.scan_coinbase_listings()
    except HTTPException as he:
        raise he  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error scanning Coinbase listings: {str(e)}"
        )
