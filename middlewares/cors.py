from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from application_types.middlewares import Middleware

cors_middleware: Middleware = lambda app: (
    CORSMiddleware,
    {
        "allow_origins": ["*"],
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }
)
