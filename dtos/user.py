from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from application_types.enums import TargetTypeEnum, OriginTypeEnum


class UserBase(BaseModel):
    target_type: TargetTypeEnum
    allowed_exchanges: List[str]
    origin: OriginTypeEnum


class UserCreate(UserBase):
    unique_identifier: str


class UserUpdate(BaseModel):
    allowed_exchanges: Optional[List[str]] = None
    target_type: Optional[TargetTypeEnum] = None
    origin: Optional[OriginTypeEnum] = None


class UserResponse(UserBase):
    id: UUID
    unique_identifier: str
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    items: List[UserResponse]
    next_page_token: Optional[str] = None
