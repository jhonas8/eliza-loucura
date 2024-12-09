from typing import Dict, Any, Optional, List
from application_types.enums.firebase import FirebaseCollectionEnum
from clients.firebase.base_client import BaseFirebaseClient


class FirebaseWebhookEndpointClient(BaseFirebaseClient):
    def __init__(self):
        super().__init__()
        self.db = self.get_db_instance()
        self.collection = self.db.collection(
            FirebaseCollectionEnum.WEBHOOK_ENDPOINTS)

    async def create_endpoint(self, url: str, description: str) -> Dict[str, Any]:
        # Check if URL already exists
        existing = self.collection.where('url', '==', url).limit(1).get()
        if len(list(existing)) > 0:
            raise ValueError("Webhook endpoint with this URL already exists")

        doc_ref = self.collection.document()
        endpoint_data = {
            "url": url,
            "description": description
        }
        doc_ref.set(endpoint_data)
        return endpoint_data | {"id": doc_ref.id}

    async def get_all_endpoints(self) -> List[Dict[str, Any]]:
        """Retrieve all registered webhook endpoints"""
        docs = self.collection.get()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
