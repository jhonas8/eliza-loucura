from typing import List, Dict, Any
from application_types.enums import FirebaseCollectionEnum
from clients.firebase.base_client import BaseFirebaseClient


class FirebaseExchangeClient(BaseFirebaseClient):
    def __init__(self):
        super().__init__()
        self.db = self.get_db_instance()
        self.collection = self.db.collection(
            FirebaseCollectionEnum.EXCHANGES.value)

    async def get_all_exchanges(self) -> List[Dict[str, Any]]:
        docs = self.collection.get()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]

    async def create_exchange(self, name: str, url: str, **details: dict) -> Dict[str, Any]:
        doc_ref = self.collection.document()
        exchange_data = {
            "name": name,
            "url": url,
            **details
        }
        doc_ref.set(exchange_data)
        return exchange_data | {"id": doc_ref.id}
