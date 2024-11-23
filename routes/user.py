from fastapi import APIRouter
from dtos.user import UserUpdate, UserResponse
import controllers.user as user_controller
from docs.user import get_user_details_doc, update_user_doc

router = APIRouter()


@router.get("/users/{identifier}", **get_user_details_doc)
async def get_user_details(identifier: str) -> UserResponse:
    return await user_controller.get_user_details(identifier)


@router.put("/users/{identifier}", **update_user_doc)
async def update_user(identifier: str, user_data: UserUpdate) -> UserResponse:
    return await user_controller.update_user(identifier, user_data)
