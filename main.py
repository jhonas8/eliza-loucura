# Dependencies
from fastapi import FastAPI

# Routes
import routes.webhook as webhook_route
import routes.user as user_route
import routes.exchange as exchange_route
import routes.notification as notification_route
import routes.binance as binance_route
import routes.coinbase as coinbase_route

# Middlewares
from middlewares.cors import cors_middleware

app = FastAPI()

# Add middlewares
cors, cors_config = cors_middleware(app)
app.add_middleware(cors, **cors_config)

# Include routes
app.include_router(webhook_route.router)
app.include_router(user_route.router)
app.include_router(exchange_route.router)
app.include_router(notification_route.router)
app.include_router(binance_route.router)
app.include_router(coinbase_route.router)
