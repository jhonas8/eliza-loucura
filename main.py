# Dependencies
from fastapi import FastAPI

# Routes
import routes.webhook as webhook_route

# Middlewares
from middlewares.cors import cors_middleware

app = FastAPI()

app.add_middleware(*cors_middleware(app))

app.include_router(webhook_route.router)
