# Dependencies
from fastapi import FastAPI

# Routes
import routes.webhook as webhook_route

# Middlewares
from middlewares.cors import cors_middleware

app = FastAPI()

# Add middlewares
cors, cors_config = cors_middleware(app)
app.add_middleware(cors, **cors_config)

# Include routes
app.include_router(webhook_route.router)
