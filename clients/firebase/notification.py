from datetime import datetime
from typing import Dict, Any, List, Tuple
from application_types.enums import FirebaseCollectionEnum
from clients.firebase.base_client import BaseFirebaseClient


class FirebaseNotificationClient(BaseFirebaseClient):
    def __init__(self):
        super().__init__()
        self.db = self.get_db_instance()
        self.collection = self.db.collection(
            FirebaseCollectionEnum.NOTIFICATIONS.value)

    async def save_notification(self, data: Dict[str, Any]) -> Dict[str, Any]:
        doc_ref = self.collection.document()
        notification_data = {
            "data": data,
            'created_at': datetime.utcnow()
        }

        doc_ref.set(notification_data)
        return notification_data | {"id": doc_ref.id}

    async def get_notifications(self, page: int = 1, size: int = 10) -> Tuple[List[Dict[str, Any]], int]:
        # Get total count
        total = len(list(self.collection.get()))

        # Calculate offset
        offset = (page - 1) * size

        # Get paginated results ordered by created_at desc
        query = (self.collection
                 .order_by('created_at', direction='DESCENDING')
                 .offset(offset)
                 .limit(size))

        docs = query.get()

        notifications = [doc.to_dict() | {"id": doc.id} for doc in docs]

        return notifications, total
