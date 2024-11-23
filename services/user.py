from typing import Optional
from dtos.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from clients.firebase.user import FirebaseUserClient


async def get_user_details(identifier: str) -> Optional[UserResponse]:
    client = FirebaseUserClient()
    user = await client.get_user_by_identifier(identifier)
    if user:
        return UserResponse(**user)
    return None


async def update_user(identifier: str, user_data: UserUpdate) -> Optional[UserResponse]:
    client = FirebaseUserClient()
    updated_user = await client.update_or_create_user(identifier, user_data)
    if updated_user:
        return UserResponse(**updated_user)
    return None


async def get_users_by_exchange(exchange: str, page_token: Optional[str] = None) -> UserListResponse:
    client = FirebaseUserClient()
    users, next_token = await client.get_users_by_exchange(exchange, page_token)

    return UserListResponse(
        items=[UserResponse(**user) for user in users],
        next_page_token=next_token
    )
