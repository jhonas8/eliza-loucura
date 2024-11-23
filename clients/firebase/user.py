import uuid

from datetime import datetime
from typing import Optional, Dict, Any
from dtos.user import UserCreate, UserUpdate
from application_types.enums import FirebaseCollectionEnum
from clients.firebase.base_client import BaseFirebaseClient


class FirebaseUserClient(BaseFirebaseClient):
    def __init__(self):
        super().__init__()
        self.db = self.get_db_instance()
        self.collection = self.db.collection(
            FirebaseCollectionEnum.USERS.value)

    async def get_user_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        # Try to find by ID first
        try:
            uuid.UUID(identifier)
            doc = self.collection.document(identifier).get()
            if doc.exists:
                return doc.to_dict() | {"id": doc.id}
        except ValueError:
            # If not UUID, search by unique_identifier
            query = self.collection.where(
                'unique_identifier', '==', identifier).limit(1)
            docs = query.get()
            for doc in docs:
                return doc.to_dict() | {"id": doc.id}
        return None

    async def update_or_create_user(self, identifier: str, user_data: UserUpdate | UserCreate) -> Dict[str, Any]:
        existing_user = await self.get_user_by_identifier(identifier)
        current_time = datetime.utcnow()

        if existing_user:
            # Update existing user
            user_dict = user_data.dict(exclude_unset=True)
            user_dict['updated_at'] = current_time

            self.collection.document(existing_user['id']).update(user_dict)
            updated_user = await self.get_user_by_identifier(existing_user['id'])
            if not updated_user:
                raise ValueError("Failed to retrieve updated user")
            return updated_user
        else:
            # Create new user
            if not isinstance(user_data, UserCreate):
                raise ValueError("Cannot create user without required fields")

            new_user = {
                **user_data.dict(),
                'created_at': current_time,
                'updated_at': current_time,
                'id': str(uuid.uuid4())
            }

            self.collection.document(new_user['id']).set(new_user)
            return new_user
