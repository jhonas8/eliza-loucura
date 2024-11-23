from firebase_admin import firestore
from clients.firebase.authenticase_firebase import authenticate_firebase


class BaseFirebaseClient:
    def __init__(self):
        authenticate_firebase()

    def get_db_instance(self):
        return firestore.client()
