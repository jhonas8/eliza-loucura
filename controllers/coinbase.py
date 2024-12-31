from fastapi import HTTPException
from utils.http_method import http_method
import services.coinbase as coinbase_service


async def scan_coinbase_listings() -> dict:
    try:
        count = await coinbase_service.scan_coinbase_listings()
        return {"processed_listings": count}
    except Exception as e:
        print(f"Controller error in Coinbase scan: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error scanning Coinbase listings: {str(e)}"
        )
