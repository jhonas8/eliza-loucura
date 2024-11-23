from fastapi import HTTPException


async def http_method(callback):
    try:
        return await callback()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing request: {str(e)}")
