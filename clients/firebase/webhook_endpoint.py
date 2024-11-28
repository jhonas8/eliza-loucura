from typing import Dict, Any, Optional
from application_types.enums import FirebaseCollectionEnum
from clients.firebase.base_client import BaseFirebaseClient


class FirebaseWebhookEndpointClient(BaseFirebaseClient):
    def __init__(self):
        super().__init__()
        self.db = self.get_db_instance()
        self.collection = self.db.collection('xpaal-webhook-endpoints')

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
