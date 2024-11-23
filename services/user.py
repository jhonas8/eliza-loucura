from typing import Optional
from dtos.user import UserCreate, UserUpdate, UserResponse
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
