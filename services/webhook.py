from fastapi import Request


async def cryptocurrencyalert_new_coin(request: Request):
    return {"message": "Webhook received"}
