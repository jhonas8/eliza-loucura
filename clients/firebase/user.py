import uuid
import base64
import json
from datetime import datetime
from typing import Optional, Dict, Any, Union, List, Tuple
from dtos.user import UserCreate, UserUpdate
from application_types.enums import FirebaseCollectionEnum
from clients.firebase.base_client import BaseFirebaseClient


class FirebaseUserClient(BaseFirebaseClient):
    def __init__(self):
        super().__init__()
        self.db = self.get_db_instance()
        self.collection = self.db.collection(
            FirebaseCollectionEnum.USERS.value)
        self.PAGE_SIZE = 10

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

    async def update_or_create_user(self, identifier: str, user_data: Union[UserUpdate, UserCreate]) -> Dict[str, Any]:
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

    async def get_users_by_exchange(self, exchange: str, page_token: Optional[str] = None) -> Tuple[List[Dict[str, Any]], Optional[str]]:
        # Build base query
        query = self.collection.where(
            'allowed_exchanges', 'array_contains', exchange)

        # If page token exists, decode and apply start_after
        if page_token:
            try:
                decoded = json.loads(base64.b64decode(
                    page_token).decode('utf-8'))
                last_doc = self.collection.document(decoded['last_id']).get()
                if last_doc.exists:
                    query = query.start_after(last_doc)
            except Exception as e:  # Handle any decoding/parsing error
                print(f"Error decoding page token: {e}")
                raise ValueError("Invalid page token")

        # Get one more item to determine if there are more pages
        docs = query.order_by('created_at').limit(self.PAGE_SIZE + 1).get()

        # Convert to list to handle pagination
        all_docs = list(docs)

        # Determine if there are more results
        has_more = len(all_docs) > self.PAGE_SIZE
        results = all_docs[:self.PAGE_SIZE]  # Remove the extra item

        # Generate next page token if there are more results
        next_token = None
        if has_more and results:
            last_doc = results[-1]
            token_data = {'last_id': last_doc.id}
            next_token = base64.b64encode(
                json.dumps(token_data).encode()).decode()

        # Format results
        users = [doc.to_dict() | {"id": doc.id} for doc in results]

        return users, next_token
