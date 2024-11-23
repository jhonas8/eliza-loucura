from fastapi import HTTPException
from dtos.user import UserUpdate, UserResponse
import services.user as user_service
from utils.http_method import http_method


async def get_user_details(identifier: str) -> UserResponse:
    return await http_method(
        lambda: user_service.get_user_details(identifier)
    )


async def update_user(identifier: str, user_data: UserUpdate) -> UserResponse:
    return await http_method(
        lambda: user_service.update_user(identifier, user_data)
    )
