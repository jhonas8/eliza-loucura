# Dependencies
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routes
import routes.webhook as webhook_route

app = FastAPI()

CORSMiddleware(
    app,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(webhook_route.router)
