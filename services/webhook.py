from fastapi import Request


async def cryptocurrencyalert_new_coin(request: Request):
    print(await request.json())
    return {"message": "Webhook received"}
